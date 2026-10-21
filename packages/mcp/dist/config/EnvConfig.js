"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = exports.DATA_DIR = exports.PACKAGE_ROOT = void 0;
exports.consumeConfigWarnings = consumeConfigWarnings;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const dotenv_1 = __importDefault(require("dotenv"));
function loadRootEnv() {
    const candidates = [];
    let current = __dirname;
    for (let i = 0; i < 8; i++) {
        candidates.push(node_path_1.default.join(current, ".env"));
        current = node_path_1.default.dirname(current);
    }
    candidates.push(node_path_1.default.resolve(process.cwd(), ".env"));
    for (const candidate of candidates) {
        if (!node_fs_1.default.existsSync(candidate))
            continue;
        dotenv_1.default.config({ path: candidate, override: false, quiet: true });
        return;
    }
}
loadRootEnv();
function resolvePackageRoot() {
    let current = node_path_1.default.resolve(__dirname, "..", "..");
    for (let i = 0; i < 3; i++) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(current, "package.json")))
            return current;
        current = node_path_1.default.dirname(current);
    }
    return node_path_1.default.resolve(__dirname, "..", "..");
}
exports.PACKAGE_ROOT = resolvePackageRoot();
function resolveDataDir() {
    const explicitValue = (process.env.MCP_DATA_DIR ?? "").trim();
    if (explicitValue)
        return node_path_1.default.resolve(explicitValue);
    const isInNodeModules = exports.PACKAGE_ROOT.includes(`${node_path_1.default.sep}node_modules${node_path_1.default.sep}`);
    if (!isInNodeModules)
        return exports.PACKAGE_ROOT;
    return node_path_1.default.join(node_os_1.default.homedir(), ".packet-tools", "mcp");
}
exports.DATA_DIR = resolveDataDir();
function envNumber(name, defaultValue) {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : defaultValue;
}
function envBoolean(name, defaultValue) {
    const raw = process.env[name];
    if (raw === undefined || raw === "")
        return defaultValue;
    return raw !== "false";
}
function envPath(name, defaultValue) {
    const raw = (process.env[name] ?? "").trim() || defaultValue;
    return node_path_1.default.isAbsolute(raw) ? raw : node_path_1.default.join(exports.DATA_DIR, raw);
}
const configWarnings = [];
function resolveTransport() {
    const raw = (process.env.MCP_TRANSPORT ?? "").trim().toLowerCase();
    if (raw === "" || raw === "stdio")
        return "stdio";
    if (raw === "http" || raw === "both")
        return raw;
    configWarnings.push(`Invalid MCP_TRANSPORT value '${raw}': expected one of stdio, http, both. Falling back to stdio.`);
    return "stdio";
}
function consumeConfigWarnings() {
    return configWarnings.splice(0);
}
exports.envConfig = {
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
};
//# sourceMappingURL=EnvConfig.js.map