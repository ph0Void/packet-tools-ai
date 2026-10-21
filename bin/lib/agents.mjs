import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { MCP_NPX_ARGS } from "../config.mjs";
import { t } from "./i18n.mjs";
import { appDataDir, homeDir } from "./paths.mjs";

const SERVER_NAME = "packet-tools";
const COMMAND = "npx";

const JSON_SERVERS = "mcpServers";
const JSON_OPENCODE = "mcp";
const JSON_VSCODE = "servers";
const TOML_SHAPE = "toml";

function claudeDesktopDir() {
  if (process.platform === "win32") return path.join(appDataDir(), "Claude");
  if (process.platform === "darwin") {
    return path.join(homeDir(), "Library", "Application Support", "Claude");
  }
  return path.join(homeDir(), ".config", "Claude");
}

const AGENT_DEFS = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    shape: JSON_SERVERS,
    file: "claude_desktop_config.json",
    dir: () => claudeDesktopDir(),
  },
  {
    id: "claude-code",
    name: "Claude Code",
    shape: JSON_SERVERS,
    file: ".mcp.json",
    dir: () => process.cwd(),
  },
  {
    id: "cursor",
    name: "Cursor",
    shape: JSON_SERVERS,
    file: "mcp.json",
    dir: () => path.join(homeDir(), ".cursor"),
  },
  {
    id: "windsurf",
    name: "Windsurf",
    shape: JSON_SERVERS,
    file: "mcp_config.json",
    dir: () => path.join(homeDir(), ".codeium", "windsurf"),
  },
  {
    id: "lm-studio",
    name: "LM Studio",
    shape: JSON_SERVERS,
    file: "mcp.json",
    dir: () => path.join(homeDir(), ".lmstudio"),
  },
  {
    id: "opencode",
    name: "OpenCode",
    shape: JSON_OPENCODE,
    file: "opencode.json",
    dir: () => path.join(homeDir(), ".config", "opencode"),
  },
  {
    id: "vscode",
    name: ".vscode (workspace)",
    shape: JSON_VSCODE,
    file: "mcp.json",
    dir: () => path.join(process.cwd(), ".vscode"),
  },
  {
    id: "codex",
    name: "Codex CLI",
    shape: TOML_SHAPE,
    file: "config.toml",
    dir: () => path.join(homeDir(), ".codex"),
  },
];

export const SERVER_COMMAND = `${COMMAND} ${MCP_NPX_ARGS.join(" ")}`;

export function listAgents() {
  return AGENT_DEFS.map((def) => {
    const dir = def.dir();
    return {
      id: def.id,
      name: def.name,
      shape: def.shape,
      dir,
      file: path.join(dir, def.file),
      detected: existsSync(dir),
    };
  });
}

function entryFor(shape) {
  if (shape === JSON_OPENCODE) {
    return { type: "local", command: [COMMAND, ...MCP_NPX_ARGS], enabled: true };
  }
  if (shape === JSON_VSCODE) {
    return { type: "stdio", command: COMMAND, args: MCP_NPX_ARGS };
  }
  return { command: COMMAND, args: MCP_NPX_ARGS };
}

function readJson(file) {
  if (!existsSync(file)) return {};
  try {
    const raw = readFileSync(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return { __invalid: true };
  }
}

function configureJson(agent) {
  const json = readJson(agent.file);
  if (json.__invalid) {
    return { name: agent.name, file: agent.file, status: "skipped", reason: t("mcp.json.invalid") };
  }
  if (!json[agent.shape] || typeof json[agent.shape] !== "object") json[agent.shape] = {};
  if (json[agent.shape][SERVER_NAME]) {
    return { name: agent.name, file: agent.file, status: "already" };
  }
  json[agent.shape][SERVER_NAME] = entryFor(agent.shape);
  try {
    mkdirSync(agent.dir, { recursive: true });
    writeFileSync(agent.file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  } catch (error) {
    return { name: agent.name, file: agent.file, status: "skipped", reason: error.message };
  }
  return { name: agent.name, file: agent.file, status: "installed" };
}

function codexBlock() {
  const args = MCP_NPX_ARGS.map((arg) => JSON.stringify(arg)).join(", ");
  return [`[mcp_servers.${SERVER_NAME}]`, `command = "${COMMAND}"`, `args = [${args}]`].join("\n");
}

function configureCodex(agent) {
  let current = "";
  if (existsSync(agent.file)) {
    try {
      current = readFileSync(agent.file, "utf8");
    } catch (error) {
      return { name: agent.name, file: agent.file, status: "skipped", reason: error.message };
    }
    const pattern = new RegExp(`^\\s*\\[mcp_servers\\.${SERVER_NAME}\\]`, "m");
    if (pattern.test(current)) {
      return { name: agent.name, file: agent.file, status: "already" };
    }
  }
  const separator = current.length === 0 ? "" : current.endsWith("\n") ? "\n" : "\n\n";
  try {
    mkdirSync(agent.dir, { recursive: true });
    writeFileSync(agent.file, `${current}${separator}${codexBlock()}\n`, "utf8");
  } catch (error) {
    return { name: agent.name, file: agent.file, status: "skipped", reason: error.message };
  }
  return { name: agent.name, file: agent.file, status: "installed" };
}

export function configureAgent(agent) {
  return agent.shape === TOML_SHAPE ? configureCodex(agent) : configureJson(agent);
}

export function resultIcon(status) {
  return status === "installed" ? "✓" : status === "already" ? "=" : "✗";
}

export function resultDetail(result) {
  if (result.status === "installed") return t("mcp.status.installed");
  if (result.status === "already") return t("mcp.status.already");
  return t("mcp.status.skipped", { reason: result.reason });
}
