
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { DomainModule, AnyToolDefinition } from "@/core/ToolRegistry";
import { defineTool } from "@/core/ToolRegistry";
import {
  ensureSkillsFolder,
  findSkill,
  loadAllSkills,
  slugify,
} from "@/skills/SkillLoader";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { envConfig } from "@/config/EnvConfig";
import { Logger } from "@/utils/Logger";
import { validationError, McpToolError } from "@/core/errors";

const tools: AnyToolDefinition[] = [
  defineTool({
    name: "skills_list",
    description:
      "Lists the user's skills (their own instructions: naming conventions, security policies, procedures). " +
      "Use it when starting a task to know whether the user has already defined rules you must respect, or when the user types '@skill'.",
    inputSchema: {
      includeContent: z
        .boolean()
        .optional()
        .describe(
          "true to also return the full content of each skill (useful if there are few and they are short)",
        ),
    },
    handler: async ({ includeContent }) => {
      const skills = await loadAllSkills();

      if (skills.length === 0) {
        const folder = await ensureSkillsFolder();
        return {
          success: true,
          total: 0,
          skills: [],
          message:
            `There is no skill yet. The user can create one by dropping a markdown file into '${folder}' ` +
            `or asking you to create it with skills_create.`,
        };
      }

      return {
        success: true,
        total: skills.length,
        folder: envConfig.MCP_SKILLS_DIR,
        skills: skills.map((skill) => ({
          slug: skill.slug,
          title: skill.title,
          description: skill.description,
          source: skill.source,
          characters: skill.content.length,
          ...(includeContent ? { content: skill.content } : {}),
        })),
        message:
          "Use skills_read with the 'slug' of a skill to read its full instructions before acting in its domain.",
      };
    },
  }),

  defineTool({
    name: "skills_read",
    description:
      "Reads the full content of a skill by its slug. Use it when the user types '@skill:<slug>' " +
      "or when skills_list shows you a skill relevant to the task: its instructions take priority over your assumptions.",
    inputSchema: {
      slug: z.string().describe("Skill identifier (the 'slug' field from skills_list)"),
    },
    handler: async ({ slug }) => {
      const skill = await findSkill(slug);
      if (!skill) {
        const all = await loadAllSkills();
        throw new McpToolError(
          "NOT_FOUND",
          `No skill exists with the slug '${slug}'.`,
          {
            suggestion:
              all.length > 0
                ? `The available skills are: ${all.map((s) => s.slug).join(", ")}.`
                : "There are no skills yet. You can create one with skills_create.",
          },
        );
      }

      return {
        success: true,
        slug: skill.slug,
        title: skill.title,
        description: skill.description,
        source: skill.source,
        content: skill.content,
      };
    },
  }),

  defineTool({
    name: "skills_create",
    description:
      "Creates a new skill (or updates an existing one with the same slug) to store user instructions persistently. " +
      "Use it when the user says things like 'save this as a rule', 'from now on use this naming convention' or explicitly asks to create a skill. " +
      "The content is free markdown: write clear, actionable instructions, not a vague description.",
    inputSchema: {
      title: z
        .string()
        .describe(
          "Short skill title, for example 'Device naming convention'",
        ),
      content: z
        .string()
        .min(1)
        .describe(
          "Instructions in markdown. Be specific: what to do, in what format and in which cases.",
        ),
      description: z
        .string()
        .optional()
        .describe("One-line summary of when this skill applies"),
      slug: z
        .string()
        .optional()
        .describe("kebab-case identifier; if omitted it is derived from the title"),
    },
    handler: async ({ title, content, description, slug }) => {
      const finalSlug = slug?.trim() ? slugify(slug) : slugify(title);

      const skill = await prismaClient.skillMcp.upsert({
        where: { slug: finalSlug },
        create: {
          slug: finalSlug,
          title,
          description: description ?? null,
          content,
          source: "agent",
          enabled: true,
        },
        update: {
          title,
          description: description ?? null,
          content,
          enabled: true,
        },
      });

      Logger.info(`Skill '${finalSlug}' saved.`);

      return {
        success: true,
        slug: skill.slug,
        title: skill.title,
        message:
          `Skill '${skill.slug}' saved and available right away (no need to restart the server). ` +
          `The user can invoke it by typing '@skill:${skill.slug}'.`,
      };
    },
  }),

  defineTool({
    name: "skills_delete",
    description:
      "Deletes a skill. If the skill lives in a disk file, the file is deleted; if the agent created it, it is deleted from the database. " +
      "Irreversible operation: confirm it with the user unless they asked for it.",
    inputSchema: {
      slug: z.string().describe("Identifier of the skill to delete"),
    },
    handler: async ({ slug }) => {
      const skill = await findSkill(slug);
      if (!skill) {
        throw new McpToolError(
          "NOT_FOUND",
          `No skill exists with the slug '${slug}'.`,
          { suggestion: "Use skills_list to see the available slugs." },
        );
      }

      const deleted: string[] = [];

      if (skill.source === "file" && skill.filePath) {
        const root = path.resolve(envConfig.MCP_SKILLS_DIR);
        const resolved = path.resolve(skill.filePath);
        if (resolved.startsWith(root + path.sep)) {
          await fs.unlink(resolved);
          deleted.push("file");
        } else {
          throw validationError(
            `The skill '${slug}' points to a file outside the skills folder and will not be deleted.`,
            "Check the MCP_SKILLS_DIR configuration.",
          );
        }
      }

      const result = await prismaClient.skillMcp.deleteMany({
        where: { slug: skill.slug },
      });
      if (result.count > 0) deleted.push("database");

      return {
        success: true,
        slug: skill.slug,
        deleted,
        message:
          deleted.length > 0
            ? `Skill '${skill.slug}' deleted (${deleted.join(" and ")}).`
            : `Could not delete '${skill.slug}': neither the file nor the row was found.`,
      };
    },
  }),

  defineTool({
    name: "skills_directory",
    description:
      "Returns the folder where the user can put their skill files in markdown. " +
      "Use it when the user asks where to save their instructions.",
    inputSchema: {},
    handler: async () => {
      const folder = await ensureSkillsFolder();
      return {
        success: true,
        folder,
        format: {
          fileName: "any-name.md",
          optionalFrontmatter: [
            "---",
            "title: Naming convention",
            "description: How to name the network devices",
            "slug: naming-convention",
            "---",
          ].join("\n"),
          note:
            "The frontmatter is optional: without it, the title is taken from the first '# ' heading and the slug from the file name. " +
            "Changes are read on every call, so there is no need to restart the MCP server.",
        },
        message: `Put your .md files into '${folder}' and they will appear automatically in skills_list.`,
      };
    },
  }),
];

export const skillsModule: DomainModule = {
  id: "skills",
  prefix: "skills_",
  description:
    "User skills: their own instructions in markdown (conventions, policies, procedures) that the model must respect.",
  tools,
};
