import { DOCS_URL, NPM_URL, RELEASES_URL, SITE_URL } from "../config.mjs";
import {
  PALETTE,
  accent,
  bold,
  dim,
  fg,
  gradient,
  muted,
  terminalWidth,
  visibleLength,
  wrapText,
} from "./theme.mjs";

const GLYPHS = {
  P: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  C: [" ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝"],
  K: ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  T: ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "],
  O: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  L: ["██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝"],
  S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  " ": ["  ", "  ", "  ", "  ", "  ", "  "],
};

const GLYPH_HEIGHT = 6;

function blockFor(text) {
  const rows = [];
  for (let row = 0; row < GLYPH_HEIGHT; row++) {
    rows.push(
      [...text]
        .map((character) => (GLYPHS[character] ?? GLYPHS[" "])[row])
        .join("")
        .replace(/\s+$/, ""),
    );
  }
  return rows;
}

function blockSize(text) {
  return blockFor(text).reduce((max, row) => Math.max(max, [...row].length), 0);
}

function gradientBlock(text) {
  const size = blockSize(text);
  return blockFor(text).map((row) => gradient(row, PALETTE.blue, PALETTE.cyan, size));
}

function layout() {
  const width = terminalWidth();
  const single = "PACKET TOOLS AI";
  if (blockSize(single) + 4 <= width) return [single];
  const lines = ["PACKET", "TOOLS AI"];
  if (lines.every((line) => blockSize(line) + 4 <= width)) return lines;
  return ["PACKET", "TOOLS", "AI"];
}

export function bannerLines({ version, compact = false } = {}) {
  const width = terminalWidth();
  const lines = [];
  for (const chunk of layout()) {
    const indent = blockSize(chunk) + 4 <= width ? "  " : "";
    for (const row of gradientBlock(chunk)) lines.push(`${indent}${row}`);
  }
  lines.push("");
  const tagline = "AI-powered network automation";
  const versionTag = version ? `  ${muted(`v${version}`)}` : "";
  lines.push(`${gradient(tagline, PALETTE.sky, PALETTE.ice, tagline.length)}${versionTag}`);
  if (!compact) {
    lines.push(muted("Packet Tracer · GNS3 · SSH · Telnet · Serial · MCP"));
  }
  return lines;
}

function linkRow(label, value, labelWidth) {
  return `  ${accent(label.padEnd(labelWidth))}${fg(value, PALETTE.sky)}`;
}

export function renderBanner({ version, compact = false, showLinks = false } = {}) {
  const lines = bannerLines({ version, compact });
  if (showLinks) {
    const labelWidth = 9;
    lines.push("");
    lines.push(linkRow("Web", SITE_URL, labelWidth));
    lines.push(linkRow("npm", NPM_URL, labelWidth));
    lines.push(linkRow("Docs", DOCS_URL, labelWidth));
    lines.push(linkRow("Releases", RELEASES_URL, labelWidth));
  }
  return `${lines.join("\n")}\n`;
}

function rule() {
  const size = Math.max(10, Math.min(terminalWidth() - 4, 76));
  return `  ${dim("-".repeat(size))}`;
}

export function renderHelp({ version, entries, footer }) {
  const commands = entries.filter((entry) => entry.command).map((entry) => entry.command);
  const gutter = Math.max(0, ...commands.map((command) => visibleLength(command))) + 2;
  const lines = ["", ...bannerLines({ version, compact: true }), "", rule(), ""];
  for (const entry of entries) {
    if (entry.title) {
      lines.push(`  ${fg(bold(entry.title), PALETTE.sky)}`);
      continue;
    }
    const padding = " ".repeat(Math.max(2, gutter - visibleLength(entry.command)));
    lines.push(`  ${fg(entry.command, PALETTE.cyan)}${padding}${muted(entry.description ?? "")}`);
  }
  if (footer) {
    lines.push("");
    for (const line of footer) lines.push(`  ${muted(line)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function renderSection(title, hint) {
  const lines = [`  ${accent("┌")} ${bold(title)}`];
  if (hint) {
    const width = Math.max(20, terminalWidth() - 8);
    for (const line of wrapText(hint, width)) lines.push(`  ${dim("│")} ${muted(line)}`);
  }
  lines.push(`  ${accent("└")}`);
  return `${lines.join("\n")}\n`;
}
