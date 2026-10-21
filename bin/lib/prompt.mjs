import { t } from "./i18n.mjs";

let attached = false;
let ended = false;
let buffer = "";
const queue = [];
const waiters = [];

function deliver(line) {
  const waiter = waiters.shift();
  if (waiter) waiter(line);
  else queue.push(line);
}

function onData(chunk) {
  buffer += chunk;
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    deliver(buffer.slice(0, index).replace(/\r$/, ""));
    buffer = buffer.slice(index + 1);
    index = buffer.indexOf("\n");
  }
}

function onEnd() {
  ended = true;
  if (buffer.length > 0) {
    const rest = buffer;
    buffer = "";
    deliver(rest);
  }
  while (waiters.length > 0) waiters.shift()(null);
}

function attach() {
  if (attached || ended) return;
  attached = true;
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", onData);
  process.stdin.on("end", onEnd);
  process.stdin.on("error", onEnd);
}

function readLine() {
  if (queue.length > 0) return Promise.resolve(queue.shift());
  if (ended || process.stdin.readableEnded) return Promise.resolve(null);
  attach();
  return new Promise((resolve) => waiters.push(resolve));
}

export function closePrompts() {
  if (attached) {
    attached = false;
    process.stdin.removeListener("data", onData);
    process.stdin.removeListener("end", onEnd);
    process.stdin.removeListener("error", onEnd);
    while (waiters.length > 0) waiters.shift()(null);
    try {
      process.stdin.pause();
    } catch {}
  }
  try {
    process.stdin.unref?.();
  } catch {}
}

export async function askChoice(question, options, { defaultValue } = {}) {
  const fallback = defaultValue ?? (options.length > 0 ? options[0].value : undefined);
  for (;;) {
    process.stdout.write(`${question}\n`);
    for (const [index, option] of options.entries()) {
      const hint = option.hint ? ` — ${option.hint}` : "";
      const mark = option.value === fallback ? t("prompt.default") : "";
      process.stdout.write(`  ${index + 1}) ${option.label}${hint}${mark}\n`);
    }
    process.stdout.write(t("prompt.choice"));
    const line = await readLine();
    if (line === null) return null;
    const text = line.trim();
    if (text === "") {
      if (fallback !== undefined) return fallback;
      continue;
    }
    if (/^\d+$/.test(text)) {
      const index = Number.parseInt(text, 10);
      if (index >= 1 && index <= options.length) return options[index - 1].value;
      process.stdout.write(`${t("prompt.range", { value: text })}\n`);
      continue;
    }
    const byValue = options.find((option) => String(option.value).toLowerCase() === text.toLowerCase());
    if (byValue) return byValue.value;
    process.stdout.write(`${t("prompt.invalid", { value: text })}\n`);
  }
}

export async function askMultiSelect(question, options) {
  for (;;) {
    process.stdout.write(`${question}\n`);
    for (const [index, option] of options.entries()) {
      process.stdout.write(`  ${index + 1}) ${option.label}${option.hint ? ` — ${option.hint}` : ""}\n`);
    }
    process.stdout.write(t("prompt.multi.hint"));
    const line = await readLine();
    if (line === null) return null;
    const tokens = line
      .trim()
      .split(/[\s,;]+/)
      .filter(Boolean);
    if (tokens.length === 0) {
      process.stdout.write(`${t("prompt.multi.none")}\n`);
      continue;
    }
    if (tokens.some((token) => ["todos", "all", "*"].includes(token.toLowerCase()))) {
      return options.map((option) => option.value);
    }
    const selected = [];
    let invalid = null;
    for (const token of tokens) {
      if (!/^\d+$/.test(token)) {
        invalid = token;
        break;
      }
      const index = Number.parseInt(token, 10);
      if (index < 1 || index > options.length) {
        invalid = token;
        break;
      }
      const value = options[index - 1].value;
      if (!selected.includes(value)) selected.push(value);
    }
    if (invalid !== null) {
      process.stdout.write(`${t("prompt.invalid", { value: invalid })}\n`);
      continue;
    }
    return selected;
  }
}
