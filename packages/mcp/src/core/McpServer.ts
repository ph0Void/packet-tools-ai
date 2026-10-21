import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { toolRegistry } from "@/core/ToolRegistry";
import { envConfig, consumeConfigWarnings, PACKAGE_ROOT } from "@/config/EnvConfig";
import { Logger } from "@/utils/Logger";
import { disconnectPrisma } from "@/prisma/lib/PrismaClient";
import { registerDomains } from "@/domains/registry";
import { registerSkillsAsResources } from "@/skills/SkillResources";
import { startHttpServer, stopHttpServer } from "@/core/McpHttpServer";
import {
  stopBridge,
  getBridgeState,
  startBridge,
} from "@/domains/packetTracer/PacketTracerBridgeServer";


export const SERVER_NAME = "packet-tools-mcp";


function resolveServerVersion(): string {
  try {
    const raw = fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
      return parsed.version.trim();
    }
  } catch {
  }
  return "0.0.0";
}


export const SERVER_VERSION = resolveServerVersion();


export function buildServer(): McpServer {
  registerDomains();

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: buildInstructions(),
    },
  );

  toolRegistry.connectToServer(server);
  registerSkillsAsResources(server);

  return server;
}


function buildInstructions(): string {
  const domains = toolRegistry
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
      envConfig.MCP_BRIDGE_PORT +
      "`); no other service is required. If it fails, start with `packet_tracer_connection_status`, which reports whether the bridge is listening and whether the extension is connected.",
    "- Before configuring a real device, identify its vendor: `serial_list_ports` / `*_detect_vendor` tell you which syntax to use when talking to it.",
    "- For multi-step tasks use `plan_task` to agree on the plan and `execute_plan` to run it; that way you get an auditable record in markdown.",
    "- The user's own instructions live in skills: view them with `list_skills` and read them with `read_skill` before acting in their domain.",
    "",
    "Errors return a code and an explicit suggestion of what to do next: read it before retrying.",
  ].join("\n");
}


export async function startServer(): Promise<void> {
  for (const warning of consumeConfigWarnings()) {
    Logger.warning(warning);
  }

  const usesStdio = envConfig.MCP_TRANSPORT === "stdio" || envConfig.MCP_TRANSPORT === "both";
  const usesHttp = envConfig.MCP_TRANSPORT === "http" || envConfig.MCP_TRANSPORT === "both";

  const server = usesStdio ? buildServer() : null;
  const transport = usesStdio ? new StdioServerTransport() : null;

  const bridgeReady = startBridge().catch((error: unknown) => {
    Logger.error("Could not start the Packet Tracer bridge.", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  const httpReady = usesHttp ? startHttpServer() : Promise.resolve();

  if (server && transport) {
    await server.connect(transport);
  }

  await Promise.all([bridgeReady, httpReady]);

  Logger.info(
    `MCP server ready (${envConfig.MCP_TRANSPORT}): ${toolRegistry.countTools()} tools from ${toolRegistry.getModules().length} domains.`,
  );
  const bridge = getBridgeState();
  Logger.info(
    bridge.active
      ? `Packet Tracer bridge listening on ${bridge.url} (extension connected: ${bridge.extensionConnected ? "yes" : "not yet"}).`
      : `Packet Tracer bridge INACTIVE: the packet_tracer_* tools will fail until the MCP is restarted with MCP_BRIDGE_PORT=${envConfig.MCP_BRIDGE_PORT} free.`,
  );

  let closing = false;
  const close = async (reason: string): Promise<void> => {
    if (closing) return;
    closing = true;
    Logger.info(`Closing MCP server (${reason}).`);
    await stopHttpServer().catch((error: unknown) => {
      Logger.debug("Error stopping the MCP HTTP server.", { error: String(error) });
    });
    await stopBridge().catch((error: unknown) => {
      Logger.debug("Error stopping the Packet Tracer bridge.", { error: String(error) });
    });
    if (server) {
      try {
        await server.close();
      } catch (error) {
        Logger.debug("Error closing the MCP server.", { error: String(error) });
      }
    }
    await disconnectPrisma().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void close("SIGINT"));
  process.on("SIGTERM", () => void close("SIGTERM"));

  if (usesStdio) {
    process.stdin.on("close", () => void close("stdin closed"));
  }
}
