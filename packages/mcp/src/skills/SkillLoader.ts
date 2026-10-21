import fs from "node:fs/promises";
import path from "node:path";
import { envConfig } from "@/config/EnvConfig";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { Logger } from "@/utils/Logger";

export interface Skill {
  slug: string;
  title: string;
  description: string | null;
  content: string;
  source: "file" | "database";
  filePath?: string;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "skill"
  );
}

function parseFrontmatter(content: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    meta[pair[1].toLowerCase()] = pair[2].trim().replace(/^["']|["']$/g, "");
  }

  return { meta, body: content.slice(match[0].length) };
}

function titleFromBody(body: string, slug: string): string {
  const heading = /^#\s+(.+)$/m.exec(body);
  return heading ? heading[1].trim() : slug;
}

export async function loadSkillsFromDisk(): Promise<Skill[]> {
  const folder = envConfig.MCP_SKILLS_DIR;
  let files: string[];

  try {
    files = await fs.readdir(folder);
  } catch {
    return [];
  }

  const skills: Skill[] = [];

  for (const name of files) {
    if (!/\.(md|markdown|txt)$/i.test(name)) continue;

    const filePath = path.join(folder, name);
    try {
      const content = await fs.readFile(filePath, "utf8");
      const { meta, body } = parseFrontmatter(content);
      const slug = meta.slug?.trim() || slugify(name.replace(/\.(md|markdown|txt)$/i, ""));

      skills.push({
        slug,
        title: meta.title?.trim() || titleFromBody(body, slug),
        description: meta.description?.trim() || null,
        content: body.trim(),
        source: "file",
        filePath,
      });
    } catch (error) {
      Logger.warning(`Could not read skill '${name}': ${String(error)}`);
    }
  }

  return skills;
}

export async function loadSkillsFromDatabase(): Promise<Skill[]> {
  try {
    const rows = await prismaClient.skillMcp.findMany({
      where: { enabled: true },
      orderBy: { slug: "asc" },
    });
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      description: row.description,
      content: row.content,
      source: "database" as const,
    }));
  } catch (error) {
    Logger.debug(`Could not read skills from the database: ${String(error)}`);
    return [];
  }
}

export async function loadAllSkills(): Promise<Skill[]> {
  const [fromDisk, fromDatabase] = await Promise.all([
    loadSkillsFromDisk(),
    loadSkillsFromDatabase(),
  ]);

  const bySlug = new Map<string, Skill>();
  for (const skill of fromDisk) bySlug.set(skill.slug, skill);
  for (const skill of fromDatabase) bySlug.set(skill.slug, skill);

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function findSkill(reference: string): Promise<Skill | null> {
  const query = reference.trim().toLowerCase();
  const skills = await loadAllSkills();

  return (
    skills.find((skill) => skill.slug.toLowerCase() === query) ??
    skills.find((skill) => skill.title.toLowerCase() === query) ??
    null
  );
}

export async function ensureSkillsFolder(): Promise<string> {
  await fs.mkdir(envConfig.MCP_SKILLS_DIR, { recursive: true });
  return envConfig.MCP_SKILLS_DIR;
}
