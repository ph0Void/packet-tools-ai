
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const entrypoint = path.join(__dirname, "..", "dist", "app.js");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "packet-tools-mcp-http-"));

const INSTANCE_1_PORT = 7599;
const INSTANCE_2_PORT = 7598;
const INSTANCE_2_TOKEN = "cadena-de-prueba";

const PREFIXES = [
  "packet_tracer_",
  "gns3_",
  "serial_",
  "telnet_",
  "ssh_",
  "plan_",
  "skills_",
];

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

const INITIALIZE_PARAMS = {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "verifier", version: "1.0" },
};

let failures = 0;
const running = [];

function check(description, ok, detail) {
  console.log(`  ${ok ? "✅" : "❌"} ${description}${!ok && detail ? ` → ${detail}` : ""}`);
  if (!ok) failures++;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonRpc(method, id, params) {
  const message = { jsonrpc: "2.0", method };
  if (id !== undefined) message.id = id;
  if (params !== undefined) message.params = params;
  return JSON.stringify(message);
}

function httpRequest(port, method, requestPath, options = {}) {
  const { headers = {}, body, timeoutMs = 10000 } = options;
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, method, path: requestPath, headers },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, text }),
        );
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout tras ${timeoutMs} ms`)));
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function parseRpcResponse(res) {
  const contentType = res.headers["content-type"] || "";
  if (contentType.includes("text/event-stream")) {
    const dataLines = res.text.split("\n").filter((line) => line.startsWith("data:"));
    for (let index = dataLines.length - 1; index >= 0; index--) {
      const parsed = safeJson(dataLines[index].slice(5).trim());
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return safeJson(res.text);
}

async function waitForHealth(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await httpRequest(port, "GET", "/health", { timeoutMs: 2000 });
      if (res.status === 200) return true;
    } catch {
    }
    await delay(250);
  }
  return false;
}

function openSseStream(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path: requestPath }, (res) => {
      const state = { req, res, events: [], waiters: [], buffer: "" };
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        state.buffer += chunk;
        let index;
        while ((index = state.buffer.indexOf("\n\n")) !== -1) {
          const raw = state.buffer.slice(0, index);
          state.buffer = state.buffer.slice(index + 2);
          const event = { event: "message", data: "" };
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event.event = line.slice(6).trim();
            else if (line.startsWith("data:")) event.data += line.slice(5).trim();
          }
          state.events.push(event);
          for (const waiter of [...state.waiters]) {
            if (waiter.predicate(event)) {
              state.waiters = state.waiters.filter((item) => item !== waiter);
              waiter.resolve(event);
            }
          }
        }
      });
      res.on("close", () => {
        for (const waiter of state.waiters) waiter.resolve(null);
        state.waiters = [];
      });
      resolve(state);
    });
    req.on("error", reject);
  });
}

function waitForSseEvent(state, predicate, timeoutMs) {
  const existing = state.events.find(predicate);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const waiter = { predicate, resolve };
    state.waiters.push(waiter);
    setTimeout(() => {
      state.waiters = state.waiters.filter((item) => item !== waiter);
      resolve(null);
    }, timeoutMs);
  });
}

function startInstance(name, extraEnv, args) {
  const child = spawn(process.execPath, [entrypoint, ...args], {
    env: {
      ...process.env,
      MCP_BRIDGE_ENABLED: "false",
      MCP_HTTP_HOST: "127.0.0.1",
      MCP_HTTP_TOKEN: "",
      MCP_DATA_DIR: path.join(tempRoot, name),
      ...extraEnv,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const instance = { name, child, stderr: "", stdout: "" };
  child.stdout.on("data", (chunk) => (instance.stdout += chunk.toString()));
  child.stderr.on("data", (chunk) => (instance.stderr += chunk.toString()));
  running.push(instance);
  return instance;
}

function stopInstance(instance) {
  return new Promise((resolve) => {
    const { child } = instance;
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true);
      return;
    }
    const timer = setTimeout(() => resolve(child.exitCode !== null || child.signalCode !== null), 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
    child.kill("SIGTERM");
  });
}

function printStderrTail(instance, lines) {
  const tail = instance.stderr.trim().split("\n").filter(Boolean).slice(-lines);
  if (tail.length === 0) return;
  console.log(`\n  últimas líneas de stderr de ${instance.name}:`);
  for (const line of tail) console.log(`    ${line}`);
}

async function checkStreamableInstance(port) {
  const health = await httpRequest(port, "GET", "/health");
  const healthBody = safeJson(health.text);
  check("/health responde 200", health.status === 200, `status ${health.status}`);
  check(
    "/health declara name packet-tools-mcp",
    healthBody?.name === "packet-tools-mcp",
    JSON.stringify(healthBody),
  );
  check(
    "/health reporta tools > 0",
    typeof healthBody?.tools === "number" && healthBody.tools > 0,
    `${healthBody?.tools}`,
  );
  check(
    "/health reporta transport http y sesiones",
    healthBody?.transport === "http" && typeof healthBody?.sessions?.streamable === "number",
    JSON.stringify(healthBody?.sessions),
  );

  const init = await httpRequest(port, "POST", "/mcp", {
    headers: JSON_HEADERS,
    body: jsonRpc("initialize", 1, INITIALIZE_PARAMS),
  });
  check(
    "POST /mcp initialize responde 200",
    init.status === 200,
    `status ${init.status}: ${init.text.slice(0, 120)}`,
  );
  const sessionId = init.headers["mcp-session-id"];
  check(
    "initialize devuelve el header mcp-session-id",
    typeof sessionId === "string" && sessionId.length > 0,
  );
  const initRpc = parseRpcResponse(init);
  check(
    "initialize reporta serverInfo.name packet-tools-mcp",
    initRpc?.result?.serverInfo?.name === "packet-tools-mcp",
    JSON.stringify(initRpc?.result?.serverInfo),
  );
  check(
    "initialize declara la capacidad tools",
    Boolean(initRpc?.result?.capabilities?.tools),
    JSON.stringify(initRpc?.result?.capabilities),
  );
  check(
    "initialize incluye instructions para el modelo",
    typeof initRpc?.result?.instructions === "string" && initRpc.result.instructions.length > 50,
    `${initRpc?.result?.instructions?.length ?? 0} caracteres`,
  );

  const notification = await httpRequest(port, "POST", "/mcp", {
    headers: { ...JSON_HEADERS, "Mcp-Session-Id": sessionId },
    body: jsonRpc("notifications/initialized"),
  });
  check(
    "POST /mcp notifications/initialized responde 202",
    notification.status === 202,
    `status ${notification.status}`,
  );

  const list = await httpRequest(port, "POST", "/mcp", {
    headers: { ...JSON_HEADERS, "Mcp-Session-Id": sessionId },
    body: jsonRpc("tools/list", 2),
  });
  check("POST /mcp tools/list responde 200", list.status === 200, `status ${list.status}`);
  const tools = parseRpcResponse(list)?.result?.tools ?? [];
  check("tools/list devuelve las 95 herramientas", tools.length === 95, `${tools.length}`);

  const domains = new Map();
  const orphans = [];
  for (const tool of tools) {
    const prefix = PREFIXES.find((candidate) => tool.name.startsWith(candidate));
    if (!prefix) {
      orphans.push(tool.name);
      continue;
    }
    domains.set(prefix, (domains.get(prefix) ?? 0) + 1);
  }
  console.log("\n  Herramientas por dominio:");
  for (const [prefix, count] of [...domains.entries()].sort()) {
    console.log(`    ${prefix.padEnd(16)} ${String(count).padStart(3)}`);
  }
  check("las herramientas cubren los 7 dominios", domains.size === 7, `${domains.size}`);
  check("no hay herramientas huérfanas", orphans.length === 0, orphans.join(", "));

  const call = await httpRequest(port, "POST", "/mcp", {
    headers: { ...JSON_HEADERS, "Mcp-Session-Id": sessionId },
    body: jsonRpc("tools/call", 3, { name: "skills_directory", arguments: {} }),
  });
  const callRpc = parseRpcResponse(call);
  check(
    "tools/call skills_directory responde sin isError",
    call.status === 200 && callRpc?.result?.isError !== true,
    `status ${call.status}: ${JSON.stringify(callRpc?.result)?.slice(0, 140)}`,
  );
  check(
    "tools/call devuelve contenido de texto",
    Array.isArray(callRpc?.result?.content) &&
      callRpc.result.content[0]?.type === "text" &&
      callRpc.result.content[0].text.length > 0,
  );

  const oneShot = await httpRequest(port, "POST", "/mcp", {
    headers: JSON_HEADERS,
    body: jsonRpc("tools/list", 9),
  });
  const oneShotRpc = parseRpcResponse(oneShot);
  check(
    "tools/list sin sesión (fallback one-shot) responde 200",
    oneShot.status === 200,
    `status ${oneShot.status}: ${oneShot.text.slice(0, 120)}`,
  );
  check(
    "el fallback one-shot devuelve result.tools (95)",
    oneShotRpc?.result?.tools?.length === 95,
    `${oneShotRpc?.result?.tools?.length ?? "sin result"}`,
  );

  const options = await httpRequest(port, "OPTIONS", "/mcp", {
    headers: { Origin: "https://ejemplo.test", "Access-Control-Request-Method": "POST" },
  });
  check(
    "OPTIONS /mcp responde 204 con cabeceras CORS",
    options.status === 204 &&
      String(options.headers["access-control-allow-methods"] || "").includes("POST") &&
      Boolean(options.headers["access-control-allow-headers"]),
    `status ${options.status}`,
  );
  const healthCors = await httpRequest(port, "GET", "/health", {
    headers: { Origin: "https://ejemplo.test" },
  });
  check(
    "GET /health con Origin incluye Access-Control-Allow-Origin",
    Boolean(healthCors.headers["access-control-allow-origin"]),
    String(healthCors.headers["access-control-allow-origin"]),
  );

  const sse = await openSseStream(port, "/sse");
  check(
    "GET /sse abre el stream text/event-stream",
    sse.res.statusCode === 200 &&
      String(sse.res.headers["content-type"] || "").includes("text/event-stream"),
    `status ${sse.res.statusCode}: ${sse.res.headers["content-type"]}`,
  );
  const endpointEvent = await waitForSseEvent(sse, (event) => event.event === "endpoint", 5000);
  check(
    "el primer evento SSE es endpoint apuntando a /messages",
    Boolean(endpointEvent && endpointEvent.data.startsWith("/messages")),
    endpointEvent?.data,
  );
  let sseSessionId = null;
  if (endpointEvent) {
    try {
      sseSessionId = new URL(endpointEvent.data, "http://127.0.0.1").searchParams.get("sessionId");
    } catch {
      sseSessionId = null;
    }
  }
  check("el evento endpoint incluye el sessionId", Boolean(sseSessionId), endpointEvent?.data);

  if (endpointEvent) {
    const ssePost = await httpRequest(port, "POST", endpointEvent.data, {
      headers: JSON_HEADERS,
      body: jsonRpc("initialize", 1, INITIALIZE_PARAMS),
    });
    check(
      "POST /messages?sessionId=... initialize responde 202",
      ssePost.status === 202,
      `status ${ssePost.status}: ${ssePost.text.slice(0, 120)}`,
    );
    const sseAnswer = await waitForSseEvent(
      sse,
      (event) => event.event === "message" && safeJson(event.data)?.id === 1,
      5000,
    );
    const sseAnswerBody = sseAnswer ? safeJson(sseAnswer.data) : null;
    check(
      "la respuesta JSON-RPC (id 1) del initialize llega por el stream SSE",
      sseAnswerBody?.result?.serverInfo?.name === "packet-tools-mcp",
      sseAnswer?.data?.slice(0, 140),
    );
  }

  sse.req.destroy();
  await delay(300);
  const healthAfterSse = await httpRequest(port, "GET", "/health");
  check(
    "tras cerrar el SSE el servidor sigue sano (/health 200)",
    healthAfterSse.status === 200,
    `status ${healthAfterSse.status}`,
  );

  const missingRoute = await httpRequest(port, "GET", "/ruta-inexistente");
  check(
    "GET /ruta-inexistente responde 404",
    missingRoute.status === 404,
    `status ${missingRoute.status}`,
  );
}

async function checkTokenInstance(port) {
  const unauthorized = await httpRequest(port, "POST", "/mcp", {
    headers: JSON_HEADERS,
    body: jsonRpc("initialize", 1, INITIALIZE_PARAMS),
  });
  check(
    "POST /mcp initialize sin token responde 401",
    unauthorized.status === 401,
    `status ${unauthorized.status}: ${unauthorized.text.slice(0, 120)}`,
  );
  check(
    "el 401 incluye WWW-Authenticate: Bearer",
    String(unauthorized.headers["www-authenticate"] || "")
      .toLowerCase()
      .startsWith("bearer"),
    unauthorized.headers["www-authenticate"],
  );

  const authorized = await httpRequest(
    port,
    "POST",
    `/mcp?token=${encodeURIComponent(INSTANCE_2_TOKEN)}`,
    { headers: JSON_HEADERS, body: jsonRpc("initialize", 1, INITIALIZE_PARAMS) },
  );
  check(
    "POST /mcp initialize con ?token= responde 200",
    authorized.status === 200,
    `status ${authorized.status}: ${authorized.text.slice(0, 120)}`,
  );
  check(
    "la sesión autorizada devuelve mcp-session-id",
    typeof authorized.headers["mcp-session-id"] === "string",
  );

  const health = await httpRequest(port, "GET", "/health");
  check("GET /health no requiere token", health.status === 200, `status ${health.status}`);
}

async function main() {
  console.log("\n=== MCP sobre HTTP: Streamable HTTP + HTTP+SSE (procesos reales) ===\n");

  console.log(`Instancia 1: --transport=http --http-port=${INSTANCE_1_PORT} (flags CLI)\n`);
  const instance1 = startInstance("instance-1", {}, [
    "--transport=http",
    `--http-port=${INSTANCE_1_PORT}`,
  ]);
  const ready1 = await waitForHealth(INSTANCE_1_PORT, 20000);
  check(
    "la instancia 1 arranca en HTTP con los flags --transport/--http-port",
    ready1,
    "sin respuesta en /health tras 20 s",
  );
  if (!ready1) return;

  await checkStreamableInstance(INSTANCE_1_PORT);

  console.log(
    `\nInstancia 2: MCP_TRANSPORT=http + MCP_HTTP_TOKEN en el entorno, puerto ${INSTANCE_2_PORT} (sin flags)\n`,
  );
  const instance2 = startInstance(
    "instance-2",
    {
      MCP_TRANSPORT: "http",
      MCP_HTTP_PORT: String(INSTANCE_2_PORT),
      MCP_HTTP_TOKEN: INSTANCE_2_TOKEN,
    },
    [],
  );
  const ready2 = await waitForHealth(INSTANCE_2_PORT, 20000);
  check(
    "la instancia 2 arranca con MCP_TRANSPORT=http desde el entorno",
    ready2,
    "sin respuesta en /health tras 20 s",
  );
  if (ready2) {
    await checkTokenInstance(INSTANCE_2_PORT);
    instance2.child.stdin.end();
    await delay(500);
    const healthAfterStdin = await httpRequest(INSTANCE_2_PORT, "GET", "/health");
    check(
      "cerrar stdin no tumba el modo http (/health sigue 200)",
      healthAfterStdin.status === 200,
      `status ${healthAfterStdin.status}`,
    );
  }

  console.log("\n=== Cierre ===\n");
  const stopped1 = await stopInstance(instance1);
  const stopped2 = await stopInstance(instance2);
  check("las dos instancias terminan tras SIGTERM (sin quedarse colgadas)", stopped1 && stopped2);

  if (failures > 0) {
    printStderrTail(instance1, 12);
    printStderrTail(instance2, 12);
  }
}

main()
  .catch((error) => {
    failures++;
    console.error(`\n❌ Error inesperado durante la verificación: ${error instanceof Error ? error.message : String(error)}`);
  })
  .then(async () => {
    for (const instance of running) await stopInstance(instance);
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      check("la carpeta temporal se limpia", false, String(error));
    }

    console.log(
      failures === 0
        ? "\n✅ El servidor MCP habla HTTP correctamente (Streamable HTTP + HTTP+SSE).\n"
        : `\n❌ ${failures} comprobación(es) fallaron.\n`,
    );
    process.exit(failures === 0 ? 0 : 1);
  });
