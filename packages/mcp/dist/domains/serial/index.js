"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialModule = void 0;
exports.closeSerialSessions = closeSerialSessions;
const zod_1 = require("zod");
const ToolRegistry_1 = require("../../core/ToolRegistry.js");
const adapters_1 = require("../../transports/adapters.js");
const commandEngine_1 = require("../../transports/commandEngine.js");
const PrismaClient_1 = require("../../prisma/lib/PrismaClient.js");
const Logger_1 = require("../../utils/Logger.js");
const sessions = new Map();
function sessionKey(port, baudRate) {
    return `${port}@${baudRate}`;
}
async function getSession(port, baudRate) {
    const key = sessionKey(port, baudRate);
    const existing = sessions.get(key);
    if (existing?.isConnected()) {
        return { transport: existing, typeDevice: await typeDeviceForPort(port) };
    }
    const transport = (0, adapters_1.createTransport)({
        protocol: "SERIAL",
        serialPort: port,
        baudRate,
    });
    await transport.connect();
    sessions.set(key, transport);
    return { transport, typeDevice: await typeDeviceForPort(port) };
}
async function typeDeviceForPort(port) {
    try {
        const row = await PrismaClient_1.prismaClient.deviceProviderMcp.findFirst({
            where: { serialPort: port },
            select: { typeDevice: true },
        });
        return row?.typeDevice ?? null;
    }
    catch (error) {
        Logger_1.Logger.debug(`Could not read the declared device type of port ${port}.`, {
            error: String(error),
        });
        return null;
    }
}
async function closeSerialSessions() {
    for (const [key, transport] of sessions) {
        try {
            await transport.disconnect();
        }
        catch (error) {
            Logger_1.Logger.debug(`Error closing the serial session ${key}.`, { error: String(error) });
        }
    }
    sessions.clear();
}
const tools = [
    (0, ToolRegistry_1.defineTool)({
        name: "serial_list_ports",
        description: "Lists the serial ports available on THIS machine (COM3, /dev/ttyUSB0...), with the adapter manufacturer and serial number when the system exposes them. " +
            "Use it before connecting: it is the way to know the exact port name. " +
            "The 'manufacturer' field helps recognize the USB-serial adapter (for example an FTDI or Prolific console cable).",
        inputSchema: {},
        handler: async () => {
            const ports = await (0, adapters_1.listSerialPorts)();
            if (ports.length === 0) {
                return {
                    success: true,
                    ports: [],
                    message: "No serial port was detected on this machine. Check that the USB-serial adapter is connected " +
                        "and that its driver is installed; on Linux it may require permissions on /dev/ttyUSB*.",
                };
            }
            return {
                success: true,
                total: ports.length,
                ports,
                help: "Use the 'path' field of a port in the serial_send_commands or serial_detect_vendor tools. " +
                    "Most network consoles work at 9600 baud (the default value).",
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "serial_detect_vendor",
        description: "Opens the serial port, reads the device banner/prompt and determines its VENDOR (Cisco IOS, Huawei VRP, MikroTik RouterOS, ArubaOS, JunOS or generic). " +
            "It is the step that later lets it send the commands with the correct syntax. " +
            "Use it right after connecting the cable: if the device is booting, press Enter to trigger the prompt.",
        inputSchema: {
            path: zod_1.z.string().describe("Serial port, exactly as returned by serial_list_ports (for example 'COM3' or '/dev/ttyUSB0')"),
            baudRate: zod_1.z.number().int().positive().optional().describe("Baud rate (default 9600)"),
            sendEnter: zod_1.z
                .boolean()
                .optional()
                .describe("Sends an Enter before reading to force the prompt to appear (default true)"),
        },
        handler: async ({ path: port, baudRate, sendEnter }) => {
            const speed = baudRate ?? 9600;
            const { transport, typeDevice } = await getSession(port, speed);
            if (sendEnter !== false) {
                await transport.sendCommand("");
                await transport.readOutput({ idleMs: 700, maxMs: 4000 });
            }
            const result = await (0, commandEngine_1.runCommands)(transport, [], { typeDevice }, { skipPreamble: true });
            await saveDetection(port, result.vendorId, result.prompt);
            return {
                success: true,
                port,
                baudRate: speed,
                vendor: result.vendorId,
                vendorLabel: result.vendorLabel,
                detectedPrompt: result.prompt,
                reliable: result.vendorId !== "conservative",
                message: result.vendorId === "conservative"
                    ? "The vendor could not be identified. The device may be off, booting, or its prompt may not reveal the brand. " +
                        "If you know the brand, set it when configuring the device (typeDevice) so its syntax is used; meanwhile the commands will be sent as-is, without a preamble or mode transitions."
                    : `Vendor identified: ${result.vendorLabel}. The commands will be sent with its syntax.`,
                note: (0, commandEngine_1.conservativeVendorNote)(result),
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "serial_send_commands",
        description: "Sends one or more commands over the serial port and returns the output of each one. " +
            "Resolves the vendor before sending (or uses the one already detected), applies the profile preamble to disable pagination " +
            "and discards the commands that would close the session (exit, quit, logout). " +
            "Use it both to read ('show running-config') and to configure.",
        inputSchema: {
            path: zod_1.z.string().describe("Serial port (the same one returned by serial_list_ports)"),
            commands: zod_1.z
                .array(zod_1.z.string())
                .min(1)
                .describe("Commands to send, one per element, in order"),
            baudRate: zod_1.z.number().int().positive().optional().describe("Baud rate (default 9600)"),
            idleMs: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Milliseconds of silence to consider the output finished (default 700). Raise it if the output is cut off."),
            maxMs: zod_1.z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Maximum wait time per command in milliseconds (default 20000)"),
        },
        handler: async ({ path: port, commands, baudRate, idleMs, maxMs }) => {
            const speed = baudRate ?? 9600;
            const { transport, typeDevice } = await getSession(port, speed);
            const result = await (0, commandEngine_1.runCommands)(transport, commands, { typeDevice }, { idleMs, maxMs });
            await saveDetection(port, result.vendorId, result.prompt);
            return {
                success: true,
                port,
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
        name: "serial_read_console",
        description: "Reads what the device is emitting over the serial port WITHOUT sending any command. " +
            "Use it to see the device boot, log messages or check whether it is alive.",
        inputSchema: {
            path: zod_1.z.string().describe("Serial port"),
            baudRate: zod_1.z.number().int().positive().optional().describe("Baud rate (default 9600)"),
            maxMs: zod_1.z.number().int().positive().optional().describe("How long to listen in milliseconds (default 3000)"),
        },
        handler: async ({ path: port, baudRate, maxMs }) => {
            const speed = baudRate ?? 9600;
            const { transport } = await getSession(port, speed);
            const output = await transport.readOutput({
                idleMs: 500,
                maxMs: maxMs ?? 3000,
            });
            return {
                success: true,
                port,
                output,
                message: output.trim().length === 0
                    ? "Nothing was received from the device. Check that it is powered on, that the cable is a console cable (not just a data one), and that the baud rate is correct."
                    : "Output read successfully.",
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "serial_disconnect",
        description: "Closes the serial port session to free it so another program (or the user) can use it. " +
            "Use it when you are done working with a physical device.",
        inputSchema: {
            path: zod_1.z.string().describe("Serial port to release"),
            baudRate: zod_1.z.number().int().positive().optional().describe("Baud rate it was opened at (default 9600)"),
        },
        handler: async ({ path: port, baudRate }) => {
            const key = sessionKey(port, baudRate ?? 9600);
            const transport = sessions.get(key);
            if (!transport) {
                return {
                    success: true,
                    released: false,
                    message: `No open session on ${port}.`,
                };
            }
            await transport.disconnect();
            sessions.delete(key);
            return { success: true, released: true, message: `Port ${port} released.` };
        },
    }),
];
async function saveDetection(port, vendorId, prompt) {
    try {
        const device = await PrismaClient_1.prismaClient.deviceProviderMcp.findFirst({
            where: { serialPort: port },
            select: { id: true },
        });
        if (!device)
            return;
        await PrismaClient_1.prismaClient.vendorCacheMcp.upsert({
            where: { providerId: device.id },
            create: {
                providerId: device.id,
                vendorId,
                prompt,
                source: vendorId === "conservative" ? "conservative" : "prompt",
            },
            update: {
                vendorId,
                prompt,
                source: vendorId === "conservative" ? "conservative" : "prompt",
            },
        });
    }
    catch (error) {
        Logger_1.Logger.debug(`Could not cache the vendor detection for ${port}.`, {
            error: String(error),
        });
    }
}
exports.serialModule = {
    id: "serial",
    prefix: "serial_",
    description: "Serial port / physical console (RS-232, USB): enumerate ports, detect the vendor of the connected device and send configuration commands.",
    tools,
};
//# sourceMappingURL=index.js.map