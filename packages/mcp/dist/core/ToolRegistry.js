"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = void 0;
exports.defineTool = defineTool;
const Logger_1 = require("../utils/Logger.js");
function defineTool(tool) {
    return tool;
}
class ToolRegistry {
    modules = [];
    registeredNames = new Set();
    register(module) {
        if (module.tools.length === 0) {
            throw new Error(`The domain '${module.id}' exposes no tools: check that the module is declaring them.`);
        }
        for (const tool of module.tools) {
            if (!tool.name.startsWith(module.prefix)) {
                throw new Error(`Tool '${tool.name}' of domain '${module.id}' does not start with its prefix '${module.prefix}'. ` +
                    `The prefix is not decorative: it is what lets the model know which domain the tool belongs to.`);
            }
            if (this.registeredNames.has(tool.name)) {
                throw new Error(`Tool '${tool.name}' is already registered by another domain. Names must be unique across the whole server.`);
            }
            this.registeredNames.add(tool.name);
        }
        this.modules.push(module);
        Logger_1.Logger.debug(`Domain registered: ${module.id} (${module.tools.length} tools)`);
    }
    getModules() {
        return this.modules;
    }
    getTools() {
        return this.modules.flatMap((module) => module.tools);
    }
    countTools() {
        return this.registeredNames.size;
    }
    connectToServer(server) {
        for (const tool of this.getTools()) {
            server.registerTool(tool.name, {
                description: tool.description,
                inputSchema: tool.inputSchema,
            }, (async (args) => {
                const startTime = Date.now();
                Logger_1.Logger.trace(`→ ${tool.name}`, args);
                try {
                    const result = await tool.handler(args);
                    Logger_1.Logger.trace(`← ${tool.name} OK (${Date.now() - startTime} ms)`);
                    return toMcpResponse(result);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    Logger_1.Logger.warning(`← ${tool.name} FAILED (${Date.now() - startTime} ms): ${message}`);
                    return toMcpResponse(error && typeof error === "object" && "toModelMessage" in error
                        ? error.toModelMessage()
                        : `Unexpected error in '${tool.name}': ${message}`, true);
                }
            }));
        }
    }
}
function toMcpResponse(value, isError = false) {
    const text = typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2);
    return {
        content: [{ type: "text", text }],
        ...(isError ? { isError: true } : {}),
    };
}
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=ToolRegistry.js.map