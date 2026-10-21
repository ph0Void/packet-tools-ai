"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sshModule = void 0;
exports.closeSshSessions = closeSshSessions;
const zod_1 = require("zod");
const ToolRegistry_1 = require("../../core/ToolRegistry.js");
const adapters_1 = require("../../transports/adapters.js");
const commandEngine_1 = require("../../transports/commandEngine.js");
const sessions = new Map();
function sessionKey(host, port, username) {
    return `${username ?? "anon"}@${host}:${port}`;
}
async function getSession(host, port, credentials) {
    const key = sessionKey(host, port, credentials.username);
    const existing = sessions.get(key);
    if (existing?.isConnected())
        return existing;
    const transport = (0, adapters_1.createTransport)({
        protocol: "SSH",
        host,
        port,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
    });
    await transport.connect();
    sessions.set(key, transport);
    return transport;
}
async function closeSshSessions() {
    for (const transport of sessions.values()) {
        await transport.disconnect().catch(() => undefined);
    }
    sessions.clear();
}
const tools = [
    (0, ToolRegistry_1.defineTool)({
        name: "ssh_detect_vendor",
        description: "Connects to a device over SSH, reads its prompt and determines the VENDOR (Cisco IOS, Huawei VRP, MikroTik, ArubaOS, JunOS or generic). " +
            "Use it before configuring so the commands use the correct syntax.",
        inputSchema: {
            host: zod_1.z.string().describe("Device IP or hostname"),
            username: zod_1.z.string().describe("SSH user"),
            password: zod_1.z
                .string()
                .optional()
                .describe("Password (if you use a private key, omit it)"),
            privateKey: zod_1.z
                .string()
                .optional()
                .describe("Private key in PEM format, as text"),
            port: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("SSH port (default 22)"),
        },
        handler: async ({ host, username, password, privateKey, port }) => {
            const transport = await getSession(host, port ?? 22, {
                username,
                password,
                privateKey,
            });
            const result = await (0, commandEngine_1.runCommands)(transport, [], {}, { skipPreamble: true });
            return {
                success: true,
                host,
                port: port ?? 22,
                vendor: result.vendorId,
                vendorLabel: result.vendorLabel,
                prompt: result.prompt,
                reliable: result.vendorId !== "conservative",
                note: (0, commandEngine_1.conservativeVendorNote)(result),
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "ssh_send_commands",
        description: "Sends commands over SSH and returns the output of each one. " +
            "Detects the vendor, applies the profile preamble (for example 'terminal length 0' on Cisco) " +
            "and discards the commands that would close the session. It is the recommended path over Telnet.",
        inputSchema: {
            host: zod_1.z.string().describe("Device IP or hostname"),
            username: zod_1.z.string().describe("SSH user"),
            commands: zod_1.z
                .array(zod_1.z.string())
                .min(1)
                .describe("Commands to send, in order"),
            password: zod_1.z
                .string()
                .optional()
                .describe("Password (if you use a private key, omit it)"),
            privateKey: zod_1.z
                .string()
                .optional()
                .describe("Private key in PEM format, as text"),
            port: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("SSH port (default 22)"),
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
        handler: async ({ host, username, commands, password, privateKey, port, idleMs, maxMs, }) => {
            const transport = await getSession(host, port ?? 22, {
                username,
                password,
                privateKey,
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
        name: "ssh_disconnect",
        description: "Closes the SSH session with a device to free it.",
        inputSchema: {
            host: zod_1.z.string().describe("Device IP or hostname"),
            username: zod_1.z
                .string()
                .optional()
                .describe("User of the session to close"),
            port: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("SSH port (default 22)"),
        },
        handler: async ({ host, username, port }) => {
            const key = sessionKey(host, port ?? 22, username);
            const transport = sessions.get(key);
            if (!transport) {
                return {
                    success: true,
                    closed: false,
                    message: `No open SSH session with ${host}:${port ?? 22}.`,
                };
            }
            await transport.disconnect();
            sessions.delete(key);
            return {
                success: true,
                closed: true,
                message: `SSH session with ${host}:${port ?? 22} closed.`,
            };
        },
    }),
];
exports.sshModule = {
    id: "ssh",
    prefix: "ssh_",
    description: "SSH sessions against real devices: detect the vendor and send configuration commands in encrypted form.",
    tools,
};
//# sourceMappingURL=index.js.map