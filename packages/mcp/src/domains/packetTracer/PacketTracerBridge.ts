
import {
  awaitToolResult,
  forgetCall,
  requestTool,
} from "./PacketTracerBridgeServer";
import { envConfig } from "@/config/EnvConfig";
import { Logger } from "@/utils/Logger";
import {
  McpToolError,
  unavailableError,
  normalizeError,
} from "@/core/errors";


const TOOL_TIMEOUTS: Record<string, number> = {
  listDeviceModels: 15_000,
  getDeviceInfo: 15_000,
  readDeviceConsole: 15_000,
  listDeviceModules: 15_000,
  getCommandLog: 15_000,

  getRoutingTable: 30_000,
  getVlanConfiguration: 30_000,
  getDeviceConfigSnapshot: 45_000,
  getDeviceMetrics: 45_000,
  validateSecurityConfig: 45_000,
  runDeviceCommands: 60_000,

  runCommandAsync: 30_000,
  pollCommandResult: 25_000,

  getNetwork: 45_000,
  validateTopology: 45_000,

  getSimulationStatus: 10_000,
  setSimulationMode: 30_000,
  stepSimulation: 30_000,
  getPduResults: 30_000,
  sendPdu: 45_000,

  moveDevice: 15_000,
  addDevice: 20_000,
  removeDevice: 20_000,
  addLink: 20_000,
  removeLink: 20_000,
  renameDevice: 20_000,
  configurePcIp: 30_000,
  setPower: 30_000,
  clearWorkspace: 30_000,

  applyDeviceConfig: 120_000,
  simulateLinkFailure: 30_000,
  restoreLink: 30_000,

  pingDevices: 60_000,
  reachabilityMatrix: 90_000,
  exportWorkspace: 90_000,
  importWorkspace: 90_000,
};


const DEFAULT_TIMEOUT_MS = 60_000;


export function toolTimeoutMs(name: string): number {
  return TOOL_TIMEOUTS[name] ?? DEFAULT_TIMEOUT_MS;
}


class PacketTracerBridge {
  
  private readonly timers = new Map<string, NodeJS.Timeout>();

  
  private get url(): string {
    return `http://${envConfig.MCP_BRIDGE_HOST}:${envConfig.MCP_BRIDGE_PORT}`;
  }

  
  async callTool(
    name: string,
    input: Record<string, unknown>,
    options: { timeoutMs?: number } = {},
  ): Promise<unknown> {
    const timeoutMs =
      options.timeoutMs && options.timeoutMs > 0
        ? options.timeoutMs
        : toolTimeoutMs(name);

    return new Promise<unknown>((resolve, reject) => {
      let toolCallId: string;
      try {
        toolCallId = requestTool(name, input).toolCallId;
      } catch (error) {
        
        
        Logger.debug(`Call to '${name}' discarded before emitting: ${String(error)}`);
        reject(error);
        return;
      }

      const timer = setTimeout(() => {
        this.timers.delete(toolCallId);
        
        
        forgetCall(toolCallId);
        reject(
          unavailableError(
            `Packet Tracer did not respond to '${name}' within ${Math.round(timeoutMs / 1000)} s.`,
            "The command may still have been queued in the extension, so do NOT repeat it blindly: " +
              "check the state with a read (packet_tracer_get_network or packet_tracer_read_console). " +
              "If the console got blocked by a dialog, restart Packet Tracer. " +
              `Also check that the extension is connected to the MCP bridge (${this.url}) ` +
              `and that MCP_BRIDGE_PORT=${envConfig.MCP_BRIDGE_PORT} is the port it connects to.`,
          ),
        );
      }, timeoutMs);
      this.timers.set(toolCallId, timer);

      awaitToolResult(toolCallId).then(
        (value) => {
          clearTimeout(timer);
          this.timers.delete(toolCallId);
          resolve(unwrapEnvelope(value));
        },
        (error) => {
          clearTimeout(timer);
          this.timers.delete(toolCallId);
          reject(error);
        },
      );
    });
  }

  
  async close(): Promise<void> {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
      forgetCall(id);
    }
    this.timers.clear();
  }
}


function unwrapEnvelope(value: unknown): unknown {
  let current = value;
  let rounds = 0;
  while (
    rounds < 5 &&
    current &&
    typeof current === "object" &&
    typeof (current as { code?: unknown }).code === "string" &&
    "result" in (current as object)
  ) {
    current = (current as { result: unknown }).result;
    rounds++;
  }
  return current;
}

export const packetTracerBridge = new PacketTracerBridge();


export function isOperationOk(result: unknown): boolean {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return false;
  }
  const raw = result as Record<string, unknown>;
  if (raw.success === false) return false;
  if (raw.succes === false) return false; 
  if (raw.error) return false;
  return true;
}


export async function callPacketTracer(
  name: string,
  input: Record<string, unknown>,
  options: { timeoutMs?: number } = {},
): Promise<unknown> {
  try {
    return await packetTracerBridge.callTool(name, input, options);
  } catch (error) {
    if (error instanceof McpToolError) throw error;
    throw normalizeError(error);
  }
}
