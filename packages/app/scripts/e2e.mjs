import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(SCRIPTS_DIR, "..");
const SERVER_PORT = 7531;
const WEB_PORT = 3090;
const LAUNCH_TIMEOUT_MS = 180000;
const EXIT_TIMEOUT_MS = 30000;

function log(message) {
  console.log(`[e2e] ${message}`);
}

function fail(message) {
  throw new Error(`[e2e] ${message}`);
}

function runNpm(args, cwd) {
  const isWindows = process.platform === "win32";
  const command = isWindows ? "npm.cmd" : "npm";
  const binary = isWindows ? process.env.ComSpec || "cmd.exe" : command;
  const finalArgs = isWindows ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args;
  const result = spawnSync(binary, finalArgs, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error) fail(`No se pudo ejecutar npm ${args.join(" ")}: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`npm ${args.join(" ")} terminó con código ${result.status}:\n${result.stdout}\n${result.stderr}`);
  }
  return String(result.stdout ?? "");
}

function testListen(port, host) {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.unref();
    testServer.once("error", () => resolve(false));
    testServer.once("listening", () => testServer.close(() => resolve(true)));
    if (host) testServer.listen(port, host);
    else testServer.listen(port);
  });
}

function getStatus(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => resolve({ statusCode: response.statusCode, headers: response.headers, body }));
    });
    request.setTimeout(5000, () => request.destroy(new Error("timeout")));
    request.on("error", () => resolve(null));
  });
}

async function waitForStatus(url, predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await getStatus(url);
    if (response && predicate(response)) return response;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  fail(`Tiempo de espera agotado esperando ${label} (${url}).`);
}

function listOrphanPids(fragment) {
  if (process.platform !== "win32") return [];
  const escaped = fragment.replace(/'/g, "''");
  const script = [
    "$pids = Get-CimInstance Win32_Process -Filter \"Name='node.exe'\"",
    `  | Where-Object { $_.CommandLine -like '*${escaped}*' }`,
    "  | ForEach-Object { $_.ProcessId }",
    "$pids -join ','",
  ].join(" ");
  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" });
  const output = String(result.stdout ?? "").trim();
  return output ? output.split(",").map((value) => Number(value)) : [];
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`El lanzador no terminó en ${timeoutMs / 1000} s.`)), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

async function main() {
  if (!fs.existsSync(path.join(APP_DIR, "runtime", "server", "dist", "app.js"))) {
    fail("Falta runtime/. Ejecuta `npm run build` desde la raíz del monorepo antes de la prueba e2e.");
  }
  for (const port of [SERVER_PORT, WEB_PORT]) {
    if (!(await testListen(port))) {
      fail(`El puerto ${port} está ocupado; libera los puertos ${SERVER_PORT} y ${WEB_PORT} antes de la prueba.`);
    }
  }
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "packet-tools-app-e2e-"));
  log(`Directorio temporal: ${tmpRoot}`);
  log("Empaquetando (npm pack)...");
  runNpm(["pack", "--pack-destination", tmpRoot], APP_DIR);
  const tarballName = fs.readdirSync(tmpRoot).find((name) => name.endsWith(".tgz"));
  if (!tarballName) fail("npm pack no generó ningún .tgz.");
  const tarballPath = path.join(tmpRoot, tarballName);
  const tarballSize = fs.statSync(tarballPath).size;
  log(`Tarball: ${tarballName} (${(tarballSize / 1048576).toFixed(2)} MB)`);
  const prefixDir = path.join(tmpRoot, "prefix");
  log(`Instalando globalmente en prefijo aislado (${prefixDir})...`);
  runNpm(["install", "-g", "--prefix", prefixDir, tarballPath], tmpRoot);
  const installedEntry = path.join(prefixDir, "node_modules", "@packet-tools-ai", "app", "bin", "launch.mjs");
  if (!fs.existsSync(installedEntry)) fail(`La instalación no dejó el binario esperado en ${installedEntry}.`);
  const dataDir = path.join(tmpRoot, "data");
  const env = { ...process.env, PACKET_TOOLS_NO_OPEN: "1", PACKET_TOOLS_APP_DATA_DIR: dataDir };
  delete env.SERVER_PORT;
  delete env.PORT;
  log("Lanzando packet-tools-ai-app...");
  const child = spawn(process.execPath, [installedEntry], { env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk.toString()));
  child.stderr.on("data", (chunk) => (output += chunk.toString()));
  let exitCode = null;
  child.once("exit", (code) => {
    exitCode = code;
  });
  try {
    const health = await waitForStatus(
      `http://127.0.0.1:${SERVER_PORT}/api/health`,
      (response) => response.statusCode === 200,
      LAUNCH_TIMEOUT_MS,
      "el backend",
    );
    log(`Backend OK: ${health.statusCode} ${health.body.trim()}`);
    const web = await waitForStatus(
      `http://localhost:${WEB_PORT}/`,
      (response) => response.statusCode < 400,
      LAUNCH_TIMEOUT_MS,
      "el frontend",
    );
    let page = web;
    if (web.statusCode >= 300 && web.headers.location) {
      const location = web.headers.location.startsWith("http")
        ? web.headers.location
        : `http://localhost:${WEB_PORT}${web.headers.location}`;
      page = await waitForStatus(
        location,
        (response) => response.statusCode === 200 && String(response.headers["content-type"]).includes("text/html"),
        30000,
        "la página principal",
      );
    }
    if (page.statusCode !== 200 || !String(page.headers["content-type"]).includes("text/html")) {
      fail(`El frontend no sirvió HTML (código ${page.statusCode}).`);
    }
    log(`Frontend OK: / -> ${web.statusCode}${web.headers.location ? ` (${web.headers.location})` : ""} -> ${page.statusCode} ${page.headers["content-type"]}`);
    const deadline = Date.now() + 30000;
    while (!output.includes(`Web corriendo en http://localhost:${WEB_PORT}`) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!output.includes(`Web corriendo en http://localhost:${WEB_PORT}`)) {
      fail(`No se imprimió el aviso de arranque. Salida:\n${output}`);
    }
    log("Aviso de arranque verificado.");
    const dbPath = path.join(dataDir, "packet_tool_database.db");
    if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) fail(`No se creó la base SQLite en ${dbPath}.`);
    log(`Base SQLite OK: ${(fs.statSync(dbPath).size / 1024).toFixed(0)} KB`);
    const jwtSecret = fs.readFileSync(path.join(dataDir, ".jwt-secret"), "utf8").trim();
    if (!/^[0-9a-f]{64}$/.test(jwtSecret)) fail("El JWT secret persistido no tiene 64 hex.");
    log("JWT secret OK (64 hex).");
    for (const name of ["bootstrap", "server", "web"]) {
      const logPath = path.join(dataDir, "logs", `${name}.log`);
      if (!fs.existsSync(logPath)) fail(`No se creó el log ${logPath}.`);
    }
    log("Logs OK (bootstrap/server/web).");
    if (exitCode !== null) fail(`El lanzador terminó antes de tiempo (código ${exitCode}). Salida:\n${output}`);
    log("Cerrando stdin (parada limpia)...");
    child.stdin.end();
    const code = await waitForExit(child, EXIT_TIMEOUT_MS);
    if (code !== 0) fail(`Salida esperada 0, recibida ${code}. Salida:\n${output}`);
    log("Salida limpia con código 0.");
    for (const port of [SERVER_PORT, WEB_PORT]) {
      const deadlineFree = Date.now() + 10000;
      while (Date.now() < deadlineFree && !(await testListen(port))) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!(await testListen(port))) fail(`El puerto ${port} quedó ocupado tras la parada.`);
    }
    log(`Puertos ${SERVER_PORT} y ${WEB_PORT} libres.`);
    const orphans = listOrphanPids(tmpRoot);
    if (orphans.length > 0) {
      fail(`Quedaron procesos huérfanos (PIDs: ${orphans.join(", ")}). Salida:\n${output}`);
    }
    log("Sin procesos huérfanos.");
    console.log("\n[e2e] TODO OK");
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch (error) {
    console.error(`\n${error.message ?? error}`);
    const tail = output.split(/\r?\n/).slice(-30).join("\n");
    if (tail.trim()) console.error(`[e2e] Últimas líneas del lanzador:\n${tail}`);
    for (const name of ["bootstrap", "server", "web"]) {
      const logPath = path.join(dataDir, "logs", `${name}.log`);
      if (!fs.existsSync(logPath)) continue;
      const lines = fs.readFileSync(logPath, "utf8").trimEnd().split(/\r?\n/).slice(-20).join("\n");
      console.error(`[e2e] ${name}.log (últimas líneas):\n${lines}`);
    }
    if (exitCode === null) {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { encoding: "utf8" });
      } else {
        try {
          child.kill("SIGKILL");
        } catch {
        }
      }
    }
    console.error(`[e2e] Directorio temporal conservado para diagnóstico: ${tmpRoot}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
