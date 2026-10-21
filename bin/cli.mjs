#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { APP_PACKAGE, DOCS_URL, MCP_NPX_ARGS, RELEASES_URL, ROOT_PACKAGE } from "./config.mjs";
import { configureAgent, listAgents, resultDetail, resultIcon } from "./lib/agents.mjs";
import { getLang, isLang, loadLang, saveLang, setLang, t } from "./lib/i18n.mjs";
import { openUrl } from "./lib/open.mjs";
import { askChoice, askMultiSelect, closePrompts } from "./lib/prompt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");
const MCP_COMMAND_LINE = `npx ${MCP_NPX_ARGS.join(" ")}`;
const APP_COMMAND_LINE = `npx -y --package=${APP_PACKAGE} packet-tools-ai-app`;
const LANGUAGE_QUESTION = "Selecciona idioma / Select language:";

const SIGNAL_CODES = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };

function readVersion() {
  try {
    const raw = readFileSync(path.join(packageRoot, "package.json"), "utf8");
    return JSON.parse(raw).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function helpText() {
  return [
    t("help.title"),
    "",
    t("help.usage"),
    `  packet-tools-ai                ${t("help.menu")}`,
    `  npx -y --package=${ROOT_PACKAGE} packet-tools-ai   ${t("help.noGlobal")}`,
    `  packet-tools-ai --web          ${t("help.web")}`,
    `  packet-tools-ai --mcp          ${t("help.mcp")}`,
    `  packet-tools-ai --desktop      ${t("help.desktop")}`,
    `  packet-tools-ai --mcp-server   ${t("help.mcpServer")}`,
    `  packet-tools-ai --lang es|en   ${t("help.lang")}`,
    `  packet-tools-ai --help         ${t("help.help")}`,
    `  packet-tools-ai --version      ${t("help.version")}`,
    "",
    t("help.langNote", { lang: getLang() }),
    `MCP: ${MCP_COMMAND_LINE}`,
    `Web: ${APP_PACKAGE}`,
    t("help.docs", { url: DOCS_URL }),
  ].join("\n");
}

function spawnInherit(command, args, { shell = false } = {}) {
  return new Promise((resolve) => {
    let child;
    const cleanup = () => {
      process.removeListener("SIGINT", onSigint);
      process.removeListener("SIGTERM", onSigterm);
    };
    const onSigint = () => {
      try {
        child.kill("SIGINT");
      } catch {}
    };
    const onSigterm = () => {
      try {
        child.kill("SIGTERM");
      } catch {}
    };
    try {
      child = spawn(command, args, { stdio: "inherit", cwd: process.cwd(), shell });
    } catch {
      resolve({ code: 1 });
      return;
    }
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);
    child.on("error", () => {
      cleanup();
      resolve({ code: 1 });
    });
    child.on("exit", (code, signal) => {
      cleanup();
      resolve({ code: code ?? SIGNAL_CODES[signal] ?? 1, signal });
    });
  });
}

async function flowWeb() {
  console.log("");
  const custom = process.env.PACKET_TOOLS_APP_LAUNCHER;
  if (custom) {
    if (existsSync(custom)) {
      console.log(t("web.starting"));
      const { code } = await spawnInherit(process.execPath, [custom]);
      return code;
    }
    console.log(t("web.launcher.missing", { path: custom }));
  }
  let installedLauncher = null;
  try {
    const require = createRequire(import.meta.url);
    const appPackageJson = require.resolve(`${APP_PACKAGE}/package.json`);
    const candidate = path.join(path.dirname(appPackageJson), "bin", "launch.mjs");
    if (existsSync(candidate)) installedLauncher = candidate;
  } catch {}
  if (installedLauncher) {
    console.log(t("web.starting"));
    const { code } = await spawnInherit(process.execPath, [installedLauncher]);
    return code;
  }
  console.log(t("web.npx", { package: APP_PACKAGE }));
  const { code } = await spawnInherit(
    "npx",
    ["-y", `--package=${APP_PACKAGE}`, "packet-tools-ai-app"],
    { shell: process.platform === "win32" },
  );
  if (code !== 0) {
    console.log(t("web.notPublished", { command: APP_COMMAND_LINE }));
    return 1;
  }
  return 0;
}

async function flowMcp() {
  const agents = listAgents();
  console.log("");
  const options = agents.map((agent) => ({
    value: agent.id,
    label: agent.detected ? `${agent.name}${t("mcp.detected")}` : agent.name,
  }));
  const picked = await askMultiSelect(t("mcp.question"), options);
  if (picked === null) {
    console.log(t("menu.cancelled"));
    return 0;
  }
  console.log("");
  const configured = [];
  for (const agent of agents.filter((item) => picked.includes(item.id))) {
    const result = configureAgent(agent);
    console.log(`  ${resultIcon(result.status)} ${agent.name}: ${resultDetail(result)} — ${agent.file}`);
    if (result.status !== "skipped") configured.push(agent);
  }
  if (configured.length === 0) {
    console.log("");
    console.log(t("mcp.none"));
    console.log(t("mcp.manual"));
    console.log(`  ${MCP_COMMAND_LINE}`);
    return 0;
  }
  const names = configured.map((agent) => agent.name).join(", ");
  console.log("");
  console.log(t("mcp.done", { count: configured.length, names }));
  return 0;
}

async function flowDesktop() {
  console.log("");
  console.log(t("desktop.download"));
  console.log(RELEASES_URL);
  openUrl(RELEASES_URL);
  if (process.platform === "win32") {
    console.log(t("desktop.windows"));
  } else {
    console.log(t("desktop.other", { platform: process.platform }));
  }
  return 0;
}

function flowMcpServer() {
  return spawnInherit(process.execPath, [path.join(here, "packet-tools-mcp.mjs")]);
}

export async function runMenu() {
  const lang = await askChoice(
    LANGUAGE_QUESTION,
    [
      { value: "es", label: "Español" },
      { value: "en", label: "English" },
    ],
    { defaultValue: getLang() },
  );
  if (lang === null) {
    console.log(t("menu.cancelled"));
    return 0;
  }
  setLang(lang);
  saveLang(lang);
  console.log("");
  console.log(t("menu.title", { version: readVersion() }));
  const choice = await askChoice(
    t("menu.question"),
    [
      {
        value: "web",
        label: t("menu.web.label"),
        hint: t("menu.web.hint"),
      },
      {
        value: "mcp",
        label: t("menu.mcp.label"),
        hint: t("menu.mcp.hint"),
      },
      {
        value: "desktop",
        label: t("menu.desktop.label"),
        hint: t("menu.desktop.hint"),
      },
      { value: "exit", label: t("menu.exit.label") },
    ],
    { defaultValue: "exit" },
  );
  if (choice === null) {
    console.log(t("menu.cancelled"));
    return 0;
  }
  if (choice === "web") return flowWeb();
  if (choice === "mcp") return flowMcp();
  if (choice === "desktop") return flowDesktop();
  console.log(t("menu.goodbye"));
  return 0;
}

async function main() {
  let args = process.argv.slice(2);
  loadLang();
  const langIndex = args.indexOf("--lang");
  if (langIndex !== -1) {
    const value = String(args[langIndex + 1] ?? "").trim().toLowerCase();
    if (!isLang(value)) {
      console.error(t("flag.unknown", { args: args.join(" ") }));
      console.log(helpText());
      return 1;
    }
    setLang(value);
    args = [...args.slice(0, langIndex), ...args.slice(langIndex + 2)];
  }
  if (args.length === 0) return runMenu();
  if (args.includes("--help") || args.includes("-h")) {
    console.log(helpText());
    return 0;
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(readVersion());
    return 0;
  }
  if (args.includes("--web")) return flowWeb();
  if (args.includes("--mcp") || args.includes("--install-mcp")) return flowMcp();
  if (args.includes("--desktop")) return flowDesktop();
  if (args.includes("--mcp-server")) return flowMcpServer();
  console.error(t("flag.unknown", { args: args.join(" ") }));
  console.log(helpText());
  return 1;
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    if (path.resolve(entry) === path.resolve(self)) return true;
    const a = realpathSync(entry);
    const b = realpathSync(self);
    return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main()
    .then((code) => {
      const resolved = typeof code === "object" && code !== null ? code.code : code;
      process.exitCode = Number.isInteger(resolved) ? resolved : 0;
    })
    .catch((error) => {
      console.error(error?.message ?? String(error));
      process.exitCode = 1;
    })
    .finally(() => {
      closePrompts();
    });
}
