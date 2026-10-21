"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telnetModule = void 0;
exports.closeTelnetSessions = closeTelnetSessions;
const zod_1 = require("zod");
const ToolRegistry_1 = require("../../core/ToolRegistry.js");
const adapters_1 = require("../../transports/adapters.js");
const commandEngine_1 = require("../../transports/commandEngine.js");
const sessions = new Map();
function sessionKey(host, port) {
    return `${host}:${port}`;
}
async function getSession(host, port, credentials) {
    const key = sessionKey(host, port);
    const existing = sessions.get(key);
    if (existing?.isConnected())
        return existing;
    const transport = (0, adapters_1.createTransport)({
        protocol: "TELNET",
        host,
        port,
        username: credentials.username,
        password: credentials.password,
    });
    await transport.connect();
    sessions.set(key, transport);
    return transport;
}
async function closeTelnetSessions() {
    for (const transport of sessions.values()) {
        await transport.disconnect().catch(() => undefined);
    }
    sessions.clear();
}
const tools = [
    (0, ToolRegistry_1.defineTool)({
        name: "telnet_detect_vendor",
        description: "Connects to a device over Telnet, reads its prompt and determines the VENDOR (Cisco IOS, Huawei VRP, MikroTik, ArubaOS, JunOS or generic). " +
            "Use it before configuring a device whose brand you do not know, so the commands are sent with the correct syntax.",
        inputSchema: {
            host: zod_1.z.string().describe("Device IP or hostname"),
            port: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Telnet port (default 23)"),
            username: zod_1.z
                .string()
                .optional()
                .describe("User, if the device requires one"),
            password: zod_1.z
                .string()
                .optional()
                .describe("Password, if the device requires one"),
        },
        handler: async ({ host, port, username, password }) => {
            const transport = await getSession(host, port ?? 23, {
                username,
                password,
            });
            const result = await (0, commandEngine_1.runCommands)(transport, [], {}, { skipPreamble: true });
            return {
                success: true,
                host,
                port: port ?? 23,
                vendor: result.vendorId,
                vendorLabel: result.vendorLabel,
                prompt: result.prompt,
                reliable: result.vendorId !== "conservative",
                note: (0, commandEngine_1.conservativeVendorNote)(result),
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "telnet_send_commands",
        description: "Sends commands over Telnet and returns the output of each one. " +
            "Detects the vendor, applies the preamble to disable pagination and discards the commands that would close the session. " +
            "The device must have Telnet enabled: if not, use the ssh_ domain.",
        inputSchema: {
            host: zod_1.z.string().describe("Device IP or hostname"),
            commands: zod_1.z
                .array(zod_1.z.string())
                .min(1)
                .describe("Commands to send, in order"),
            port: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Telnet port (default 23)"),
            username: zod_1.z
                .string()
                .optional()
                .describe("User, if the device requires one"),
            password: zod_1.z
                .string()
                .optional()
                .describe("Password, if the device requires one"),
            idleMs: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Silence to consider the output finished (default 700 ms)"),
            maxMs: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Maximum wait per command (default 20000 ms)"),
        },
        handler: async ({ host, commands, port, username, password, idleMs, maxMs, }) => {
            const transport = await getSession(host, port ?? 23, {
                username,
                password,
            });
            const result = await (0, commandEngine_1.runCommands)(transport, commands, {}, { idleMs, maxMs });
            return {
                success: true,
                host,
                vendor: result.vendorId,
                vendorLabel: result.vendorLabel,
                prompt: result.prompt,
                durationMs: result.durationMs,
                output: result.output,
                note: (0, commandEngine_1.conservativeVendorNote)(result),
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "telnet_disconnect",
        description: "Closes the Telnet session with a device to free it.",
        inputSchema: {
            host: zod_1.z.string().describe("Device IP or hostname"),
            port: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Telnet port (default 23)"),
        },
        handler: async ({ host, port }) => {
            const key = sessionKey(host, port ?? 23);
            const transport = sessions.get(key);
            if (!transport) {
                return {
                    success: true,
                    closed: false,
                    message: `No open session with ${host}:${port ?? 23}.`,
                };
            }
            await transport.disconnect();
            sessions.delete(key);
            return {
                success: true,
                closed: true,
                message: `Session with ${host}:${port ?? 23} closed.`,
            };
        },
    }),
];
exports.telnetModule = {
    id: "telnet",
    prefix: "telnet_",
    description: "Telnet sessions against real devices: detect the vendor and send configuration commands with the correct syntax.",
    tools,
};
//# sourceMappingURL=index.js.map