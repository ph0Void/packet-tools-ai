#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/CliArgs.js");
const McpServer_1 = require("./core/McpServer.js");
const Logger_1 = require("./utils/Logger.js");
(0, McpServer_1.startServer)().catch((error) => {
    Logger_1.Logger.error("Could not start the MCP server.", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
});
//# sourceMappingURL=app.js.map