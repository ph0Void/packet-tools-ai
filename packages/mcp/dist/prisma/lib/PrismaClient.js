"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaClient = void 0;
exports.disconnectPrisma = disconnectPrisma;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
const client_1 = require("../generated/client.js");
const EnvConfig_1 = require("../../config/EnvConfig.js");
const Migrator_1 = require("../Migrator.js");
const DEFAULT_DB_NAME = ".packet_tools_mcp.db";
function loadRootEnvIfMissing() {
    if (process.env.DATABASE_URL_MCP)
        return;
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
        if (process.env.DATABASE_URL_MCP)
            return;
    }
}
loadRootEnvIfMissing();
function resolveDatabaseUrl() {
    node_fs_1.default.mkdirSync(EnvConfig_1.DATA_DIR, { recursive: true });
    const raw = (process.env.DATABASE_URL_MCP ?? "").trim();
    if (!raw)
        return `file:${node_path_1.default.join(EnvConfig_1.DATA_DIR, DEFAULT_DB_NAME)}`;
    if (!raw.startsWith("file:"))
        return raw;
    const relativePath = raw.slice("file:".length);
    if (node_path_1.default.isAbsolute(relativePath))
        return raw;
    return `file:${node_path_1.default.join(EnvConfig_1.DATA_DIR, relativePath)}`;
}
(0, Migrator_1.applyMigrations)();
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
exports.prismaClient = new client_1.PrismaClient({
    adapter,
    log: process.env.MCP_PRISMA_LOG === "true" ? ["warn", "error"] : ["error"],
});
async function disconnectPrisma() {
    await exports.prismaClient.$disconnect();
}
//# sourceMappingURL=PrismaClient.js.map