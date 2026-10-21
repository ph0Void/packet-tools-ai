import os from "node:os";
import path from "node:path";

export function isSandboxed() {
  return Boolean(process.env.PACKET_TOOLS_HOME);
}

export function homeDir() {
  return process.env.PACKET_TOOLS_HOME || os.homedir();
}

export function appDataDir() {
  const home = homeDir();
  if (isSandboxed()) return path.join(home, "AppData", "Roaming");
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(home, "AppData", "Roaming");
  }
  return path.join(home, ".config");
}
