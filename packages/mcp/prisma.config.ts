import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

if (!process.env.DATABASE_URL_MCP) {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: false, quiet: true });
      if (process.env.DATABASE_URL_MCP) break;
    }
  }
  if (!process.env.DATABASE_URL_MCP) dotenv.config({ quiet: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL_MCP"),
  },
});
