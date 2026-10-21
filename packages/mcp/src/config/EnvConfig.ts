import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import dotenv from "dotenv";


function loadRootEnv(): void {
  const candidates: string[] = [];
  let current = __dirname;
  for (let i = 0; i < 8; i++) {
    candidates.push(path.join(current, ".env"));
    current = path.dirname(current);
  }
  candidates.push(path.resolve(process.cwd(), ".env"));

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    dotenv.config({ path: candidate, override: false, quiet: true });
    return;
  }
}

loadRootEnv();


function resolvePackageRoot(): string {
  let current = path.resolve(__dirname, "..", "..");
  for (let i = 0; i < 3; i++) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    current = path.dirname(current);
  }
  return path.resolve(__dirname, "..", "..");
}

export const PACKAGE_ROOT = resolvePackageRoot();


function resolveDataDir(): string {
  const explicitValue = (process.env.MCP_DATA_DIR ?? "").trim();
  if (explicitValue) return path.resolve(explicitValue);

  const isInNodeModules = PACKAGE_ROOT.includes(`${path.sep}node_modules${path.sep}`);
  if (!isInNodeModules) return PACKAGE_ROOT;

  return path.join(os.homedir(), ".packet-tools", "mcp");
}

export const DATA_DIR = resolveDataDir();


function envNumber(name: string, defaultValue: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultValue;
}


function envBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw !== "false";
}


function envPath(name: string, defaultValue: string): string {
  const raw = (process.env[name] ?? "").trim() || defaultValue;
  return path.isAbsolute(raw) ? raw : path.join(DATA_DIR, raw);
}


export type McpTransport = "stdio" | "http" | "both";


const configWarnings: string[] = [];


function resolveTransport(): McpTransport {
  const raw = (process.env.MCP_TRANSPORT ?? "").trim().toLowerCase();
  if (raw === "" || raw === "stdio") return "stdio";
  if (raw === "http" || raw === "both") return raw;
  configWarnings.push(
    `Invalid MCP_TRANSPORT value '${raw}': expected one of stdio, http, both. Falling back to stdio.`,
  );
  return "stdio";
}


export function consumeConfigWarnings(): string[] {
  return configWarnings.splice(0);
}


export const envConfig = {
  SERVER_PORT: envNumber("SERVER_PORT", 7531),

  MCP_TRANSPORT: resolveTransport(),

  MCP_HTTP_HOST: (process.env.MCP_HTTP_HOST ?? "127.0.0.1").trim() || "127.0.0.1",

  MCP_HTTP_PORT: envNumber("MCP_HTTP_PORT", 7533),

  MCP_HTTP_TOKEN: (process.env.MCP_HTTP_TOKEN ?? "").trim(),

  MCP_HTTP_CORS_ORIGIN: (process.env.MCP_HTTP_CORS_ORIGIN ?? "*").trim() || "*",

  MCP_BRIDGE_HOST: (process.env.MCP_BRIDGE_HOST ?? "127.0.0.1").trim() || "127.0.0.1",

  MCP_BRIDGE_PORT: envNumber("MCP_BRIDGE_PORT", 7532),

  MCP_BRIDGE_ENABLED: envBoolean("MCP_BRIDGE_ENABLED", true),

  MCP_PACKET_TRACER_HOST: (process.env.MCP_PACKET_TRACER_HOST ?? "localhost").trim(),

  PT_EXTENSION_SECRET: (process.env.PT_EXTENSION_SECRET ?? "").trim(),

  MCP_GNS3_URL: (process.env.MCP_GNS3_URL ?? "").trim(),

  MCP_TOOL_TIMEOUT_MS: envNumber("MCP_TOOL_TIMEOUT_MS", 120_000),
  MCP_TERMINAL_MAX_MS: envNumber("MCP_TERMINAL_MAX_MS", 20_000),
  MCP_TERMINAL_IDLE_MS: envNumber("MCP_TERMINAL_IDLE_MS", 700),
  MCP_MAX_OUTPUT_CHARS: envNumber("MCP_MAX_OUTPUT_CHARS", 20_000),

  MCP_PLANS_DIR: envPath("MCP_PLANS_DIR", "plans"),
  MCP_SKILLS_DIR: envPath("MCP_SKILLS_DIR", "skills"),

  MCP_DEBUG: envBoolean("MCP_DEBUG", false),
  MCP_TRACE_TOOLS: envBoolean("MCP_TRACE_TOOLS", false),
} as const;

export type EnvConfig = typeof envConfig;
