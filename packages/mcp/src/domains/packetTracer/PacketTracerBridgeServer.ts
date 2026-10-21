
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { envConfig } from "@/config/EnvConfig";
import { Logger } from "@/utils/Logger";
import { unavailableError } from "@/core/errors";


export interface ToolCallRequest {
  tool_call_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}


export interface ToolCallResult {
  tool_call_id: string;
  result?: unknown;
}


const CALL_TTL_MS = 300_000;


const MAX_PENDING_CALLS = 512;


interface CallWait {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timer: NodeJS.Timeout;
}


interface PendingCall {
  sourceSocket: string;
  expiresAt: number;
  wait: CallWait | null;
  readyResult: { value: unknown } | null;
}


export interface BridgeState {
  active: boolean;
  url: string;
  extensionConnected: boolean;
  extensionSocketId: string | null;
  pendingRequests: number;
}


export interface StartOptions {
  port?: number;
  host?: string;
}


let io: Server | null = null;
let httpServer: HttpServer | null = null;

let effectivePort: number | null = null;

let extensionSocket: Socket | null = null;

const pendingCalls = new Map<string, PendingCall>();


function bridgeUrl(): string {
  return `http://${envConfig.MCP_BRIDGE_HOST}:${effectivePort ?? envConfig.MCP_BRIDGE_PORT}`;
}


function missingExtensionError(): Error {
  return unavailableError(
    `The Packet Tracer extension is not connected to the MCP server bridge (${bridgeUrl()}).`,
    "Open Packet Tracer with the extension loaded and check the status with packet_tracer_connection_status. " +
      "If the extension connects to a different URL, adjust MCP_BRIDGE_HOST and MCP_BRIDGE_PORT in the MCP server and " +
      "restart it. The Packet Tools backend does NOT need to be running: the bridge lives in the MCP.",
  );
}


function inactiveBridgeError(): Error {
  return unavailableError(
    `The MCP server's Packet Tracer bridge is not listening on ${bridgeUrl()}.`,
    "Check that MCP_BRIDGE_ENABLED is not false and that the port is free (if another MCP instance or the " +
      "Packet Tools backend is using the port, change MCP_BRIDGE_PORT and restart the MCP server). " +
      "The rest of the MCP domains (GNS3, serial, SSH, telnet, plans and skills) keep working.",
  );
}


function isSimulatorClient(socket: Socket): boolean {
  const clientType = String((socket.handshake?.query as { clientType?: unknown })?.clientType ?? "");
  const userAgent = String(socket.handshake?.headers?.["user-agent"] ?? "");
  return clientType === "packet-tracer" || userAgent.includes("Qt");
}


function currentSecret(): string {
  return envConfig.PT_EXTENSION_SECRET;
}


function presentedSecret(socket: Socket): string {
  const fromAuth = socket.handshake?.auth?.secret;
  const fromHeader = socket.handshake?.headers?.["x-packet-tools-secret"];
  return (
    (typeof fromAuth === "string" ? fromAuth : "") ||
    (typeof fromHeader === "string" ? fromHeader : "")
  );
}


function authenticate(socket: Socket, next: (error?: Error) => void): void {
  if (!isSimulatorClient(socket)) {
    Logger.warning(
      `[BRIDGE_MCP] Connection rejected: the bridge only accepts the Packet Tracer extension [ID: ${socket.id}]`,
      {
        clientType: (socket.handshake?.query as { clientType?: unknown })?.clientType,
        userAgent: socket.handshake?.headers?.["user-agent"],
      },
    );
    next(new Error("The MCP bridge only accepts the Packet Tracer extension"));
    return;
  }

  const secret = currentSecret();
  if (secret && presentedSecret(socket) !== secret) {
    Logger.warning(`[BRIDGE_MCP] Invalid extension secret; rejected [ID: ${socket.id}]`);
    next(new Error("Invalid extension secret"));
    return;
  }

  next();
}


function isPacketTracerExtension(socket: Socket): boolean {
  return extensionSocket !== null && extensionSocket.id === socket.id;
}


function deliver(call: PendingCall, value: unknown): void {
  if (call.wait) {
    clearTimeout(call.wait.timer);
    call.wait.resolve(value);
    call.wait = null;
    return;
  }
  call.readyResult = { value };
}


function abort(call: PendingCall, error: Error): void {
  if (!call.wait) return;
  clearTimeout(call.wait.timer);
  call.wait.reject(error);
  call.wait = null;
}


function expiredCallError(toolCallId: string): Error {
  return unavailableError(
    `Call '${toolCallId}' expired before the extension responded (${Math.round(
      CALL_TTL_MS / 1000,
    )} s).`,
    "The command may still have been applied in Packet Tracer: check the state with a read before repeating it.",
  );
}


