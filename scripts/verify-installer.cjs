#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "bin", "cli.mjs");
const postinstallPath = path.join(root, "bin", "postinstall.mjs");
const installMcpPath = path.join(root, "scripts", "install-mcp.mjs");

let failures = 0;
const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "packet-tools-verify-"));
const sandboxHome = path.join(tmpBase, "home");
const sandboxWork = path.join(tmpBase, "work");
const launcherStub = path.join(tmpBase, "stub-launcher.mjs");

fs.mkdirSync(sandboxHome, { recursive: true });
fs.mkdirSync(sandboxWork, { recursive: true });
fs.writeFileSync(launcherStub, 'console.log("WEB READY");\n', "utf8");

process.env.PACKET_TOOLS_HOME = sandboxHome;
process.chdir(sandboxWork);

const baseEnv = {
  ...process.env,
  PACKET_TOOLS_HOME: sandboxHome,
  PACKET_TOOLS_NO_OPEN: "1",
  PACKET_TOOLS_APP_LAUNCHER: launcherStub,
  PACKET_TOOLS_SKIP_POSTINSTALL: "",
  PACKET_TOOLS_LANG: "es",
  CI: "",
};

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`✅ ${name}`);
  } else {
    failures++;
    console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function runNode(script, args, input, envOverrides = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: sandboxWork,
    env: { ...baseEnv, ...envOverrides },
    input,
    encoding: "utf8",
    timeout: 60000,
  });
}

