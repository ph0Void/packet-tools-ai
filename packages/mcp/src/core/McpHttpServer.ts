import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { SERVER_NAME, SERVER_VERSION, buildServer } from "@/core/McpServer";
import { registerDomains } from "@/domains/registry";
import { toolRegistry } from "@/core/ToolRegistry";
import { envConfig } from "@/config/EnvConfig";
import { Logger } from "@/utils/Logger";


const MCP_PATH = "/mcp";
const SSE_PATH = "/sse";
const MESSAGES_PATH = "/messages";
const HEALTH_PATH = "/health";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SSE_KEEP_ALIVE_MS = 15_000;


const streamableSessions = new Map<string, StreamableHTTPServerTransport>();
const sseSessions = new Map<string, SSEServerTransport>();
let httpServer: http.Server | null = null;


class PayloadTooLargeError extends Error {
  constructor() {
    super("The JSON-RPC body exceeds the 2 MB limit.");
    this.name = "PayloadTooLargeError";
  }
}


interface ParsedBody {
  ok: boolean;
  value?: unknown;
}


function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", envConfig.MCP_HTTP_CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, Mcp-Protocol-Version");
}


function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}


function sendJsonRpcError(
  res: ServerResponse,
  status: number,
  code: number,
  message: string,
  headers: Record<string, string> = {},
): void {
  sendJson(res, status, { jsonrpc: "2.0", error: { code, message }, id: null }, headers);
}


function unauthorized(res: ServerResponse): void {
  sendJsonRpcError(
    res,
    401,
    -32001,
    "Unauthorized: provide MCP_HTTP_TOKEN via Authorization: Bearer or ?token=.",
    { "WWW-Authenticate": "Bearer" },
  );
}


function hashToken(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}


function readRequestToken(req: IncomingMessage, url: URL): string {
  const rawHeader = req.headers.authorization;
  const header = Array.isArray(rawHeader) ? rawHeader[0] ?? "" : rawHeader ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice("bearer ".length).trim();
  }
  return url.searchParams.get("token") ?? "";
}


function isAuthorized(req: IncomingMessage, url: URL): boolean {
  if (!envConfig.MCP_HTTP_TOKEN) return true;
  return timingSafeEqual(
    hashToken(readRequestToken(req, url)),
    hashToken(envConfig.MCP_HTTP_TOKEN),
  );
}


function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}


async function readTextBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.removeAllListeners("data");
        req.removeAllListeners("end");
        req.removeAllListeners("error");
        req.resume();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", (error) => reject(error));
  });
}


function parseBody(raw: string): ParsedBody {
  if (raw.trim().length === 0) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}


async function readParsedBody(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<ParsedBody | null> {
  let raw: string;
  try {
    raw = await readTextBody(req);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      sendJsonRpcError(res, 413, -32000, "Payload Too Large: the JSON-RPC body must not exceed 2 MB.");
      return null;
    }
    throw error;
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    sendJsonRpcError(res, 400, -32700, "Parse error: Invalid JSON");
    return null;
  }
  return parsed;
}


function readSessionIdHeader(req: IncomingMessage): string {
  const rawHeader = req.headers["mcp-session-id"];
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  return (header ?? "").trim();
}


async function startStreamableSession(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      streamableSessions.set(sessionId, transport);
      Logger.debug(`Streamable HTTP session initialized: ${sessionId}`);
    },
  });

  transport.onclose = () => {
    const sessionId = transport.sessionId;
    if (sessionId && streamableSessions.get(sessionId) === transport) {
      streamableSessions.delete(sessionId);
      Logger.debug(`Streamable HTTP session closed: ${sessionId}`);
    }
  };

  const server = buildServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, parsedBody);
}


async function handleOneShotRequest(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
): Promise<void> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildServer();
  await server.connect(transport);
  try {
    await transport.handleRequest(req, res, parsedBody);
  } finally {
    await server.close().catch((error: unknown) => {
      Logger.debug("Error closing the one-shot MCP server.", { error: String(error) });
    });
  }
}


async function handleStreamableRequest(
  req: IncomingMessage,
  res: ServerResponse,
  method: string,
): Promise<void> {
  const sessionId = readSessionIdHeader(req);
  const streamableTransport = sessionId ? streamableSessions.get(sessionId) : undefined;

  if (sessionId && !streamableTransport && sseSessions.has(sessionId)) {
    sendJsonRpcError(res, 400, -32000, "Bad Request: Session exists but uses a different transport protocol");
    return;
  }

  if (method === "POST") {
    const parsed = await readParsedBody(req, res);
    if (!parsed) return;

    if (streamableTransport) {
      await streamableTransport.handleRequest(req, res, parsed.value);
      return;
    }

    if (!sessionId) {
      if (isInitializeRequest(parsed.value)) {
        await startStreamableSession(req, res, parsed.value);
      } else {
        await handleOneShotRequest(req, res, parsed.value);
      }
      return;
    }

    sendJsonRpcError(res, 400, -32000, "Bad Request: No valid session ID provided");
    return;
  }

  if (!streamableTransport) {
    sendJsonRpcError(res, 400, -32000, "Bad Request: No valid session ID provided");
    return;
  }

  await streamableTransport.handleRequest(req, res);
}


