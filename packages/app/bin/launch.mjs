#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_DIR = path.join(PACKAGE_DIR, "runtime");
const DEFAULT_NAME = "Packet Tools AI";
const DEFAULT_SERVER_PORT = 7531;
const DEFAULT_WEB_PORT = 3090;
const MIN_NODE_MAJOR = 20;
const BOOTSTRAP_TIMEOUT_MS = 120000;
const SERVER_TIMEOUT_MS = 60000;
const WEB_TIMEOUT_MS = 90000;
const children = new Map();
let isClosing = false;

function log(message) {
  console.log(`[app] ${message}`);
}

function fail(message, logPath) {
  console.error(`\n ${message}\n`);
  if (logPath) {
    console.error(`Últimas líneas de ${logPath}:\n${readLastLines(logPath)}\n`);
  }
  stop(1);
}

function readLastLines(logPath, limit = 40) {
  try {
    const lines = fs.readFileSync(logPath, "utf8").trimEnd().split(/\r?\n/);
    return lines.slice(-limit).join("\n");
  } catch {
    return "(no hay log disponible)";
  }
}

function requireNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < MIN_NODE_MAJOR) {
    console.error(
      `Packet Tools AI necesita Node >= ${MIN_NODE_MAJOR}. ` +
        `Versión detectada: ${process.versions.node}. Actualiza Node y vuelve a intentarlo.`,
    );
    process.exit(1);
  }
}

function readBuildInfo() {
  const defaults = {
    name: DEFAULT_NAME,
    version: "0.0.0",
    serverPort: DEFAULT_SERVER_PORT,
    webPort: DEFAULT_WEB_PORT,
    backendUrl: `http://localhost:${DEFAULT_SERVER_PORT}`,
  };
  const filePath = path.join(PACKAGE_DIR, "build-info.json");
  try {
    const info = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { ...defaults, ...info };
  } catch (error) {
    log(`No se pudo leer ${filePath}; se usan valores por defecto (${error.message}).`);
    return defaults;
  }
}

function parsePort(rawValue) {
  const value = Number(rawValue);
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : null;
}

function resolveDataDir() {
  const fromEnv = (process.env.PACKET_TOOLS_APP_DATA_DIR ?? "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), ".packet-tools", "app");
}

function getJwtSecret(userDir) {
  const secretPath = path.join(userDir, ".jwt-secret");
  try {
    const existing = fs.readFileSync(secretPath, "utf8").trim();
    if (existing) return existing;
  } catch {
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

function testListen(port, host) {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.unref();
    testServer.once("error", (error) => resolve(error.code ?? "ERROR"));
    testServer.once("listening", () => testServer.close(() => resolve(null)));
    if (host) testServer.listen(port, host);
    else testServer.listen(port);
  });
}

async function isPortAvailable(port) {
  const direct = await testListen(port);
  if (direct === null) return true;
  if (direct === "EADDRNOTAVAIL" || direct === "EAFNOSUPPORT" || direct === "EACCES") {
    return (await testListen(port, "127.0.0.1")) === null;
  }
  return false;
}

function launchChild(name, script, workDir, envVars, logsDir) {
  const logPath = path.join(logsDir, `${name}.log`);
  fs.appendFileSync(logPath, `\n===== ${new Date().toISOString()} ${name} =====\n`, "utf8");
  const appendLog = (text) => {
    try {
      fs.appendFileSync(logPath, text, "utf8");
    } catch {
    }
  };
  log(`Iniciando "${name}": ${script}`);
  const childProcess = spawn(process.execPath, [script], {
    cwd: workDir,
    env: { ...process.env, ...envVars },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  childProcess.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data.toString()}`);
    appendLog(data);
  });
  childProcess.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data.toString()}`);
    appendLog(data);
  });
  childProcess.on("error", (error) => {
    appendLog(`[error] ${error.stack || error.message}\n`);
    if (!isClosing) fail(`No se pudo iniciar "${name}": ${error.message}`, logPath);
  });
  childProcess.on("exit", (code, signal) => {
    appendLog(`[salida] código=${code} señal=${signal}\n`);
    if (isClosing || name === "bootstrap") return;
    fail(`El proceso "${name}" terminó de forma inesperada (código ${code}).`, logPath);
  });
  const entry = { childProcess, logPath };
  children.set(name, entry);
  return entry;
}

