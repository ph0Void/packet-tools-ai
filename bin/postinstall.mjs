#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT_PACKAGE } from "./config.mjs";
import { loadLang, t } from "./lib/i18n.mjs";
import { closePrompts } from "./lib/prompt.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isDevCheckout =
  existsSync(path.join(packageRoot, "turbo.json")) &&
  existsSync(path.join(packageRoot, "packages", "server"));
if (isDevCheckout) process.exit(0);

loadLang();
process.exitCode = 0;

function banner() {
  console.log(t("postinstall.banner", { package: ROOT_PACKAGE }));
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
