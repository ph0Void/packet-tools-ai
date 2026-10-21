#!/usr/bin/env node

import {
  configureAgent,
  listAgents,
  resultDetail,
  resultIcon,
  SERVER_COMMAND,
} from "../bin/lib/agents.mjs";
import { loadLang, t } from "../bin/lib/i18n.mjs";

loadLang();

console.log(`${t("installMcp.title")}\n`);
console.log(`${t("installMcp.server", { command: SERVER_COMMAND })}\n`);

let installed = 0;
for (const agent of listAgents()) {
  if (!agent.detected) {
    console.log(`  · ${agent.name}: ${t("installMcp.notDetected", { dir: agent.dir })}`);
    continue;
  }
  const result = configureAgent(agent);
  console.log(`  ${resultIcon(result.status)} ${agent.name}: ${resultDetail(result)} — ${agent.file}`);
  if (result.status === "installed") installed++;
}

console.log(
  [
    "",
    t("installMcp.done", { count: installed }),
    t("installMcp.restart"),
    t("installMcp.manual"),
    `  ${SERVER_COMMAND}`,
    "",
    t("installMcp.pt"),
  ].join("\n"),
);
