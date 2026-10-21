"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelnetTransport = exports.SshTransport = exports.SerialTransport = void 0;
exports.listSerialPorts = listSerialPorts;
exports.createTransport = createTransport;
exports.waitFor = waitFor;
const serialport_1 = require("serialport");
const ssh2_1 = require("ssh2");
const node_net_1 = __importDefault(require("node:net"));
const errors_1 = require("../core/errors.js");
const EOL_BY_PROTOCOL = {
    SSH: "\r",
    TELNET: "\r\n",
    SERIAL: "\r\n",
};
async function waitFor(condition, timeoutMs, stepMs = 50) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (condition())
            return true;
        await new Promise((r) => setTimeout(r, stepMs));
    }
    return condition();
}
class SerialTransport {
    options;
    protocol = "SERIAL";
    port = null;
    buffer = "";
    lastData = 0;
    constructor(options) {
        this.options = options;
    }
    isConnected() {
        return Boolean(this.port?.isOpen);
    }
    async connect() {
        if (this.isConnected())
            return;
        const path = this.options.serialPort?.trim();
        if (!path) {
            throw new errors_1.McpToolError("NOT_CONFIGURED", "No serial port was specified.", {
                suggestion: "Call serial_list_ports to see the ports available on this machine and repeat the call with the matching 'path' (for example 'COM3' or '/dev/ttyUSB0').",
            });
        }
        const baudRate = this.options.baudRate ?? 9600;
        await new Promise((resolve, reject) => {
            const port = new serialport_1.SerialPort({ path, baudRate, autoOpen: false }, (error) => {
                if (error) {
                    reject(new errors_1.McpToolError("UNAVAILABLE", `Could not open the serial port '${path}': ${error.message}`, {
                        suggestion: "Check that the cable is connected, that no other program is using it (another console, PuTTY, the web app) and that the port name is correct according to serial_list_ports.",
                    }));
                }
            });
            port.on("data", (data) => {
                this.buffer += data.toString("utf8");
                this.lastData = Date.now();
            });
            port.on("error", (error) => {
                this.buffer += `\n[SERIAL PORT ERROR: ${error.message}]\n`;
                this.lastData = Date.now();
            });
            port.open((error) => {
                if (error) {
                    reject(new errors_1.McpToolError("UNAVAILABLE", `Could not open the serial port '${path}' at ${baudRate} baud: ${error.message}`, {
                        suggestion: "Verify that the port exists and is not in use by another program. On Windows it is usually 'COM3'; on Linux '/dev/ttyUSB0' and it may require permissions (dialout group).",
                    }));
                    return;
                }
                this.port = port;
                this.lastData = Date.now();
                resolve();
            });
        });
    }
    async disconnect() {
        const port = this.port;
        this.port = null;
        if (!port?.isOpen)
            return;
        await new Promise((resolve) => {
            port.close(() => resolve());
        });
    }
    async sendCommand(command) {
        if (!this.port?.isOpen) {
            throw new errors_1.McpToolError("NO_SESSION", "The serial port is not open.", {
                suggestion: "Call the tool again: the connection opens itself before sending the first command.",
            });
        }
        await new Promise((resolve, reject) => {
            this.port.write(`${command}${EOL_BY_PROTOCOL.SERIAL}`, (error) => {
                if (error) {
                    reject(new errors_1.McpToolError("OPERATION_FAILED", `Could not write to the serial port: ${error.message}`, { suggestion: "Check that the cable is still connected and that the device is powered on." }));
                    return;
                }
                this.port.drain(() => resolve());
            });
        });
    }
    async readOutput(options = {}) {
        const idleMs = options.idleMs ?? 700;
        const maxMs = options.maxMs ?? 20_000;
        const deadline = Date.now() + maxMs;
        while (Date.now() < deadline) {
            if (this.buffer.length > 0 && Date.now() - this.lastData >= idleMs)
                break;
            await new Promise((r) => setTimeout(r, 50));
        }
        const output = this.buffer;
        this.buffer = "";
        return output;
    }
}
exports.SerialTransport = SerialTransport;
async function listSerialPorts() {
    try {
        const ports = await serialport_1.SerialPort.list();
        return ports.map((port) => ({
            path: port.path,
            manufacturer: port.manufacturer ?? null,
            serialNumber: port.serialNumber ?? null,
            vendorId: port.vendorId ?? null,
            productId: port.productId ?? null,
            pnpId: port.pnpId ?? null,
        }));
    }
    catch (error) {
        throw new errors_1.McpToolError("UNAVAILABLE", `Could not enumerate the serial ports: ${error instanceof Error ? error.message : String(error)}`, {
            suggestion: "On Linux the 'udev' package or permissions on /dev/ttyUSB* may be missing; on Windows, check that the USB-serial adapter driver is installed. The other domains (packet-tracer, gns3, ssh) keep working.",
        });
    }
}
class SshTransport {
    options;
    protocol = "SSH";
    client = null;
    stream = null;
    buffer = "";
    lastData = 0;
    constructor(options) {
        this.options = options;
    }
    isConnected() {
        return Boolean(this.stream);
    }
    async connect() {
        if (this.isConnected())
            return;
        const host = this.options.host?.trim();
        if (!host) {
            throw new errors_1.McpToolError("NOT_CONFIGURED", "No SSH host was specified.", {
                suggestion: "Set the 'host' parameter with the device IP or hostname, and optionally 'port' (default 22).",
            });
        }
        const client = new ssh2_1.Client();
        await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new errors_1.McpToolError("TIMEOUT", `The SSH connection to ${host} was not established in time.`, {
                    suggestion: "Check that the device is reachable (ping), that the SSH service is running and that the port is correct.",
                }));
            }, 15_000);
            client.on("ready", () => {
                client.shell((error, stream) => {
                    if (error) {
                        clearTimeout(timeoutId);
                        reject(new errors_1.McpToolError("OPERATION_FAILED", `Could not open the SSH shell: ${error.message}`, {
                            suggestion: "The device accepted the connection but rejected the shell. Check that the user is allowed to open an interactive session.",
                        }));
                        return;
                    }
                    stream.on("data", (data) => {
                        this.buffer += data.toString("utf8");
                        this.lastData = Date.now();
                    });
                    stream.stderr.on("data", (data) => {
                        this.buffer += data.toString("utf8");
                        this.lastData = Date.now();
                    });
                    stream.on("close", () => {
                        this.stream = null;
                    });
                    this.stream = stream;
                    this.lastData = Date.now();
                    clearTimeout(timeoutId);
                    resolve();
                });
            });
            client.on("error", (error) => {
                clearTimeout(timeoutId);
                reject(new errors_1.McpToolError("UNAVAILABLE", `SSH connection error with ${host}: ${error.message}`, {
                    suggestion: "Check host, port and credentials. If the device requires a public key, pass it in 'privateKey'. Also verify that the user and password are correct.",
                }));
            });
            client.connect({
                host,
                port: this.options.port ?? 22,
                username: this.options.username ?? undefined,
                password: this.options.password ?? undefined,
                privateKey: this.options.privateKey ?? undefined,
                readyTimeout: 15_000,
            });
        });
        this.client = client;
    }
    async disconnect() {
        this.stream?.close();
        this.stream = null;
        this.client?.end();
        this.client = null;
    }
    async sendCommand(command) {
        if (!this.stream) {
            throw new errors_1.McpToolError("NO_SESSION", "The SSH session is not open.", {
                suggestion: "Call the tool again: the connection opens itself before the first command.",
            });
        }
        this.stream.write(`${command}${EOL_BY_PROTOCOL.SSH}`);
    }
    async readOutput(options = {}) {
        const idleMs = options.idleMs ?? 700;
        const maxMs = options.maxMs ?? 20_000;
        const deadline = Date.now() + maxMs;
        while (Date.now() < deadline) {
            if (this.buffer.length > 0 && Date.now() - this.lastData >= idleMs)
                break;
            await new Promise((r) => setTimeout(r, 50));
        }
        const output = this.buffer;
        this.buffer = "";
        return output;
    }
}
exports.SshTransport = SshTransport;
class TelnetTransport {
    options;
    protocol = "TELNET";
    socket = null;
    buffer = "";
    lastData = 0;
    constructor(options) {
        this.options = options;
    }
    isConnected() {
        return Boolean(this.socket && !this.socket.destroyed);
    }
    async connect() {
        if (this.isConnected())
            return;
        const host = this.options.host?.trim();
        if (!host) {
            throw new errors_1.McpToolError("NOT_CONFIGURED", "No Telnet host was specified.", {
                suggestion: "Set the 'host' parameter with the device IP or hostname, and optionally 'port' (default 23).",
            });
        }
        const port = this.options.port ?? 23;
        await new Promise((resolve, reject) => {
            const socket = new node_net_1.default.Socket();
            const timeoutId = setTimeout(() => {
                socket.destroy();
                reject(new errors_1.McpToolError("TIMEOUT", `The Telnet connection to ${host}:${port} was not established in time.`, {
                    suggestion: "Check that the device is reachable and that the Telnet service is enabled. Many modern devices ship with it disabled: in that case use SSH.",
                }));
            }, 15_000);
            socket.on("data", (data) => {
                this.buffer += data.toString("utf8");
                this.lastData = Date.now();
            });
            socket.on("error", (error) => {
                clearTimeout(timeoutId);
                reject(new errors_1.McpToolError("UNAVAILABLE", `Telnet connection error with ${host}:${port}: ${error.message}`, {
                    suggestion: "Verify host, port and credentials. If the device only accepts SSH, use the tools from the ssh_ domain.",
                }));
            });
            socket.connect(port, host, () => {
                clearTimeout(timeoutId);
                this.socket = socket;
                this.lastData = Date.now();
                resolve();
            });
        });
        const username = this.options.username?.trim();
        if (username) {
            await this.waitForOutput(1500);
            await this.sendCommand(username);
            if (this.options.password !== undefined) {
                await this.waitForOutput(1500);
                await this.sendCommand(this.options.password ?? "");
            }
        }
    }
    async waitForOutput(ms) {
        const deadline = Date.now() + ms;
        while (Date.now() < deadline) {
            if (this.buffer.length > 0 && Date.now() - this.lastData > 200)
                return;
            await new Promise((r) => setTimeout(r, 100));
            if (Date.now() - this.lastData > 400)
                return;
        }
    }
    async disconnect() {
        const socket = this.socket;
        this.socket = null;
        if (!socket || socket.destroyed)
            return;
        await new Promise((resolve) => {
            socket.end(() => {
                socket.destroy();
                resolve();
            });
            setTimeout(() => {
                socket.destroy();
                resolve();
            }, 1000);
        });
    }
    async sendCommand(command) {
        if (!this.socket || this.socket.destroyed) {
            throw new errors_1.McpToolError("NO_SESSION", "The Telnet session is not open.", {
                suggestion: "Call the tool again: the connection opens itself before the first command.",
            });
        }
        this.socket.write(`${command}${EOL_BY_PROTOCOL.TELNET}`);
    }
    async readOutput(options = {}) {
        const idleMs = options.idleMs ?? 700;
        const maxMs = options.maxMs ?? 20_000;
        const deadline = Date.now() + maxMs;
        while (Date.now() < deadline) {
            if (this.buffer.length > 0 && Date.now() - this.lastData >= idleMs)
                break;
            await new Promise((r) => setTimeout(r, 50));
        }
        const output = this.buffer;
        this.buffer = "";
        return output;
    }
}
exports.TelnetTransport = TelnetTransport;
function createTransport(options) {
    switch (options.protocol) {
        case "SERIAL":
            return new SerialTransport(options);
        case "SSH":
            return new SshTransport(options);
        case "TELNET":
            return new TelnetTransport(options);
        default:
            return throwUnknownProtocol(options.protocol);
    }
}
function throwUnknownProtocol(protocol) {
    throw new errors_1.McpToolError("VALIDATION", `Unsupported transport protocol: ${String(protocol)}`, { suggestion: "Use one of: SERIAL, SSH or TELNET." });
}
//# sourceMappingURL=adapters.js.map