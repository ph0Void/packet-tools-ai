import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/client";
import { DATA_DIR } from "@/config/EnvConfig";
import { applyMigrations } from "../Migrator";


const DEFAULT_DB_NAME = ".packet_tools_mcp.db";


function loadRootEnvIfMissing(): void {
  if (process.env.DATABASE_URL_MCP) return;

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
    if (process.env.DATABASE_URL_MCP) return;
  }
}

loadRootEnvIfMissing();


function resolveDatabaseUrl(): string {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const raw = (process.env.DATABASE_URL_MCP ?? "").trim();
  if (!raw) return `file:${path.join(DATA_DIR, DEFAULT_DB_NAME)}`;
  if (!raw.startsWith("file:")) return raw;

  const relativePath = raw.slice("file:".length);
  if (path.isAbsolute(relativePath)) return raw;
  return `file:${path.join(DATA_DIR, relativePath)}`;
}

applyMigrations();

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });

export const prismaClient = new PrismaClient({
  adapter,
  log: process.env.MCP_PRISMA_LOG === "true" ? ["warn", "error"] : ["error"],
});


export async function disconnectPrisma(): Promise<void> {
  await prismaClient.$disconnect();
}