function pruneCalls(now: number): void {
  for (const [id, call] of pendingCalls) {
    if (call.expiresAt > now) continue;
    abort(call, expiredCallError(id));
    pendingCalls.delete(id);
  }
  while (pendingCalls.size >= MAX_PENDING_CALLS) {
    const oldest = [...pendingCalls.keys()][0];
    if (oldest === undefined) break;
    const call = pendingCalls.get(oldest);
    if (call) {
      abort(
        call,
        unavailableError(
          `Call '${oldest}' was dropped for exceeding the maximum of ${MAX_PENDING_CALLS} calls in flight.`,
          "Reduce the number of concurrent Packet Tracer operations (wait for the previous ones to finish) and try again.",
        ),
      );
    }
    pendingCalls.delete(oldest);
  }
}


function registerCall(toolCallId: string, sourceSocket: string): boolean {
  const now = Date.now();
  pruneCalls(now);
  if (pendingCalls.has(toolCallId)) return false;
  pendingCalls.set(toolCallId, {
    sourceSocket,
    expiresAt: now + CALL_TTL_MS,
    wait: null,
    readyResult: null,
  });
  return true;
}


function takeCall(toolCallId: string): PendingCall | null {
  const call = pendingCalls.get(toolCallId);
  if (!call) return null;
  pendingCalls.delete(toolCallId);
  return call.expiresAt <= Date.now() ? null : call;
}


function forgetCallsFrom(socketId: string, reason: string): void {
  for (const [id, call] of pendingCalls) {
    if (call.sourceSocket !== socketId) continue;
    abort(
      call,
      unavailableError(
        `The Packet Tracer extension disconnected with the call '${id}' in flight (${reason}).`,
        "Reopen Packet Tracer with the extension loaded and check with packet_tracer_connection_status. " +
          "The command may still have been applied: verify with a read before repeating it.",
      ),
    );
    pendingCalls.delete(id);
  }
}


export async function startBridge(options: StartOptions = {}): Promise<void> {
  if (io) {
    Logger.debug(`[BRIDGE_MCP] startBridge() ignored: a bridge is already listening on ${bridgeUrl()}.`);
    return;
  }

  if (!envConfig.MCP_BRIDGE_ENABLED) {
    Logger.warning(
      "[BRIDGE_MCP] MCP_BRIDGE_ENABLED=false: the bridge will not start and the Packet Tracer tools will fail.",
      { expectedUrl: bridgeUrl() },
    );
    return;
  }

  const port = options.port ?? envConfig.MCP_BRIDGE_PORT;
  const host = options.host ?? envConfig.MCP_BRIDGE_HOST;

  const http = createServer();
  const socketServer = new Server(http, { cors: { origin: true } });

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        http.off("listening", onReady);
        reject(error);
      };
      const onReady = (): void => {
        http.off("error", onError);
        resolve();
      };
      http.once("error", onError);
      http.once("listening", onReady);
      http.listen(port, host);
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    Logger.error(
      `Could not start the Packet Tracer bridge on http://${host}:${port}: ` +
        (code === "EADDRINUSE"
          ? "the port is already in use (EADDRINUSE). It may be another MCP server instance or the Packet Tools backend."
          : String((error as Error)?.message ?? error)) +
        " The MCP server keeps running; the packet_tracer_* tools will fail with this reason.",
      { host, port, code },
    );
    socketServer.close();
    http.close();
    return;
  }

  const address = http.address() as AddressInfo | string | null;
  effectivePort = address && typeof address === "object" ? address.port : port;

  io = socketServer;
  httpServer = http;
  socketServer.use((socket, next) => authenticate(socket, next));
  socketServer.on("connection", registerConnection);

  Logger.info(`Packet Tracer bridge listening on ${bridgeUrl()} (the extension connects here).`);
}


function registerConnection(socket: Socket): void {
  const isSimulator = isSimulatorClient(socket);
  Logger.info(
    `[BRIDGE_MCP] New connection ${isSimulator ? "PACKET TRACER EXTENSION" : "client"} [ID: ${socket.id}]`,
    {
      clientType: (socket.handshake?.query as { clientType?: unknown })?.clientType,
      userAgent: socket.handshake?.headers?.["user-agent"],
    },
  );

  if (isSimulator) attachExtension(socket);

  socket.on("tool_call", (data: ToolCallRequest) => {
    Logger.warning(
      `[BRIDGE_MCP] tool_call from a connected socket; the MCP hands its calls directly to the extension, so it is discarded [ID: ${socket.id}]`,
      { toolName: data?.tool_name },
    );
  });

  socket.on("tool_result", (data: ToolCallResult) => {
    const toolCallId = typeof data?.tool_call_id === "string" ? data.tool_call_id : "";
    if (!toolCallId) {
      Logger.warning(`[BRIDGE_MCP] tool_result without tool_call_id; discarded [ID: ${socket.id}]`);
      return;
    }

    if (!isPacketTracerExtension(socket)) {
      Logger.warning(
        `[BRIDGE_MCP] tool_result from a socket that is not the registered extension; ignored [ID: ${socket.id}]`,
        { toolCallId },
      );
      return;
    }

    const call = takeCall(toolCallId);
    if (!call) {
      Logger.info("[BRIDGE_MCP] Orphaned, repeated or expired tool_result; discarded", {
        toolCallId,
      });
      return;
    }

    deliver(call, data.result);
  });

  socket.on("disconnect", (reason: string) => {
    Logger.info(`[BRIDGE_MCP] Disconnected [ID: ${socket.id}] (${reason})`);
    if (extensionSocket?.id === socket.id) {
      extensionSocket = null;
      forgetCallsFrom(socket.id, reason || "disconnection");
    }
  });
}


