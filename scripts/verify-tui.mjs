#!/usr/bin/env node

import { EventEmitter } from "node:events";

const KEYS = { down: "\u001b[B", up: "\u001b[A", enter: "\r", space: " " };

const originalWrite = process.stdout.write.bind(process.stdout);

function fakeTty() {
  const input = new EventEmitter();
  input.isTTY = true;
  input.readableEnded = false;
  input.setRawMode = () => input;
  input.resume = () => input;
  input.pause = () => input;
  input.setEncoding = () => input;
  input.unref = () => input;

  const originalColumns = process.stdout.columns;
  process.stdout.write = (chunk) => {
    if (process.env.PACKET_TOOLS_TUI_VERBOSE) originalWrite(String(chunk));
    return true;
  };
  Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process, "stdin", { value: input, configurable: true });
  return {
    input,
    restore() {
      process.stdout.write = originalWrite;
      Object.defineProperty(process.stdout, "columns", {
        value: originalColumns,
        configurable: true,
      });
    },
  };
}

function feed(input, plan) {
  return new Promise((resolve) => {
    let index = 0;
    const tick = setInterval(() => {
      if (input.listenerCount("data") === 0) return;
      clearInterval(tick);
      const step = setInterval(() => {
        if (index >= plan.length) {
          clearInterval(step);
          resolve();
          return;
        }
        input.emit("data", plan[index++]);
      }, 20);
    }, 15);
  });
}

const { askChoice, askMultiSelect, closePrompts, supportsInteractive } = await import(
  "../bin/lib/prompt.mjs"
);

const tty = fakeTty();
let failures = 0;

function check(name, ok, detail = "") {
  const text = ok ? `✅ ${name}` : `❌ ${name}${detail ? ` — ${detail}` : ""}`;
  originalWrite(`${text}\n`);
  if (!ok) failures++;
}

check("supportsInteractive() detecta el pseudo-TTY", supportsInteractive());

const choiceOptions = [
  { value: "web", label: "Web" },
  { value: "mcp", label: "MCP" },
  { value: "desktop", label: "Desktop" },
  { value: "exit", label: "Salir" },
];

const pending = askChoice("¿Qué quieres instalar?", choiceOptions, { defaultValue: "exit" });
await feed(tty.input, [KEYS.down, KEYS.enter]);
check("Flechas: ↓ mueve el foco y Enter elige la opción resaltada", (await pending) === "web");

const pendingNumber = askChoice("¿Qué quieres instalar?", choiceOptions, { defaultValue: "exit" });
await feed(tty.input, ["2"]);
check("Flechas: escribir el número sigue eligiendo al instante", (await pendingNumber) === "mcp");

const pendingWrap = askChoice("¿Qué quieres instalar?", choiceOptions, { defaultValue: "exit" });
await feed(tty.input, [KEYS.up, KEYS.enter]);
check("Flechas: ↑ desde arriba da la vuelta al final", (await pendingWrap) === "desktop");

const agents = [
  { value: "claude-code", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "codex", label: "Codex CLI" },
];

const pendingMulti = askMultiSelect("¿En qué agentes?", agents);
await feed(tty.input, [KEYS.space, KEYS.down, KEYS.space, KEYS.enter]);
const picked = await pendingMulti;
check(
  "Multiselección: Espacio marca (x) y Enter confirma los elegidos",
  JSON.stringify(picked) === JSON.stringify(["claude-code", "cursor"]),
  JSON.stringify(picked),
);

const pendingAll = askMultiSelect("¿En qué agentes?", agents);
await feed(tty.input, ["a", KEYS.enter]);
check(
  "Multiselección: A marca todos",
  JSON.stringify(await pendingAll) === JSON.stringify(["claude-code", "cursor", "codex"]),
);

const pendingEmpty = askMultiSelect("¿En qué agentes?", agents);
let settled = false;
pendingEmpty.then(() => {
  settled = true;
});
await feed(tty.input, [KEYS.enter]);
await new Promise((resolve) => setTimeout(resolve, 150));
check("Multiselección: Enter sin marcar no deja continuar", !settled);
await feed(tty.input, [KEYS.space, KEYS.enter]);
const emptyValue = await pendingEmpty;
check(
  "Multiselección: tras marcar, Enter confirma",
  JSON.stringify(emptyValue) === JSON.stringify(["claude-code"]),
  JSON.stringify(emptyValue),
);

closePrompts();
tty.restore();
process.exit(failures === 0 ? 0 : 1);
