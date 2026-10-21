"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.truncateForLog = truncateForLog;
const EnvConfig_1 = require("../config/EnvConfig.js");
function emit(level, message, data) {
    if (level === "debug" && !EnvConfig_1.envConfig.MCP_DEBUG)
        return;
    const timestamp = new Date().toISOString();
    const label = level.toUpperCase();
    const suffix = data === undefined ? "" : ` ${serialize(data)}`;
    process.stderr.write(`[${timestamp}] [MCP] [${label}] ${message}${suffix}\n`);
}
function serialize(data) {
    if (typeof data === "string")
        return data;
    try {
        return JSON.stringify(data);
    }
    catch {
        return "[non-serializable data]";
    }
}
function truncateForLog(text, max = 400) {
    const clean = String(text ?? "");
    return clean.length > max ? `${clean.slice(0, max)}...(+${clean.length - max})` : clean;
}
exports.Logger = {
    info(message, data) {
        emit("info", message, data);
    },
    warning(message, data) {
        emit("warning", message, data);
    },
    error(message, data) {
        emit("error", message, data);
    },
    debug(message, data) {
        emit("debug", message, data);
    },
    trace(message, data) {
        if (!EnvConfig_1.envConfig.MCP_TRACE_TOOLS)
            return;
        emit("debug", message, data);
    },
};
//# sourceMappingURL=Logger.js.map