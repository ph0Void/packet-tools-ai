import { envConfig } from "@/config/EnvConfig";


type LogLevel = "info" | "warning" | "error" | "debug";


function emit(level: LogLevel, message: string, data?: unknown): void {
  if (level === "debug" && !envConfig.MCP_DEBUG) return;

  const timestamp = new Date().toISOString();
  const label = level.toUpperCase();
  const suffix = data === undefined ? "" : ` ${serialize(data)}`;

  process.stderr.write(`[${timestamp}] [MCP] [${label}] ${message}${suffix}\n`);
}


function serialize(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return "[non-serializable data]";
  }
}


export function truncateForLog(text: string, max = 400): string {
  const clean = String(text ?? "");
  return clean.length > max ? `${clean.slice(0, max)}...(+${clean.length - max})` : clean;
}

export const Logger = {
  info(message: string, data?: unknown): void {
    emit("info", message, data);
  },
  warning(message: string, data?: unknown): void {
    emit("warning", message, data);
  },
  error(message: string, data?: unknown): void {
    emit("error", message, data);
  },
  debug(message: string, data?: unknown): void {
    emit("debug", message, data);
  },
  trace(message: string, data?: unknown): void {
    if (!envConfig.MCP_TRACE_TOOLS) return;
    emit("debug", message, data);
  },
};
