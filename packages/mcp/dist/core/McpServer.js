"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_VERSION = exports.SERVER_NAME = void 0;
exports.buildServer = buildServer;
exports.startServer = startServer;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const ToolRegistry_1 = require("./ToolRegistry.js");
const EnvConfig_1 = require("../config/EnvConfig.js");
const Logger_1 = require("../utils/Logger.js");
const PrismaClient_1 = require("../prisma/lib/PrismaClient.js");
const registry_1 = require("../domains/registry.js");
const SkillResources_1 = require("../skills/SkillResources.js");
const McpHttpServer_1 = require("./McpHttpServer.js");
const PacketTracerBridgeServer_1 = require("../domains/packetTracer/PacketTracerBridgeServer.js");
exports.SERVER_NAME = "packet-tools-mcp";
function resolveServerVersion() {
    try {
        const raw = node_fs_1.default.readFileSync(node_path_1.default.join(EnvConfig_1.PACKAGE_ROOT, "package.json"), "utf8");
        const parsed = JSON.parse(raw);
        if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
            return parsed.version.trim();
        }
    }
    catch {
    }
    return "0.0.0";
}
exports.SERVER_VERSION = resolveServerVersion();
function buildServer() {
    (0, registry_1.registerDomains)();
    const server = new mcp_js_1.McpServer({ name: exports.SERVER_NAME, version: exports.SERVER_VERSION }, {
        capabilities: {
            tools: {},
            resources: {},
        },
        instructions: buildInstructions(),
    });
    ToolRegistry_1.toolRegistry.connectToServer(server);
    (0, SkillResources_1.registerSkillsAsResources)(server);
    return server;
}
function buildInstructions() {
    const domains = ToolRegistry_1.toolRegistry
        .getModules()
        .map((module) => `- ${module.prefix}* — ${module.description}`)
        .join("\n");
    return [
        "Packet Tools MCP server: automates network topologies on Cisco Packet Tracer, GNS3 and real devices (serial, telnet, ssh).",
        "",
        "Available domains (each tool's prefix indicates its domain):",
        domains,
        "",
        "Conventions:",
        "- Tool names carry their domain prefix: use it to know which tool matches the user's request.",
        "- Packet Tracer needs the Packet Tracer extension connected to the bridge hosting THIS MCP server (default `http://127.0.0.1:" +
            EnvConfig_1.envConfig.MCP_BRIDGE_PORT +
            "`); no other service is required. If it fails, start with `packet_tracer_connection_status`, which reports whether the bridge is listening and whether the extension is connected.",
        "- Before configuring a real device, identify its vendor: `serial_list_ports` / `*_detect_vendor` tell you which syntax to use when talking to it.",
        "- For multi-step tasks use `plan_task` to agree on the plan and `execute_plan` to run it; that way you get an auditable record in markdown.",
        "- The user's own instructions live in skills: view them with `list_skills` and read them with `read_skill` before acting in their domain.",
        "",
        "Errors return a code and an explicit suggestion of what to do next: read it before retrying.",
    ].join("\n");
}
async function startServer() {
    for (const warning of (0, EnvConfig_1.consumeConfigWarnings)()) {
        Logger_1.Logger.warning(warning);
    }
    const usesStdio = EnvConfig_1.envConfig.MCP_TRANSPORT === "stdio" || EnvConfig_1.envConfig.MCP_TRANSPORT === "both";
    const usesHttp = EnvConfig_1.envConfig.MCP_TRANSPORT === "http" || EnvConfig_1.envConfig.MCP_TRANSPORT === "both";
    const server = usesStdio ? buildServer() : null;
    const transport = usesStdio ? new stdio_js_1.StdioServerTransport() : null;
    const bridgeReady = (0, PacketTracerBridgeServer_1.startBridge)().catch((error) => {
        Logger_1.Logger.error("Could not start the Packet Tracer bridge.", {
            error: error instanceof Error ? error.message : String(error),
        });
    });
    const httpReady = usesHttp ? (0, McpHttpServer_1.startHttpServer)() : Promise.resolve();
    if (server && transport) {
        await server.connect(transport);
    }
    await Promise.all([bridgeReady, httpReady]);
    Logger_1.Logger.info(`MCP server ready (${EnvConfig_1.envConfig.MCP_TRANSPORT}): ${ToolRegistry_1.toolRegistry.countTools()} tools from ${ToolRegistry_1.toolRegistry.getModules().length} domains.`);
    const bridge = (0, PacketTracerBridgeServer_1.getBridgeState)();
    Logger_1.Logger.info(bridge.active
        ? `Packet Tracer bridge listening on ${bridge.url} (extension connected: ${bridge.extensionConnected ? "yes" : "not yet"}).`
        : `Packet Tracer bridge INACTIVE: the packet_tracer_* tools will fail until the MCP is restarted with MCP_BRIDGE_PORT=${EnvConfig_1.envConfig.MCP_BRIDGE_PORT} free.`);
    let closing = false;
    const close = async (reason) => {
        if (closing)
            return;
        closing = true;
        Logger_1.Logger.info(`Closing MCP server (${reason}).`);
        await (0, McpHttpServer_1.stopHttpServer)().catch((error) => {
            Logger_1.Logger.debug("Error stopping the MCP HTTP server.", { error: String(error) });
        });
        await (0, PacketTracerBridgeServer_1.stopBridge)().catch((error) => {
            Logger_1.Logger.debug("Error stopping the Packet Tracer bridge.", { error: String(error) });
        });
        if (server) {
            try {
                await server.close();
            }
            catch (error) {
                Logger_1.Logger.debug("Error closing the MCP server.", { error: String(error) });
            }
        }
        await (0, PrismaClient_1.disconnectPrisma)().catch(() => undefined);
        process.exit(0);
    };
    process.on("SIGINT", () => void close("SIGINT"));
    process.on("SIGTERM", () => void close("SIGTERM"));
    if (usesStdio) {
        process.stdin.on("close", () => void close("stdin closed"));
    }
}
//# sourceMappingURL=McpServer.js.map