async function handleSseConnect(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const transport = new SSEServerTransport(MESSAGES_PATH, res);
  const sessionId = transport.sessionId;
  sseSessions.set(sessionId, transport);

  let keepAliveTimer: NodeJS.Timeout | undefined;
  const cleanup = (): void => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = undefined;
    }
    if (sseSessions.get(sessionId) === transport) {
      sseSessions.delete(sessionId);
    }
  };

  transport.onclose = cleanup;
  res.on("close", cleanup);

  try {
    const server = buildServer();
    await server.connect(transport);
  } catch (error) {
    cleanup();
    Logger.error("Could not establish the SSE stream.", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      sendJsonRpcError(res, 500, -32603, "Internal server error");
    }
    return;
  }

  Logger.debug(`SSE session opened: ${sessionId}`);

  keepAliveTimer = setInterval(() => {
    if (res.writableEnded) {
      cleanup();
      return;
    }
    try {
      res.write(": ping\n\n");
    } catch {
      cleanup();
    }
  }, SSE_KEEP_ALIVE_MS);
}


async function handleSseMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
  const transport = sessionId ? sseSessions.get(sessionId) : undefined;

  if (!transport) {
    sendJsonRpcError(
      res,
      400,
      -32000,
      sessionId && streamableSessions.has(sessionId)
        ? "Bad Request: Session exists but uses a different transport protocol"
        : "Bad Request: No valid session ID provided",
    );
    return;
  }

  const parsed = await readParsedBody(req, res);
  if (!parsed) return;

  await transport.handlePostMessage(req, res, parsed.value);
}


async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  applyCorsHeaders(res);

  const url = new URL(req.url ?? "/", "http://x");
  const method = (req.method ?? "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === HEALTH_PATH && method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      name: SERVER_NAME,
      version: SERVER_VERSION,
      tools: toolRegistry.countTools(),
      transport: "http",
      sessions: {
        streamable: streamableSessions.size,
        sse: sseSessions.size,
      },
    });
    return;
  }

  if (!isAuthorized(req, url)) {
    unauthorized(res);
    return;
  }

  if (url.pathname === MCP_PATH) {
    await handleStreamableRequest(req, res, method);
    return;
  }

  if (url.pathname === SSE_PATH && method === "GET") {
    await handleSseConnect(req, res);
    return;
  }

  if (url.pathname === MESSAGES_PATH && method === "POST") {
    await handleSseMessage(req, res, url);
    return;
  }

  sendJsonRpcError(res, 404, -32000, `Not found: ${method} ${url.pathname}`);
}


async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await handleRequest(req, res);
  } catch (error) {
    Logger.error("Error handling an MCP HTTP request.", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      sendJsonRpcError(res, 500, -32603, "Internal server error");
      return;
    }
    try {
      res.end();
    } catch {
    }
  }
}


export async function startHttpServer(): Promise<void> {
  if (httpServer) return;

  registerDomains();

  const server = http.createServer((req, res) => {
    void dispatch(req, res);
  });

  await new Promise<void>((resolve) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      if (error.code === "EADDRINUSE") {
        Logger.error(
          `MCP HTTP port ${envConfig.MCP_HTTP_PORT} is already in use. Free that port or restart with ` +
            "MCP_HTTP_PORT=<free port> (or --http-port=<free port>).",
          { error: error.message },
        );
      } else {
        Logger.error("Could not start the MCP HTTP server.", { error: error.message });
      }
      if (envConfig.MCP_TRANSPORT === "http") process.exit(1);
      resolve();
    };

    server.once("error", onError);
    server.listen(envConfig.MCP_HTTP_PORT, envConfig.MCP_HTTP_HOST, () => {
      server.removeListener("error", onError);
      httpServer = server;

      Logger.info(
        `MCP HTTP server listening on http://${envConfig.MCP_HTTP_HOST}:${envConfig.MCP_HTTP_PORT} ` +
          `(POST/GET/DELETE ${MCP_PATH} for Streamable HTTP, GET ${SSE_PATH} + POST ${MESSAGES_PATH} ` +
          `for HTTP+SSE, GET ${HEALTH_PATH} for health).`,
      );

      if (!envConfig.MCP_HTTP_TOKEN && !isLoopbackHost(envConfig.MCP_HTTP_HOST)) {
        Logger.warning(
          `MCP_HTTP_HOST='${envConfig.MCP_HTTP_HOST}' is not loopback and MCP_HTTP_TOKEN is empty: ` +
            "anyone who can reach that port can drive this MCP server. Set MCP_HTTP_TOKEN or bind to 127.0.0.1.",
        );
      }
      resolve();
    });
  });
}


export async function stopHttpServer(): Promise<void> {
  const transports = [...streamableSessions.values(), ...sseSessions.values()];
  streamableSessions.clear();
  sseSessions.clear();

  for (const transport of transports) {
    try {
      await transport.close();
    } catch (error) {
      Logger.debug("Error closing an MCP HTTP transport during shutdown.", {
        error: String(error),
      });
    }
  }

  const server = httpServer;
  httpServer = null;
  if (!server) return;

  await new Promise<void>((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
  Logger.info("MCP HTTP server stopped.");
}
