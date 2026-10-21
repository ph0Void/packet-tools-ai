#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT_PACKAGE } from "./config.mjs";
import { renderBanner } from "./lib/banner.mjs";
import { loadLang, t } from "./lib/i18n.mjs";
import { closePrompts } from "./lib/prompt.mjs";
import { accent, bold, muted, setColorLevel } from "./lib/theme.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isDevCheckout =
  existsSync(path.join(packageRoot, "turbo.json")) &&
  existsSync(path.join(packageRoot, "packages", "server"));
if (isDevCheckout) process.exit(0);

if (process.argv.includes("--no-color") || process.argv.includes("--no-colors")) setColorLevel(0);
loadLang();
process.exitCode = 0;

function readVersion() {
  try {
    const raw = readFileSync(path.join(packageRoot, "package.json"), "utf8");
    return JSON.parse(raw).version ?? "";
  } catch {
    return "";
  }
}

function banner() {
  const command = `npx -y --package=${ROOT_PACKAGE} packet-tools-ai`;
  const lines = [
    "",
    renderBanner({ version: readVersion(), compact: true }).trimEnd(),
    "",
    `  ${accent("✓")} ${bold(t("postinstall.ready"))} ${muted(t("postinstall.hint"))}`,
    "",
    `  ${muted("$")} ${command}`,
    "",
  ];
  console.log(lines.join("\n"));
}

function shouldSkip() {
  return (
    Boolean(process.env.PACKET_TOOLS_SKIP_POSTINSTALL) ||
    Boolean(process.env.CI) ||
    !process.stdin.isTTY ||
    !process.stdout.isTTY
  );
}

let usedTty = false;

try {
  if (shouldSkip()) {
    banner();
  } else {
    usedTty = true;
    const { runMenu } = await import("./cli.mjs");
    await runMenu();
  }
} catch {
  banner();
} finally {
  closePrompts();
  if (usedTty) process.exit(0);
}
