import { t } from "./i18n.mjs";
import {
  accent,
  bold,
  clearLines,
  cursorHide,
  cursorShow,
  dim,
  muted,
  terminalWidth,
  truncate,
  visibleLength,
  warning,
} from "./theme.mjs";

let attached = false;
let ended = false;
let buffer = "";
const queue = [];
const waiters = [];
const keyQueue = [];
let keyWaiter = null;

function deliverKey(event) {
  if (keyWaiter) {
    const waiter = keyWaiter;
    keyWaiter = null;
    waiter(event);
    return;
  }
  keyQueue.push(event);
}

function nextKey() {
  if (keyQueue.length > 0) return Promise.resolve(keyQueue.shift());
  return new Promise((resolve) => {
    keyWaiter = resolve;
  });
}

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

export function supportsInteractive() {
  return Boolean(
    process.stdin.isTTY &&
      process.stdout.isTTY &&
      typeof process.stdin.setRawMode === "function" &&
      !process.env.PACKET_TOOLS_NO_TUI,
  );
}

function frameWriter() {
  let lines = 0;
  return {
    draw(frame) {
      const parts = [];
      if (lines > 0) parts.push(clearLines(lines));
      parts.push(frame.join("\n"));
      process.stdout.write(parts.join(""));
      lines = frame.length;
    },
    finish() {
      if (lines > 0) process.stdout.write("\n");
      lines = 0;
    },
    reset() {
      lines = 0;
    },
  };
}

function decodeKeys(text) {
  const events = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === "\u0003" || character === "\u0004") {
      events.push({ key: "cancel" });
      continue;
    }
    if (character === "\u001b") {
      const next = text[index + 1];
      const code = text[index + 2];
      if (next === "[" || next === "O") {
        index += 2;
        if (code === "A") events.push({ key: "up" });
        else if (code === "B") events.push({ key: "down" });
        else if (code === "C") events.push({ key: "right" });
        else if (code === "D") events.push({ key: "left" });
        else if (code === "H") events.push({ key: "home" });
        else if (code === "F") events.push({ key: "end" });
        continue;
      }
      events.push({ key: "cancel" });
      continue;
    }
    if (character === "\r" || character === "\n") {
      events.push({ key: "enter" });
      continue;
    }
    if (character === "\u007f" || character === "\b") {
      events.push({ key: "backspace" });
      continue;
    }
    if (character === " ") {
      events.push({ key: "space" });
      continue;
    }
    if (character === "k") {
      events.push({ key: "up" });
      continue;
    }
    if (character === "j") {
      events.push({ key: "down" });
      continue;
    }
    events.push({ key: "char", value: character });
  }
  return events;
}

function startKeys(onEvent) {
  const stdin = process.stdin;
  const handle = (chunk) => {
    for (const event of decodeKeys(String(chunk))) {
      if (event.key === "cancel") {
        stop();
        onEvent(null);
        return;
      }
      onEvent(event);
    }
  };
  const stop = () => {
    stdin.removeListener("data", handle);
    stdin.removeListener("end", stop);
    stdin.removeListener("error", stop);
    try {
      stdin.setRawMode(false);
    } catch {}
    try {
      stdin.pause();
    } catch {}
    process.stdout.write(cursorShow());
  };
  try {
    stdin.setRawMode(true);
  } catch {}
  process.stdout.write(cursorHide());
  stdin.resume();
  stdin.on("data", handle);
  stdin.on("end", stop);
  stdin.on("error", stop);
  return { stop };
}

function optionRow({ index, label, focused, checked, radio }) {
  const width = terminalWidth();
  const number = `[${index + 1}]`;
  const cursor = focused ? accent("❯") : " ";
  const marker = radio
    ? focused
      ? accent("●")
      : dim("○")
    : checked
      ? accent("[x]")
      : dim("[ ]");
  const prefix = `  ${cursor} ${dim(number)} ${marker} `;
  const available = Math.max(8, width - visibleLength(prefix) - 2);
  const text = truncate(label, available);
  return `${prefix}${focused ? bold(text) : text}`;
}

function focusHint(option) {
  if (!option?.hint) return "";
  return `  ${muted(truncate(option.hint, terminalWidth() - 4))}`;
}

