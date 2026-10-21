import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadAllSkills } from "./SkillLoader";
import { Logger } from "@/utils/Logger";

const SCHEME = "skill://";

function slugFromUri(uri: string): string | null {
  if (!uri.startsWith(SCHEME)) return null;
  const slug = uri.slice(SCHEME.length).trim();
  return slug.length > 0 ? slug : null;
}

export function registerSkillsAsResources(server: McpServer): void {
  server.registerResource(
    "skills",
    SCHEME,
    {
      title: "User skills",
      description:
        "Instructions written by the user themselves (naming conventions, policies, procedures) that the model must follow.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const slug = slugFromUri(uri.toString());
      if (!slug) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "text/plain",
              text: `Unrecognized URI. The format is ${SCHEME}<slug>.`,
            },
          ],
        };
      }

      const skills = await loadAllSkills();
      const skill = skills.find((s) => s.slug === slug);

      if (!skill) {
        const availableSlugs = skills.map((s) => s.slug).join(", ") || "(none)";
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "text/plain",
              text: `No skill exists with the slug '${slug}'. Available skills: ${availableSlugs}.`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: `# ${skill.title}\n\n${skill.content}`,
          },
        ],
      };
    },
  );

  Logger.debug("Skills registered as MCP resources (skill://<slug>).");
}
