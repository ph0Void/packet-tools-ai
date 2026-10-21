const ESC = "\u001b[";

export const PALETTE = {
  blue: [37, 99, 235],
  sky: [56, 189, 248],
  cyan: [34, 211, 238],
  ice: [165, 243, 252],
  muted: [100, 116, 139],
  ok: [52, 211, 153],
  warn: [250, 204, 21],
  error: [248, 113, 113],
};

const BASIC = [
  [30, 0, 0, 0],
  [31, 205, 49, 49],
  [32, 13, 188, 121],
  [33, 229, 229, 16],
  [34, 36, 114, 200],
  [35, 188, 63, 188],
  [36, 17, 168, 205],
  [37, 229, 229, 229],
  [90, 102, 102, 102],
  [91, 241, 76, 76],
  [92, 35, 209, 139],
  [93, 245, 245, 67],
  [94, 59, 142, 234],
  [95, 214, 112, 214],
  [96, 41, 184, 219],
  [97, 255, 255, 255],
];

function envValue(name) {
  const value = process.env[name];
  if (value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function detectColorLevel(stream = process.stdout) {
  const forced = envValue("FORCE_COLOR");
  if (forced !== null) {
    const asNumber = Number.parseInt(forced, 10);
    if (Number.isNaN(asNumber)) return forced.toLowerCase() === "false" ? 0 : 1;
    return Math.max(0, Math.min(3, asNumber));
  }
  if (envValue("NO_COLOR") !== null) return 0;
  if (!stream || !stream.isTTY) return 0;
  const colorTerm = String(process.env.COLORTERM ?? "").toLowerCase();
  if (colorTerm.includes("truecolor") || colorTerm.includes("24bit")) return 3;
  const term = String(process.env.TERM ?? "").toLowerCase();
  if (term.includes("truecolor") || term.includes("24bit") || term.includes("direct")) return 3;
  if (process.env.WT_SESSION || process.env.TERM_PROGRAM) return 3;
  if (term.includes("256")) return 2;
  if (process.platform === "win32") return 2;
  if (term === "" || term === "dumb") return 1;
  return 2;
}

let level = detectColorLevel();

export function setColorLevel(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  level = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(3, parsed));
  return level;
}

export function colorLevel() {
  return level;
}

export function isColor() {
  return level > 0;
}

function nearestBasic([r, g, b]) {
  let best = BASIC[7];
  let distance = Number.POSITIVE_INFINITY;
  for (const entry of BASIC) {
    const dr = entry[1] - r;
    const dg = entry[2] - g;
    const db = entry[3] - b;
    const value = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (value < distance) {
      distance = value;
      best = entry;
    }
  }
  return best[0];
}

function nearest256([r, g, b]) {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const toCube = (value) => Math.round((value / 255) * 5);
  return 16 + 36 * toCube(r) + 6 * toCube(g) + toCube(b);
}

function fgCode(rgb) {
  if (level >= 3) return `${ESC}38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
  if (level === 2) return `${ESC}38;5;${nearest256(rgb)}m`;
  return `${ESC}${nearestBasic(rgb)}m`;
}

export function fg(text, rgb) {
  if (level === 0 || !text) return text;
  return `${fgCode(rgb)}${text}${ESC}39m`;
}

export function bold(text) {
  if (level === 0 || !text) return text;
  return `${ESC}1m${text}${ESC}22m`;
}

export function dim(text) {
  if (level === 0 || !text) return text;
  return `${ESC}2m${text}${ESC}22m`;
}

export function accent(text) {
  return fg(text, PALETTE.cyan);
}

export function bg(text, rgb) {
  if (level === 0 || !text) return text;
  const code =
    level >= 3
      ? `${ESC}48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`
      : level === 2
        ? `${ESC}48;5;${nearest256(rgb)}m`
        : `${ESC}${nearestBasic(rgb) + 10}m`;
  return `${code}${text}${ESC}49m`;
}

export function cursorHide() {
  return level === 0 ? "" : `${ESC}?25l`;
}

export function cursorShow() {
  return level === 0 ? "" : `${ESC}?25h`;
}

export function clearLines(count) {
  if (count <= 0) return "";
  const parts = ["\r"];
  for (let index = 0; index < count - 1; index++) parts.push(`${ESC}1A${ESC}2K`);
  parts.push(`${ESC}2K`);
  return parts.join("");
}

export function muted(text) {
  return fg(text, PALETTE.muted);
}

export function success(text) {
  return fg(text, PALETTE.ok);
}

export function warning(text) {
  return fg(text, PALETTE.warn);
}

export function failure(text) {
  return fg(text, PALETTE.error);
}

function mix(from, to, ratio) {
  const t = Math.max(0, Math.min(1, ratio));
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}

export function gradient(text, from = PALETTE.blue, to = PALETTE.cyan, span) {
  if (level === 0 || !text) return text;
  const characters = [...text];
  const total = Math.max(1, (span ?? characters.length) - 1);
  const steps = level >= 3 ? 14 : 8;
  let out = "";
  let run = "";
  let runColor = null;
  for (const [index, character] of characters.entries()) {
    if (character === " ") {
      if (run) {
        out += `${fgCode(runColor)}${run}${ESC}39m`;
        run = "";
        runColor = null;
      }
      out += character;
      continue;
    }
    const ratio = Math.round((index / total) * steps) / steps;
    const color = mix(from, to, ratio);
    if (run && runColor && color.join() !== runColor.join()) {
      out += `${fgCode(runColor)}${run}${ESC}39m`;
      run = "";
    }
    runColor = color;
    run += character;
  }
  if (run && runColor) out += `${fgCode(runColor)}${run}${ESC}39m`;
  return out;
}

export function terminalWidth(stream = process.stdout) {
  const columns = Number(stream?.columns) || Number(process.env.COLUMNS) || 80;
  return Math.max(40, Math.min(columns, 120));
}

export function truncate(text, width) {
  const plain = String(text ?? "");
  if (width <= 0) return "";
  if (plain.length <= width) return plain;
  if (width === 1) return "…";
  return `${plain.slice(0, width - 1)}…`;
}

const ANSI_PATTERN = /\u001b\[[0-9;]*[A-Za-z]/g;

export function stripAnsi(text) {
  return String(text ?? "").replace(ANSI_PATTERN, "");
}

export function visibleLength(text) {
  return stripAnsi(text).length;
}

export function truncateAnsi(text, width) {
  const plain = String(text ?? "");
  if (width <= 0) return "";
  if (visibleLength(plain) <= width) return plain;
  const target = Math.max(0, width - 1);
  let out = "";
  let visible = 0;
  let index = 0;
  while (index < plain.length && visible < target) {
    if (plain[index] === "\u001b") {
      const match = /^\u001b\[[0-9;]*[A-Za-z]/.exec(plain.slice(index));
      if (match) {
        out += match[0];
        index += match[0].length;
        continue;
      }
    }
    out += plain[index];
    index += 1;
    visible += 1;
  }
  const rest = plain.slice(index);
  const tail = /^\u001b\[[0-9;]*[A-Za-z]/.exec(rest);
  return `${out}…${ESC}0m${tail ? tail[0] : ""}`;
}

export function padVisible(text, width) {
  const missing = width - visibleLength(text);
  return missing > 0 ? `${text}${" ".repeat(missing)}` : text;
}

export function wrapText(text, width) {
  const plain = String(text ?? "").trim();
  if (!plain) return [""];
  if (width <= 0) return [plain];
  const words = plain.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
      continue;
    }
    if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}
