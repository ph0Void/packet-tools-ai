import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { homeDir } from "./paths.mjs";

const LANGS = ["es", "en"];

const CATALOG = {
  es: {
    "menu.title": "Packet Tools AI — instalador (v{version})",
    "menu.question": "¿Qué quieres instalar?",
    "menu.web.label": "Web",
    "menu.web.hint": "instala y arranca la aplicación en tu equipo (se abre en el navegador)",
    "menu.mcp.label": "MCP",
    "menu.mcp.hint": "conecta Packet Tools a tus agentes de código (Claude, Cursor, OpenCode, VS Code, Codex…)",
    "menu.desktop.label": "Desktop",
    "menu.desktop.hint": "instalador de escritorio (Windows; descarga desde GitHub Releases)",
    "menu.exit.label": "Salir",
    "menu.goodbye": "Hasta luego.",
    "menu.cancelled": "Operación cancelada.",
    "prompt.default": " (por defecto)",
    "prompt.choice": "Elige una opción: ",
    "prompt.range": "Opción fuera de rango: {value}",
    "prompt.invalid": 'Opción no válida: "{value}"',
    "prompt.multi.hint": 'Escribe números separados por comas (ej: 1,3 · "todos"): ',
    "prompt.multi.none": "No elegiste ninguno.",
    "mcp.question": "¿En qué agentes quieres instalar el servidor MCP?",
    "mcp.detected": " (detectado)",
    "mcp.status.installed": "instalado",
    "mcp.status.already": "ya estaba",
    "mcp.status.skipped": "omitido ({reason})",
    "mcp.json.invalid": "JSON inválido",
    "mcp.done": "✅ MCP instalado en {count} agente(s): {names}. Reinicia cada agente para que cargue el servidor.",
    "mcp.none": "No se configuró ningún agente.",
    "mcp.manual": "Añade Packet Tools MCP a mano en tu agente con:",
    "web.starting": "Iniciando la aplicación web de Packet Tools...",
    "web.launcher.missing": "⚠ PACKET_TOOLS_APP_LAUNCHER no existe: {path}",
    "web.npx": "Arrancando la app web con npx ({package})...",
    "web.notPublished": "✗ La app web aún no está publicada en npm. Comando manual: {command}",
    "desktop.download": "Descarga el instalador de escritorio:",
    "desktop.windows": "Instalador disponible para Windows.",
    "desktop.other": "Aún no hay instalador para {platform} (solo Windows por ahora).",
    "help.title": "Packet Tools AI — instalador",
    "help.usage": "Uso:",
    "help.menu": "Menú interactivo (Web / MCP / Desktop)",
    "help.noGlobal": "Menú sin instalación global",
    "help.web": "Instala y arranca la aplicación web",
    "help.mcp": "Conecta Packet Tools a tus agentes de código",
    "help.desktop": "Descarga el instalador de escritorio (GitHub Releases)",
    "help.mcpServer": "Arranca el servidor MCP por stdio (bin: packet-tools-mcp)",
    "help.lang": "Cambia el idioma (es | en)",
    "help.help": "Muestra esta ayuda",
    "help.version": "Muestra la versión",
    "help.langNote": "Idioma: {lang} · cámbialo con --lang es|en o la variable PACKET_TOOLS_LANG",
    "help.docs": "Documentación: {url}",
    "flag.unknown": "Opción no reconocida: {args}",
    "postinstall.banner": "Packet Tools instalado ✓ — ejecuta: npx -y --package={package} packet-tools-ai (o simplemente packet-tools-ai si usaste -g) para elegir Web/MCP/Desktop.",
    "installMcp.title": "Packet Tools MCP — configuración automática",
    "installMcp.server": "Servidor: {command}",
    "installMcp.notDetected": "no detectado ({dir})",
    "installMcp.done": "Listo. {count} cliente(s) configurado(s).",
    "installMcp.restart": "Reinicia el cliente para que cargue el servidor MCP.",
    "installMcp.manual": "Si tu agente no aparece en la lista, añade a mano:",
    "installMcp.pt": "Recuerda: la integración de Packet Tracer requiere la extensión v1.1.0+.",
  },
  en: {
    "menu.title": "Packet Tools AI — installer (v{version})",
    "menu.question": "What do you want to install?",
    "menu.web.label": "Web",
    "menu.web.hint": "installs and starts the app on your machine (opens in the browser)",
    "menu.mcp.label": "MCP",
    "menu.mcp.hint": "connects Packet Tools to your coding agents (Claude, Cursor, OpenCode, VS Code, Codex…)",
    "menu.desktop.label": "Desktop",
    "menu.desktop.hint": "desktop installer (Windows; downloads from GitHub Releases)",
    "menu.exit.label": "Exit",
    "menu.goodbye": "See you soon.",
    "menu.cancelled": "Operation cancelled.",
    "prompt.default": " (default)",
    "prompt.choice": "Choose an option: ",
    "prompt.range": "Option out of range: {value}",
    "prompt.invalid": 'Invalid option: "{value}"',
    "prompt.multi.hint": 'Type numbers separated by commas (e.g. 1,3 · "all"): ',
    "prompt.multi.none": "You didn't select any.",
    "mcp.question": "Which agents do you want to install the MCP server into?",
    "mcp.detected": " (detected)",
    "mcp.status.installed": "installed",
    "mcp.status.already": "already there",
    "mcp.status.skipped": "skipped ({reason})",
    "mcp.json.invalid": "invalid JSON",
    "mcp.done": "✅ MCP installed in {count} agent(s): {names}. Restart each agent so it loads the server.",
    "mcp.none": "No agent was configured.",
    "mcp.manual": "Add Packet Tools MCP to your agent manually with:",
    "web.starting": "Starting the Packet Tools web app...",
    "web.launcher.missing": "⚠ PACKET_TOOLS_APP_LAUNCHER does not exist: {path}",
    "web.npx": "Starting the web app with npx ({package})...",
    "web.notPublished": "✗ The web app is not published on npm yet. Manual command: {command}",
    "desktop.download": "Download the desktop installer:",
    "desktop.windows": "Installer available for Windows.",
    "desktop.other": "No installer for {platform} yet (Windows only for now).",
    "help.title": "Packet Tools AI — installer",
    "help.usage": "Usage:",
    "help.menu": "Interactive menu (Web / MCP / Desktop)",
    "help.noGlobal": "Menu without a global install",
    "help.web": "Installs and starts the web app",
    "help.mcp": "Connects Packet Tools to your coding agents",
    "help.desktop": "Downloads the desktop installer (GitHub Releases)",
    "help.mcpServer": "Starts the MCP server over stdio (bin: packet-tools-mcp)",
    "help.lang": "Changes the language (es | en)",
    "help.help": "Shows this help",
    "help.version": "Shows the version",
    "help.langNote": "Language: {lang} · change it with --lang es|en or the PACKET_TOOLS_LANG environment variable",
    "help.docs": "Documentation: {url}",
    "flag.unknown": "Unknown option: {args}",
    "postinstall.banner": "Packet Tools installed ✓ — run: npx -y --package={package} packet-tools-ai (or simply packet-tools-ai if you installed it globally) to choose Web/MCP/Desktop.",
    "installMcp.title": "Packet Tools MCP — automatic configuration",
    "installMcp.server": "Server: {command}",
    "installMcp.notDetected": "not detected ({dir})",
    "installMcp.done": "Done. {count} client(s) configured.",
    "installMcp.restart": "Restart the client so it loads the MCP server.",
    "installMcp.manual": "If your agent is not listed, add it manually:",
    "installMcp.pt": "Remember: the Packet Tracer integration requires the extension v1.1.0+.",
  },
};

