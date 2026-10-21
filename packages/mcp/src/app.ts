#!/usr/bin/env node

import "@/config/CliArgs";
import { startServer } from "@/core/McpServer";
import { Logger } from "@/utils/Logger";

startServer().catch((error) => {
  Logger.error("Could not start the MCP server.", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