function describe(result) {
  return `status=${result.status} signal=${result.signal ?? ""} ${JSON.stringify((result.stdout || "").slice(-160))}`;
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const config = await import(pathToFileURL(path.join(root, "bin", "config.mjs")).href);
  const agentsModule = await import(pathToFileURL(path.join(root, "bin", "lib", "agents.mjs")).href);
  const agents = agentsModule.listAgents();
  const agentById = (id) => agents.find((agent) => agent.id === id);
  const indexOf = (id) => agents.findIndex((agent) => agent.id === id) + 1;
  const insideSandbox = (file) => path.resolve(file).startsWith(path.resolve(tmpBase) + path.sep);

  console.log("Verificando el instalador de Packet Tools...\n");

  let result = runNode(cliPath, ["--help"], "");
  const help = `${result.stdout}${result.stderr}`.toLowerCase();
  check("--help responde con el menú de ayuda (exit 0)", result.status === 0, describe(result));
  check(
    "--help menciona Web, MCP y Desktop",
    help.includes("web") && help.includes("mcp") && help.includes("desktop"),
  );
  check("--help menciona el bin del servidor MCP", help.includes("packet-tools-mcp"));

  result = runNode(cliPath, ["--version"], "");
  check(
    "--version imprime la versión del package.json",
    result.status === 0 && result.stdout.trim() === pkg.version,
    `esperado=${pkg.version} ${describe(result)}`,
  );

  result = runNode(cliPath, [], "1\n4\n");
  check("Menú: Salir (4) termina con exit 0", result.status === 0, describe(result));
  check(
    "Menú: Salir no escribe ninguna configuración",
    !fs.existsSync(path.join(sandboxWork, ".mcp.json")) &&
      !fs.existsSync(path.join(sandboxHome, ".codex")) &&
      !fs.existsSync(path.join(sandboxHome, ".cursor")),
  );

  const claudeCode = agentById("claude-code");
  const cursor = agentById("cursor");
  const codex = agentById("codex");
  const selection = [indexOf("claude-code"), indexOf("cursor"), indexOf("codex")].join(",");
  result = runNode(cliPath, [], `1\n2\n${selection}\n`);
  check("Menú: MCP con multiselección termina con exit 0", result.status === 0, describe(result));
  check("Menú: MCP imprime el cierre esperado", result.stdout.includes("✅ MCP instalado"));
  check(
    "Menú: MCP reporta los agentes elegidos",
    result.stdout.includes("Claude Code") && result.stdout.includes("Cursor") && result.stdout.includes("Codex CLI"),
  );

  const jsonChecks = [
    ["Claude Code (.mcp.json)", claudeCode],
    ["Cursor (mcp.json)", cursor],
  ];
  for (const [label, agent] of jsonChecks) {
    let entry = null;
    try {
      entry = JSON.parse(fs.readFileSync(agent.file, "utf8")).mcpServers["packet-tools"];
    } catch {}
    check(
      `Menú: ${label} contiene la entrada correcta`,
      Boolean(entry) &&
        entry.command === "npx" &&
        JSON.stringify(entry.args) === JSON.stringify(config.MCP_NPX_ARGS),
      agent.file,
    );
  }
  check(
    "Menú: los ficheros JSON quedan dentro de la carpeta temporal",
    insideSandbox(claudeCode.file) && insideSandbox(cursor.file),
  );

  let toml = "";
  try {
    toml = fs.readFileSync(codex.file, "utf8");
  } catch {}
  const expectedArgs = config.MCP_NPX_ARGS.map((arg) => JSON.stringify(arg)).join(", ");
  check(
    "Menú: Codex CLI (config.toml) contiene el bloque TOML",
    toml.includes("[mcp_servers.packet-tools]") &&
      toml.includes('command = "npx"') &&
      toml.includes(`args = [${expectedArgs}]`),
    codex.file,
  );
  check("Menú: el TOML de Codex queda dentro de la carpeta temporal", insideSandbox(codex.file));

  result = runNode(cliPath, ["--mcp"], "todos\n");
  check("--mcp con \"todos\" termina con exit 0", result.status === 0, describe(result));
  check("--mcp con \"todos\" imprime el cierre esperado", result.stdout.includes("✅ MCP instalado"));
  const allConfigured = ["claude-desktop", "windsurf", "lm-studio", "opencode", "vscode"].every((id) =>
    fs.existsSync(agentById(id).file),
  );
  check("--mcp con \"todos\" configura el resto de agentes en el sandbox", allConfigured);

  result = runNode(cliPath, [], "1\n3\n");
  check("Menú: Desktop termina con exit 0", result.status === 0, describe(result));
  check(
    "Menú: Desktop imprime la URL de releases",
    result.stdout.includes(config.RELEASES_URL),
    describe(result),
  );

  result = runNode(cliPath, [], "1\n1\n");
  check(
    "Menú: Web ejecuta el launcher y termina con exit 0",
    result.status === 0 && result.stdout.includes("WEB READY"),
    describe(result),
  );
  result = runNode(cliPath, ["--web"], "");
  check(
    "--web directo ejecuta el launcher y termina con exit 0",
    result.status === 0 && result.stdout.includes("WEB READY"),
    describe(result),
  );

  const installedRoot = path.join(tmpBase, "installed");
  fs.mkdirSync(path.join(installedRoot, "bin", "lib"), { recursive: true });
  fs.copyFileSync(postinstallPath, path.join(installedRoot, "bin", "postinstall.mjs"));
  fs.copyFileSync(path.join(root, "bin", "config.mjs"), path.join(installedRoot, "bin", "config.mjs"));
  fs.copyFileSync(path.join(root, "bin", "lib", "prompt.mjs"), path.join(installedRoot, "bin", "lib", "prompt.mjs"));
  fs.copyFileSync(path.join(root, "bin", "lib", "i18n.mjs"), path.join(installedRoot, "bin", "lib", "i18n.mjs"));
  fs.copyFileSync(path.join(root, "bin", "lib", "paths.mjs"), path.join(installedRoot, "bin", "lib", "paths.mjs"));
  fs.writeFileSync(
    path.join(installedRoot, "package.json"),
    `${JSON.stringify({ name: "@packet-tools-ai/root", version: "0.0.0", type: "module" }, null, 2)}\n`,
    "utf8",
  );

  const bannerCommand = `npx -y --package=${config.ROOT_PACKAGE} packet-tools-ai`;
  result = runNode(path.join(installedRoot, "bin", "postinstall.mjs"), [], "");
  check(
    "postinstall instalado (sin TTY) imprime el banner con el comando explícito y exit 0",
    result.status === 0 &&
      result.stdout.includes("Packet Tools instalado") &&
      result.stdout.includes(bannerCommand),
    describe(result),
  );

  result = runNode(postinstallPath, [], "");
  check(
    "postinstall en el repo de desarrollo sale silencioso (exit 0, sin salida)",
    result.status === 0 && `${result.stdout}${result.stderr}`.trim() === "",
    describe(result),
  );

  result = runNode(installMcpPath, [], "");
  check("scripts/install-mcp.mjs sigue funcionando (exit 0)", result.status === 0, describe(result));
  check(
    "scripts/install-mcp.mjs usa el home temporal",
    fs.existsSync(claudeCode.file) && insideSandbox(claudeCode.file),
  );

  const prefsDir = path.join(sandboxHome, ".packet-tools");
  const prefsFile = path.join(prefsDir, "preferences.json");
  const readPrefs = () => {
    try {
      return JSON.parse(fs.readFileSync(prefsFile, "utf8"));
    } catch {
      return null;
    }
  };

  fs.rmSync(prefsDir, { recursive: true, force: true });
  result = runNode(cliPath, [], "1\n4\n");
  check(
    "Menú: pregunta el idioma (bilingüe) y sigue en español",
    result.status === 0 &&
      result.stdout.includes("Selecciona idioma / Select language") &&
      result.stdout.includes("¿Qué quieres instalar?") &&
      result.stdout.includes("Hasta luego."),
    describe(result),
  );
  check("Menú: guarda la preferencia de idioma es", readPrefs()?.lang === "es", `prefs=${JSON.stringify(readPrefs())}`);

  result = runNode(cliPath, [], "2\n4\n");
  check(
    "Menú: eligiendo English el menú se muestra en inglés",
    result.status === 0 &&
      result.stdout.includes("What do you want to install?") &&
      result.stdout.includes("See you soon."),
    describe(result),
  );
  check("Menú: actualiza la preferencia a en", readPrefs()?.lang === "en", `prefs=${JSON.stringify(readPrefs())}`);

  result = runNode(cliPath, ["--help"], "", { PACKET_TOOLS_LANG: "" });
  check(
    "Preferencia en guardada → --help en inglés",
    result.status === 0 && result.stdout.includes("Usage:") && result.stdout.includes("Interactive menu"),
    describe(result),
  );

  fs.rmSync(prefsDir, { recursive: true, force: true });
  result = runNode(cliPath, ["--help"], "", { PACKET_TOOLS_LANG: "en" });
  check(
    "PACKET_TOOLS_LANG=en → --help en inglés",
    result.status === 0 && result.stdout.includes("Usage:"),
    describe(result),
  );
  check("PACKET_TOOLS_LANG=en no escribe preferencias", !fs.existsSync(prefsFile), prefsFile);

  fs.mkdirSync(prefsDir, { recursive: true });
  fs.writeFileSync(prefsFile, `${JSON.stringify({ lang: "es" }, null, 2)}\n`, "utf8");
  result = runNode(cliPath, ["--lang", "en", "--help"], "", { PACKET_TOOLS_LANG: "" });
  check(
    "--lang en → --help en inglés y no modifica la preferencia",
    result.status === 0 && result.stdout.includes("Usage:") && readPrefs()?.lang === "es",
    describe(result),
  );
}

main()
  .then(() => {
    console.log("");
    if (failures === 0) {
      try {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      } catch {}
      console.log("✅ Instalador verificado.");
      process.exitCode = 0;
    } else {
      console.log(`❌ ${failures} comprobación(es) fallida(s). Sandbox: ${tmpBase}`);
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error(`❌ Error inesperado: ${error?.message ?? error}`);
    console.error(`   Sandbox: ${tmpBase}`);
    process.exitCode = 1;
  });
