import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(SCRIPTS_DIR, "..");
const ROOT_DIR = path.resolve(APP_DIR, "..", "..");
const SERVER_DIR = path.join(ROOT_DIR, "packages", "server");
const WEB_DIR = path.join(ROOT_DIR, "packages", "web");
const RUNTIME_DIR = path.join(APP_DIR, "runtime");
const SERVER_TARGET = path.join(RUNTIME_DIR, "server");
const WEB_TARGET = path.join(RUNTIME_DIR, "web");
const SERVER_PORT = 7531;
const WEB_PORT = 3090;
const BACKEND_URL = `http://localhost:${SERVER_PORT}`;
const DROPPED_WEB_PACKAGES = ["sharp", "@img", "@emnapi"];

function log(message) {
  console.log(`[build] ${message}`);
}

function fail(message) {
  throw new Error(`[build] ${message}`);
}

function copyDirectory(source, target) {
  fs.cpSync(source, target, { recursive: true, force: true });
}

function getDirectorySize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(filePath);
      } else if (entry.isFile()) {
        try {
          total += fs.statSync(filePath).size;
        } catch {
        }
      }
    }
  }
  return total;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateArtifacts() {
  const missing = [];
  if (!fs.existsSync(path.join(SERVER_DIR, "dist", "app.js"))) missing.push("packages/server/dist/app.js");
  if (!fs.existsSync(path.join(SERVER_DIR, "dist", "desktop", "Bootstrap.js"))) {
    missing.push("packages/server/dist/desktop/Bootstrap.js");
  }
  if (!fs.existsSync(path.join(WEB_DIR, ".next", "standalone"))) missing.push("packages/web/.next/standalone");
  if (!fs.existsSync(path.join(WEB_DIR, ".next", "static"))) missing.push("packages/web/.next/static");
  if (!fs.existsSync(path.join(SERVER_DIR, "prisma", "migrations"))) missing.push("packages/server/prisma/migrations");
  if (missing.length > 0) {
    fail(
      `Faltan artefactos de compilación (${missing.join(", ")}). ` +
        "Ejecuta `npm run build` completo desde la raíz del monorepo " +
        "(turbo compila server y web antes de ensamblar este paquete).",
    );
  }
}

function readRootPackage() {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf8"));
}

function readRootName() {
  const envPath = path.join(ROOT_DIR, ".env");
  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith("NAME=")) continue;
      let value = line.slice("NAME=".length).trim();
      const quote = value[0];
      if (quote === '"' || quote === "'") {
        const closing = value.indexOf(quote, 1);
        value = closing === -1 ? value.slice(1) : value.slice(1, closing);
      }
      if (value) return value;
    }
  } catch {
  }
  return "Packet Tools AI";
}

function locateWebServer(webBase) {
  const candidates = [];
  const pending = [webBase];
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
    fail(`No se encontró server.js del frontend dentro de ${webBase}.`);
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

function pruneWebTarget() {
  const nodeModulesDir = path.join(WEB_TARGET, "node_modules");
  for (const name of DROPPED_WEB_PACKAGES) {
    const target = path.join(nodeModulesDir, ...name.split("/"));
    if (!fs.existsSync(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    log(`Se omite "${name}" del frontend empaquetado (se resuelve por la declaración de dependencias).`);
  }
}

function writeBuildInfo(version) {
  const info = {
    name: readRootName(),
    version,
    serverPort: SERVER_PORT,
    webPort: WEB_PORT,
    backendUrl: BACKEND_URL,
  };
  fs.writeFileSync(path.join(APP_DIR, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`, "utf8");
  return info;
}

function reportSizes(webDir) {
  const rows = [
    ["runtime (total)", RUNTIME_DIR],
    ["server/dist", path.join(SERVER_TARGET, "dist")],
    ["server/migrations", path.join(SERVER_TARGET, "migrations")],
    ["web/.next", path.join(webDir, ".next")],
    ["web/node_modules", path.join(WEB_TARGET, "node_modules")],
  ];
  console.log("\n[build] Resumen de tamaños:");
  for (const [label, dirPath] of rows) {
    if (!fs.existsSync(dirPath)) continue;
    console.log(`  ${label.padEnd(22)} ${formatMB(getDirectorySize(dirPath))}`);
  }
}

async function main() {
  validateArtifacts();
  const rootPackage = readRootPackage();
  const version = rootPackage.version || "0.0.0";
  log(`Limpiando ${RUNTIME_DIR}...`);
  fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
  fs.mkdirSync(SERVER_TARGET, { recursive: true });
  log("Copiando packages/server/dist -> runtime/server/dist...");
  copyDirectory(path.join(SERVER_DIR, "dist"), path.join(SERVER_TARGET, "dist"));
  log("Copiando packages/server/prisma/migrations -> runtime/server/migrations...");
  copyDirectory(path.join(SERVER_DIR, "prisma", "migrations"), path.join(SERVER_TARGET, "migrations"));
  fs.writeFileSync(
    path.join(SERVER_TARGET, "package.json"),
    `${JSON.stringify({ name: "packet-tools-server", version, private: true, type: "commonjs" }, null, 2)}\n`,
    "utf8",
  );
  log("Copiando packages/web/.next/standalone -> runtime/web...");
  copyDirectory(path.join(WEB_DIR, ".next", "standalone"), WEB_TARGET);
  const serverJs = locateWebServer(WEB_TARGET);
  const webDir = path.dirname(serverJs);
  log(`Entrypoint del frontend: ${path.relative(RUNTIME_DIR, serverJs)}`);
  log("Copiando .next/static y public al directorio del standalone...");
  copyDirectory(path.join(WEB_DIR, ".next", "static"), path.join(webDir, ".next", "static"));
  const publicSource = path.join(WEB_DIR, "public");
  if (fs.existsSync(publicSource)) {
    copyDirectory(publicSource, path.join(webDir, "public"));
  } else {
    log("ADVERTENCIA: packages/web/public no existe; se omite.");
  }
  pruneWebTarget();
  const buildInfo = writeBuildInfo(version);
  log(
    `build-info.json: name="${buildInfo.name}" version="${buildInfo.version}" ` +
      `serverPort=${buildInfo.serverPort} webPort=${buildInfo.webPort}`,
  );
  reportSizes(webDir);
  log("Runtime listo en runtime/.");
}

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