export async function askChoice(question, options, { defaultValue, colorize } = {}) {
  const fallback = defaultValue ?? (options.length > 0 ? options[0].value : undefined);
  if (supportsInteractive() && options.length > 0) {
    const picked = await interactiveChoice(question, options, fallback, colorize);
    if (picked !== undefined) return picked;
  }
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

async function interactiveChoice(question, options, fallback, colorize) {
  const start = options.findIndex((option) => option.value === fallback);
  let cursor = start < 0 ? 0 : start;
  let notice = "";
  const writer = frameWriter();
  const paint = (option) => (colorize ? colorize(option.label) : option.label);

  const frame = () => {
    const lines = [`  ${accent("┌")} ${bold(question)}`, `  ${dim("│")}`];
    for (const [index, option] of options.entries()) {
      lines.push(
        optionRow({
          index,
          label: paint(option),
          focused: index === cursor,
          radio: true,
        }),
      );
    }
    const hint = focusHint(options[cursor]);
    if (hint) {
      lines.push(`  ${dim("│")}`);
      lines.push(hint);
    }
    if (notice) {
      lines.push(`  ${warning(notice)}`);
      notice = "";
    }
    lines.push(`  ${dim("│")}`);
    lines.push(`  ${accent("└")} ${muted(t("prompt.select.keys"))}`);
    return lines;
  };

  keyQueue.length = 0;
  const session = startKeys(deliverKey);
  writer.draw(frame());

  try {
    for (;;) {
      const event = await nextKey();
      if (event === null) {
        writer.finish();
        return null;
      }
      if (event.key === "up") cursor = (cursor - 1 + options.length) % options.length;
      else if (event.key === "down") cursor = (cursor + 1) % options.length;
      else if (event.key === "home") cursor = 0;
      else if (event.key === "end") cursor = options.length - 1;
      else if (event.key === "enter") {
        writer.draw(frame());
        writer.finish();
        return options[cursor].value;
      } else if (event.key === "char" && /^[1-9]$/.test(event.value)) {
        const index = Number.parseInt(event.value, 10) - 1;
        if (index < options.length) {
          cursor = index;
          writer.draw(frame());
          writer.finish();
          return options[cursor].value;
        }
        notice = t("prompt.range", { value: event.value });
      }
      writer.draw(frame());
    }
  } finally {
    session.stop();
  }
}

export async function askMultiSelect(question, options, { preselectAll = false, colorize } = {}) {
  if (supportsInteractive() && options.length > 0) {
    const picked = await interactiveMultiSelect(question, options, preselectAll, colorize);
    if (picked !== undefined) return picked;
  }
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

async function interactiveMultiSelect(question, options, preselectAll, colorize) {
  const checked = new Set(preselectAll ? options.map((option) => option.value) : []);
  let cursor = 0;
  let notice = "";
  const writer = frameWriter();
  const paint = (option) => (colorize ? colorize(option.label) : option.label);

  const frame = () => {
    const lines = [`  ${accent("┌")} ${bold(question)}`, `  ${dim("│")}`];
    for (const [index, option] of options.entries()) {
      lines.push(
        optionRow({
          index,
          label: paint(option),
          focused: index === cursor,
          checked: checked.has(option.value),
        }),
      );
    }
    const hint = focusHint(options[cursor]);
    if (hint) {
      lines.push(`  ${dim("│")}`);
      lines.push(hint);
    }
    lines.push(`  ${dim("│")}`);
    lines.push(`  ${dim("│")} ${muted(t("prompt.multi.count", { count: checked.size, total: options.length }))}`);
    if (notice) {
      lines.push(`  ${warning(notice)}`);
      notice = "";
    }
    lines.push(`  ${accent("└")} ${muted(t("prompt.multi.keys"))}`);
    return lines;
  };

  const toggle = (index) => {
    const value = options[index].value;
    if (checked.has(value)) checked.delete(value);
    else checked.add(value);
  };

  keyQueue.length = 0;
  const session = startKeys(deliverKey);
  writer.draw(frame());

  try {
    for (;;) {
      const event = await nextKey();
      if (event === null) {
        writer.finish();
        return null;
      }
      if (event.key === "up") cursor = (cursor - 1 + options.length) % options.length;
      else if (event.key === "down") cursor = (cursor + 1) % options.length;
      else if (event.key === "home") cursor = 0;
      else if (event.key === "end") cursor = options.length - 1;
      else if (event.key === "space") toggle(cursor);
      else if (event.key === "char" && /^[1-9]$/.test(event.value)) {
        const index = Number.parseInt(event.value, 10) - 1;
        if (index < options.length) {
          cursor = index;
          toggle(index);
        } else {
          notice = t("prompt.range", { value: event.value });
        }
      } else if (event.key === "char" && event.value.toLowerCase() === "a") {
        if (checked.size === options.length) checked.clear();
        else for (const option of options) checked.add(option.value);
      } else if (event.key === "enter") {
        if (checked.size === 0) {
          notice = t("prompt.multi.empty");
          writer.draw(frame());
          continue;
        }
        writer.draw(frame());
        writer.finish();
        return options.filter((option) => checked.has(option.value)).map((option) => option.value);
      }
      writer.draw(frame());
    }
  } finally {
    session.stop();
  }
}
