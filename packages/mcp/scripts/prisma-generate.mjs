
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");

function loadRootEnv() {
  if (process.env.DATABASE_URL_MCP) return;

  const candidates = [];
  let current = packageRoot;
  for (let i = 0; i < 5; i++) {
    candidates.push(path.join(current, ".env"));
    current = path.dirname(current);
  }

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    dotenv.config({ path: candidate, override: false });
    if (process.env.DATABASE_URL_MCP) return;
  }
}

loadRootEnv();

if (!process.env.DATABASE_URL_MCP) {
  process.env.DATABASE_URL_MCP = "file:.packet_tools_mcp.db";
}

const result = spawnSync("npx", ["prisma", "generate"], {
  cwd: packageRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error(
    "\n[prisma-generate] Prisma client generation failed. " +
      "Check that `prisma/schema.prisma` is valid and that dependencies are installed.",
  );
  process.exit(result.status ?? 1);
}