function attachExtension(socket: Socket): void {
  if (extensionSocket && extensionSocket.connected) {
    Logger.warning(
      `[BRIDGE_MCP] An extension is already registered (${extensionSocket.id}); this connection (${socket.id}) stays as a client and its tool_result will be ignored.`,
    );
    return;
  }
  extensionSocket = socket;
  Logger.info(`[BRIDGE_MCP] Packet Tracer extension registered [ID: ${socket.id}] at ${bridgeUrl()}.`);
}


export async function stopBridge(): Promise<void> {
  const socketServer = io;
  io = null;
  httpServer = null;
  effectivePort = null;
  extensionSocket = null;

  if (!socketServer) return;

  for (const [id, call] of pendingCalls) {
    abort(
      call,
      unavailableError(
        `The MCP server shut down with the call '${id}' in flight.`,
        "Restart the MCP server: it closed while waiting for a Packet Tracer response. The command may still have been applied.",
      ),
    );
    pendingCalls.delete(id);
  }

  await new Promise<void>((resolve) => {
    socketServer.close(() => resolve());
  });
  Logger.info("[BRIDGE_MCP] Packet Tracer bridge stopped.");
}


export function getBridgeState(): BridgeState {
  return {
    active: io !== null && httpServer?.listening === true,
    url: bridgeUrl(),
    extensionConnected: extensionSocket !== null && extensionSocket.connected,
    extensionSocketId: extensionSocket?.id ?? null,
    pendingRequests: pendingCalls.size,
  };
}


export function getExtensionSocket(): Socket | null {
  return extensionSocket && extensionSocket.connected ? extensionSocket : null;
}


export function requestTool(
  name: string,
  input: Record<string, unknown>,
): { toolCallId: string } {
  if (!envConfig.MCP_BRIDGE_ENABLED) {
    throw unavailableError(
      "The Packet Tracer bridge is disabled on this MCP server (MCP_BRIDGE_ENABLED=false).",
      "The packet_tracer_* tools cannot work without it. Re-enable MCP_BRIDGE_ENABLED and restart the MCP server.",
    );
  }
  if (!io) throw inactiveBridgeError();

  const extension = getExtensionSocket();
  if (!extension) throw missingExtensionError();

  const toolCallId = `tool-${name}-${randomUUID()}`;
  if (!registerCall(toolCallId, extension.id)) {
    throw new Error(`Call '${toolCallId}' is already in flight (duplicate id).`);
  }

  Logger.trace(`[BRIDGE_MCP] tool_call → ${name}`, { toolCallId });
  extension.emit("tool_call", {
    tool_call_id: toolCallId,
    tool_name: name,
    tool_input: input,
  });

  return { toolCallId };
}


export function awaitToolResult(toolCallId: string): Promise<unknown> {
  const call = pendingCalls.get(toolCallId);
  if (!call) {
    return Promise.reject(
      unavailableError(
        `There is no call in flight with id '${toolCallId}'.`,
        "Either its result was already consumed, or it expired. Request the operation again; do not reuse old ids.",
      ),
    );
  }

  if (call.readyResult) {
    const value = call.readyResult.value;
    pendingCalls.delete(toolCallId);
    return Promise.resolve(value);
  }
  if (call.wait) return call.wait.promise;

  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const timer = setTimeout(() => {
    pendingCalls.delete(toolCallId);
    reject(expiredCallError(toolCallId));
  }, CALL_TTL_MS);

  call.wait = { promise, resolve, reject, timer };
  return promise;
}


export function forgetCall(toolCallId: string): void {
  const call = pendingCalls.get(toolCallId);
  if (!call) return;
  abort(
    call,
    unavailableError(
      `Waiting for call '${toolCallId}' was abandoned.`,
      "The command may still have been applied in Packet Tracer: verify with a read before repeating it.",
    ),
  );
  pendingCalls.delete(toolCallId);
}