let current = "es";

function normalize(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return LANGS.includes(text) ? text : null;
}

function preferencesFile() {
  return path.join(homeDir(), ".packet-tools", "preferences.json");
}

function readSavedLang() {
  const file = preferencesFile();
  if (!existsSync(file)) return null;
  try {
    const saved = JSON.parse(readFileSync(file, "utf8"));
    return normalize(saved?.lang);
  } catch {
    return null;
  }
}

export function isLang(lang) {
  return LANGS.includes(normalize(lang));
}

export function setLang(lang) {
  const value = normalize(lang);
  if (value) current = value;
  return current;
}

export function getLang() {
  return current;
}

export function loadLang() {
  const fromEnv = normalize(process.env.PACKET_TOOLS_LANG);
  if (fromEnv) return setLang(fromEnv);
  const saved = readSavedLang();
  if (saved) return setLang(saved);
  return setLang("es");
}

export function saveLang(lang) {
  const value = normalize(lang);
  if (!value) return false;
  try {
    const file = preferencesFile();
    mkdirSync(path.dirname(file), { recursive: true });
    let data = {};
    if (existsSync(file)) {
      try {
        const parsed = JSON.parse(readFileSync(file, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed;
      } catch {}
    }
    data.lang = value;
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    return true;
  } catch {
    return false;
  }
}

export function t(key, vars) {
  const table = CATALOG[current] ?? CATALOG.es;
  let text = table[key] ?? CATALOG.es[key] ?? key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
    );
  }
  return text;
}
