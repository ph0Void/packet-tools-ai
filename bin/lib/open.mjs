import { spawn } from "node:child_process";

function isDisabled() {
  const flag = (process.env.PACKET_TOOLS_NO_OPEN || "").toLowerCase();
  return flag === "1" || flag === "true";
}

export function openUrl(url) {
  if (isDisabled()) return false;
  const command =
    process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
