"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packetTracerBridge = void 0;
exports.toolTimeoutMs = toolTimeoutMs;
exports.isOperationOk = isOperationOk;
exports.callPacketTracer = callPacketTracer;
const PacketTracerBridgeServer_1 = require("./PacketTracerBridgeServer.js");
const EnvConfig_1 = require("../../config/EnvConfig.js");
const Logger_1 = require("../../utils/Logger.js");
const errors_1 = require("../../core/errors.js");
const TOOL_TIMEOUTS = {
    listDeviceModels: 15_000,
    getDeviceInfo: 15_000,
    readDeviceConsole: 15_000,
    listDeviceModules: 15_000,
    getCommandLog: 15_000,
    getRoutingTable: 30_000,
    getVlanConfiguration: 30_000,
    getDeviceConfigSnapshot: 45_000,
    getDeviceMetrics: 45_000,
    validateSecurityConfig: 45_000,
    runDeviceCommands: 60_000,
    runCommandAsync: 30_000,
    pollCommandResult: 25_000,
    getNetwork: 45_000,
    validateTopology: 45_000,
    getSimulationStatus: 10_000,
    setSimulationMode: 30_000,
    stepSimulation: 30_000,
    getPduResults: 30_000,
    sendPdu: 45_000,
    moveDevice: 15_000,
    addDevice: 20_000,
    removeDevice: 20_000,
    addLink: 20_000,
    removeLink: 20_000,
    renameDevice: 20_000,
    configurePcIp: 30_000,
    setPower: 30_000,
    clearWorkspace: 30_000,
    applyDeviceConfig: 120_000,
    simulateLinkFailure: 30_000,
    restoreLink: 30_000,
    pingDevices: 60_000,
    reachabilityMatrix: 90_000,
    exportWorkspace: 90_000,
    importWorkspace: 90_000,
};
const DEFAULT_TIMEOUT_MS = 60_000;
function toolTimeoutMs(name) {
    return TOOL_TIMEOUTS[name] ?? DEFAULT_TIMEOUT_MS;
}
class PacketTracerBridge {
    timers = new Map();
    get url() {
        return `http://${EnvConfig_1.envConfig.MCP_BRIDGE_HOST}:${EnvConfig_1.envConfig.MCP_BRIDGE_PORT}`;
    }
    async callTool(name, input, options = {}) {
        const timeoutMs = options.timeoutMs && options.timeoutMs > 0
            ? options.timeoutMs
            : toolTimeoutMs(name);
        return new Promise((resolve, reject) => {
            let toolCallId;
            try {
                toolCallId = (0, PacketTracerBridgeServer_1.requestTool)(name, input).toolCallId;
            }
            catch (error) {
                Logger_1.Logger.debug(`Call to '${name}' discarded before emitting: ${String(error)}`);
                reject(error);
                return;
            }
            const timer = setTimeout(() => {
                this.timers.delete(toolCallId);
                (0, PacketTracerBridgeServer_1.forgetCall)(toolCallId);
                reject((0, errors_1.unavailableError)(`Packet Tracer did not respond to '${name}' within ${Math.round(timeoutMs / 1000)} s.`, "The command may still have been queued in the extension, so do NOT repeat it blindly: " +
                    "check the state with a read (packet_tracer_get_network or packet_tracer_read_console). " +
                    "If the console got blocked by a dialog, restart Packet Tracer. " +
                    `Also check that the extension is connected to the MCP bridge (${this.url}) ` +
                    `and that MCP_BRIDGE_PORT=${EnvConfig_1.envConfig.MCP_BRIDGE_PORT} is the port it connects to.`));
            }, timeoutMs);
            this.timers.set(toolCallId, timer);
            (0, PacketTracerBridgeServer_1.awaitToolResult)(toolCallId).then((value) => {
                clearTimeout(timer);
                this.timers.delete(toolCallId);
                resolve(unwrapEnvelope(value));
            }, (error) => {
                clearTimeout(timer);
                this.timers.delete(toolCallId);
                reject(error);
            });
        });
    }
    async close() {
        for (const [id, timer] of this.timers) {
            clearTimeout(timer);
            (0, PacketTracerBridgeServer_1.forgetCall)(id);
        }
        this.timers.clear();
    }
}
function unwrapEnvelope(value) {
    let current = value;
    let rounds = 0;
    while (rounds < 5 &&
        current &&
        typeof current === "object" &&
        typeof current.code === "string" &&
        "result" in current) {
        current = current.result;
        rounds++;
    }
    return current;
}
exports.packetTracerBridge = new PacketTracerBridge();
function isOperationOk(result) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
        return false;
    }
    const raw = result;
    if (raw.success === false)
        return false;
    if (raw.succes === false)
        return false;
    if (raw.error)
        return false;
    return true;
}
async function callPacketTracer(name, input, options = {}) {
    try {
        return await exports.packetTracerBridge.callTool(name, input, options);
    }
    catch (error) {
        if (error instanceof errors_1.McpToolError)
            throw error;
        throw (0, errors_1.normalizeError)(error);
    }
}
//# sourceMappingURL=PacketTracerBridge.js.map