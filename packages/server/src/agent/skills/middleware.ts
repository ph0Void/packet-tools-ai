import { createMiddleware, type AgentMiddleware } from "langchain";
import { SystemMessage } from "@langchain/core/messages";
import { buildSkillsCatalog, SKILLS_SECTION_HEADER } from "./loader";

export { SKILLS_SECTION_HEADER };

export function buildSkillsSection(catalogo: string): string {
  if (!catalogo) return "";
  return [

    "\n\n" + catalogo,
    "",
    "How to use them (progressive disclosure): the list above gives ONLY slug and description; the procedure itself is NOT loaded yet. When a request matches one, call 'read_skill' with its slug BEFORE acting, then follow the procedure it returns. Never guess a skill's content, and never repeat information already in the conversation.",
  ].join("\n");
}

export function skillsPromptMiddleware(): AgentMiddleware {
  return createMiddleware({
    name: "SkillsMiddleware",
    wrapModelCall: async (request, handler) => {
      const catalogo = await buildSkillsCatalog();
      const seccion = buildSkillsSection(catalogo);
      if (!seccion) return handler(request);
      const sistema: SystemMessage =
        request.systemMessage instanceof SystemMessage
          ? request.systemMessage
          : new SystemMessage(String(request.systemMessage ?? ""));
      return handler({
        ...request,
        systemMessage: sistema.concat(seccion),
      });
    },
  });
}