function waitForExit(entry, name, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`El proceso "${name}" no terminó en ${timeoutMs / 1000} s.`));
    }, timeoutMs);
    entry.childProcess.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`El proceso "${name}" terminó con código ${code}.`));
    });
    entry.childProcess.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function waitForHttp(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const attempt = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Tiempo de espera agotado esperando ${url}.`));
        return;
      }
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve(response.statusCode);
        } else {
          setTimeout(attempt, 500);
        }
      });
      request.setTimeout(3000, () => request.destroy(new Error("timeout")));
      request.on("error", () => {
        setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

function locateWebServer(baseDir) {
  const candidates = [];
  const pending = [baseDir];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        pending.push(filePath);
      } else if (entry.isFile() && entry.name === "server.js") {
        candidates.push(filePath);
      }
    }
  }
  if (candidates.length === 0) {
    throw new Error(`No se encontró server.js del frontend dentro de ${baseDir}.`);
  }
  const scorePath = (filePath) => {
    let score = 0;
    if (fs.existsSync(path.join(path.dirname(filePath), ".next"))) score += 10;
    if (filePath.endsWith(path.join("packages", "web", "server.js"))) score += 5;
    return score;
  };
  candidates.sort((a, b) => scorePath(b) - scorePath(a));
  return candidates[0];
}

function openBrowser(url) {
  try {
    const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    const browserProcess = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
    browserProcess.unref();
    log(`Abriendo el navegador en ${url}`);
  } catch (error) {
    console.warn(`[app] No se pudo abrir el navegador automáticamente: ${error.message}`);
    console.warn(`[app] Abre manualmente ${url}`);
  }
}

function killChildren() {
  for (const [name, entry] of children) {
    try {
      if (entry.childProcess.exitCode === null && !entry.childProcess.killed) {
        log(`Deteniendo proceso "${name}"...`);
        entry.childProcess.kill();
      }
    } catch (error) {
      console.error(`[app] No se pudo detener "${name}": ${error.message}`);
    }
  }
  children.clear();
}

function stop(exitCode) {
  if (isClosing) return;
  isClosing = true;
  killChildren();
  process.exit(exitCode);
}

async function main() {
  requireNodeVersion();
  const dataDir = resolveDataDir();
  const logsDir = path.join(dataDir, "logs");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "uploads", "documents"), { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  const buildInfo = readBuildInfo();
  const serverPort = parsePort(process.env.SERVER_PORT) ?? (Number(buildInfo.serverPort) || DEFAULT_SERVER_PORT);
  const webPort = parsePort(process.env.PORT) ?? (Number(buildInfo.webPort) || DEFAULT_WEB_PORT);
  const serverEntry = path.join(RUNTIME_DIR, "server", "dist", "app.js");
  const bootstrapEntry = path.join(RUNTIME_DIR, "server", "dist", "desktop", "Bootstrap.js");
  const migrationsDir = path.join(RUNTIME_DIR, "server", "migrations");
  const webBase = path.join(RUNTIME_DIR, "web");
  const missing = [
    [bootstrapEntry, "arranque del servidor"],
    [serverEntry, "API del servidor"],
    [migrationsDir, "migraciones de la base de datos"],
    [webBase, "frontend compilado"],
  ].filter(([target]) => !fs.existsSync(target));
  if (missing.length > 0) {
    console.error(
      `La instalación está incompleta: falta ${missing.map(([, label]) => label).join(", ")}. ` +
        "Reinstala el paquete con `npx -y --package=@packet-tools-ai/app packet-tools-ai-app`.",
    );
    process.exit(1);
  }
  log(`Datos de usuario: ${dataDir}`);
  for (const port of [serverPort, webPort]) {
    if (!(await isPortAvailable(port))) {
      fail(
        `El puerto ${port} ya está en uso por otro programa.\n` +
          "Ciérralo y vuelve a ejecutar Packet Tools AI.",
      );
      return;
    }
  }
  const dbPath = path.join(dataDir, "packet_tool_database.db");
  const jwtSecret = getJwtSecret(dataDir);
  log(`Base de datos: ${dbPath}`);
  const bootstrapChild = launchChild(
    "bootstrap",
    bootstrapEntry,
    dataDir,
    {
      NODE_ENV: "production",
      DATABASE_URL: `file:${dbPath}`,
      MIGRATIONS_DIR: migrationsDir,
      NAME: buildInfo.name,
      VERSION: String(buildInfo.version),
    },
    logsDir,
  );
  try {
    await waitForExit(bootstrapChild, "bootstrap", BOOTSTRAP_TIMEOUT_MS);
  } catch (error) {
    fail(`Error al preparar la base de datos: ${error.message}`, bootstrapChild.logPath);
    return;
  }
  const serverChild = launchChild(
    "server",
    serverEntry,
    dataDir,
    {
      NODE_ENV: "production",
      SERVER_PORT: String(serverPort),
      DATABASE_URL: `file:${dbPath}`,
      JWT_SECRET: jwtSecret,
      NAME: buildInfo.name,
      VERSION: String(buildInfo.version),
    },
    logsDir,
  );
  try {
    await waitForHttp(`http://127.0.0.1:${serverPort}/api/health`, SERVER_TIMEOUT_MS);
    log(`API disponible en http://localhost:${serverPort}`);
  } catch (error) {
    fail(`El servidor no respondió: ${error.message}`, serverChild.logPath);
    return;
  }
  let webScript;
  try {
    webScript = locateWebServer(webBase);
  } catch (error) {
    fail(error.message);
    return;
  }
  const webChild = launchChild(
    "web",
    webScript,
    path.dirname(webScript),
    {
      NODE_ENV: "production",
      PORT: String(webPort),
      HOSTNAME: "::",
    },
    logsDir,
  );
  const webUrl = `http://localhost:${webPort}`;
  try {
    await waitForHttp(`${webUrl}/`, WEB_TIMEOUT_MS);
  } catch (error) {
    fail(`El frontend no respondió: ${error.message}`, webChild.logPath);
    return;
  }
  const shouldOpen = process.env.PACKET_TOOLS_NO_OPEN !== "1";
  if (shouldOpen) openBrowser(webUrl);
  console.log(`\n✅ Web corriendo en ${webUrl} (Ctrl+C para detener)\n`);
  if (!shouldOpen && !process.stdin.isTTY) {
    process.stdin.resume();
    process.stdin.on("end", () => stop(0));
    process.stdin.on("close", () => stop(0));
    if (process.stdin.readableEnded) stop(0);
  }
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
process.on("SIGBREAK", () => stop(0));
process.on("exit", killChildren);
process.on("uncaughtException", (error) => {
  console.error("[app] Excepción no controlada:", error);
  stop(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[app] Rechazo no controlado:", reason);
  stop(1);
});

main().catch((error) => {
  fail(error.message ?? String(error));
});
