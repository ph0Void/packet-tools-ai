import { SerialPort } from "serialport";
import { Client as Ssh2Client } from "ssh2";
import net from "node:net";
import type {
  DeviceTransport,
  ConnectionOptions,
  TransportProtocol,
} from "./DeviceTransport";
import { McpToolError } from "@/core/errors";

const EOL_BY_PROTOCOL: Record<TransportProtocol, string> = {
  SSH: "\r",
  TELNET: "\r\n",
  SERIAL: "\r\n",
};

async function waitFor(
  condition: () => boolean,
  timeoutMs: number,
  stepMs = 50,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return condition();
}

export class SerialTransport implements DeviceTransport {
  readonly protocol: TransportProtocol = "SERIAL";
  private port: SerialPort | null = null;
  private buffer = "";
  private lastData = 0;

  constructor(private readonly options: ConnectionOptions) {}

  isConnected(): boolean {
    return Boolean(this.port?.isOpen);
  }

  async connect(): Promise<void> {
    if (this.isConnected()) return;

    const path = this.options.serialPort?.trim();
    if (!path) {
      throw new McpToolError(
        "NOT_CONFIGURED",
        "No serial port was specified.",
        {
          suggestion:
            "Call serial_list_ports to see the ports available on this machine and repeat the call with the matching 'path' (for example 'COM3' or '/dev/ttyUSB0').",
        },
      );
    }

    const baudRate = this.options.baudRate ?? 9600;

    await new Promise<void>((resolve, reject) => {
      const port = new SerialPort(
        { path, baudRate, autoOpen: false },
        (error) => {
          if (error) {
            reject(
              new McpToolError(
                "UNAVAILABLE",
                `Could not open the serial port '${path}': ${error.message}`,
                {
                  suggestion:
                    "Check that the cable is connected, that no other program is using it (another console, PuTTY, the web app) and that the port name is correct according to serial_list_ports.",
                },
              ),
            );
          }
        },
      );

      port.on("data", (data: Buffer) => {
        this.buffer += data.toString("utf8");
        this.lastData = Date.now();
      });

      port.on("error", (error: Error) => {
        this.buffer += `\n[SERIAL PORT ERROR: ${error.message}]\n`;
        this.lastData = Date.now();
      });

      port.open((error) => {
        if (error) {
          reject(
            new McpToolError(
              "UNAVAILABLE",
              `Could not open the serial port '${path}' at ${baudRate} baud: ${error.message}`,
              {
                suggestion:
                  "Verify that the port exists and is not in use by another program. On Windows it is usually 'COM3'; on Linux '/dev/ttyUSB0' and it may require permissions (dialout group).",
              },
            ),
          );
          return;
        }
        this.port = port;
        this.lastData = Date.now();
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    const port = this.port;
    this.port = null;
    if (!port?.isOpen) return;
    await new Promise<void>((resolve) => {
      port.close(() => resolve());
    });
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.port?.isOpen) {
      throw new McpToolError("NO_SESSION", "The serial port is not open.", {
        suggestion: "Call the tool again: the connection opens itself before sending the first command.",
      });
    }
    await new Promise<void>((resolve, reject) => {
      this.port!.write(`${command}${EOL_BY_PROTOCOL.SERIAL}`, (error) => {
        if (error) {
          reject(
            new McpToolError(
              "OPERATION_FAILED",
              `Could not write to the serial port: ${error.message}`,
              { suggestion: "Check that the cable is still connected and that the device is powered on." },
            ),
          );
          return;
        }
        this.port!.drain(() => resolve());
      });
    });
  }

  async readOutput(options: { idleMs?: number; maxMs?: number } = {}): Promise<string> {
    const idleMs = options.idleMs ?? 700;
    const maxMs = options.maxMs ?? 20_000;
    const deadline = Date.now() + maxMs;

    while (Date.now() < deadline) {
      if (this.buffer.length > 0 && Date.now() - this.lastData >= idleMs) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const output = this.buffer;
    this.buffer = "";
    return output;
  }
}

export async function listSerialPorts(): Promise<
  Array<{
    path: string;
    manufacturer: string | null;
    serialNumber: string | null;
    vendorId: string | null;
    productId: string | null;
    pnpId: string | null;
  }>
> {
  try {
    const ports = await SerialPort.list();
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer ?? null,
      serialNumber: port.serialNumber ?? null,
      vendorId: port.vendorId ?? null,
      productId: port.productId ?? null,
      pnpId: port.pnpId ?? null,
    }));
  } catch (error) {
    throw new McpToolError(
      "UNAVAILABLE",
      `Could not enumerate the serial ports: ${error instanceof Error ? error.message : String(error)}`,
      {
        suggestion:
          "On Linux the 'udev' package or permissions on /dev/ttyUSB* may be missing; on Windows, check that the USB-serial adapter driver is installed. The other domains (packet-tracer, gns3, ssh) keep working.",
      },
    );
  }
}

export class SshTransport implements DeviceTransport {
  readonly protocol: TransportProtocol = "SSH";
  private client: Ssh2Client | null = null;
  private stream: import("ssh2").ClientChannel | null = null;
  private buffer = "";
  private lastData = 0;

  constructor(private readonly options: ConnectionOptions) {}

  isConnected(): boolean {
    return Boolean(this.stream);
  }

  async connect(): Promise<void> {
    if (this.isConnected()) return;

    const host = this.options.host?.trim();
    if (!host) {
      throw new McpToolError("NOT_CONFIGURED", "No SSH host was specified.", {
        suggestion: "Set the 'host' parameter with the device IP or hostname, and optionally 'port' (default 22).",
      });
    }

    const client = new Ssh2Client();

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new McpToolError("TIMEOUT", `The SSH connection to ${host} was not established in time.`, {
            suggestion: "Check that the device is reachable (ping), that the SSH service is running and that the port is correct.",
          }),
        );
      }, 15_000);

      client.on("ready", () => {
        client.shell((error, stream) => {
          if (error) {
            clearTimeout(timeoutId);
            reject(
              new McpToolError("OPERATION_FAILED", `Could not open the SSH shell: ${error.message}`, {
                suggestion: "The device accepted the connection but rejected the shell. Check that the user is allowed to open an interactive session.",
              }),
            );
            return;
          }

          stream.on("data", (data: Buffer) => {
            this.buffer += data.toString("utf8");
            this.lastData = Date.now();
          });
          stream.stderr.on("data", (data: Buffer) => {
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

      client.on("error", (error: Error) => {
        clearTimeout(timeoutId);
        reject(
          new McpToolError("UNAVAILABLE", `SSH connection error with ${host}: ${error.message}`, {
            suggestion:
              "Check host, port and credentials. If the device requires a public key, pass it in 'privateKey'. Also verify that the user and password are correct.",
          }),
        );
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

  async disconnect(): Promise<void> {
    this.stream?.close();
    this.stream = null;
    this.client?.end();
    this.client = null;
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.stream) {
      throw new McpToolError("NO_SESSION", "The SSH session is not open.", {
        suggestion: "Call the tool again: the connection opens itself before the first command.",
      });
    }
    this.stream.write(`${command}${EOL_BY_PROTOCOL.SSH}`);
  }

  async readOutput(options: { idleMs?: number; maxMs?: number } = {}): Promise<string> {
    const idleMs = options.idleMs ?? 700;
    const maxMs = options.maxMs ?? 20_000;
    const deadline = Date.now() + maxMs;

    while (Date.now() < deadline) {
      if (this.buffer.length > 0 && Date.now() - this.lastData >= idleMs) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const output = this.buffer;
    this.buffer = "";
    return output;
  }
}

export class TelnetTransport implements DeviceTransport {
  readonly protocol: TransportProtocol = "TELNET";
  private socket: net.Socket | null = null;
  private buffer = "";
  private lastData = 0;

  constructor(private readonly options: ConnectionOptions) {}

  isConnected(): boolean {
    return Boolean(this.socket && !this.socket.destroyed);
  }

  async connect(): Promise<void> {
    if (this.isConnected()) return;

    const host = this.options.host?.trim();
    if (!host) {
      throw new McpToolError("NOT_CONFIGURED", "No Telnet host was specified.", {
        suggestion: "Set the 'host' parameter with the device IP or hostname, and optionally 'port' (default 23).",
      });
    }

    const port = this.options.port ?? 23;

    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();

      const timeoutId = setTimeout(() => {
        socket.destroy();
        reject(
          new McpToolError("TIMEOUT", `The Telnet connection to ${host}:${port} was not established in time.`, {
            suggestion:
              "Check that the device is reachable and that the Telnet service is enabled. Many modern devices ship with it disabled: in that case use SSH.",
          }),
        );
      }, 15_000);

      socket.on("data", (data: Buffer) => {
        this.buffer += data.toString("utf8");
        this.lastData = Date.now();
      });

      socket.on("error", (error: Error) => {
        clearTimeout(timeoutId);
        reject(
          new McpToolError("UNAVAILABLE", `Telnet connection error with ${host}:${port}: ${error.message}`, {
            suggestion:
              "Verify host, port and credentials. If the device only accepts SSH, use the tools from the ssh_ domain.",
          }),
        );
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

  private async waitForOutput(ms: number): Promise<void> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      if (this.buffer.length > 0 && Date.now() - this.lastData > 200) return;
      await new Promise((r) => setTimeout(r, 100));
      if (Date.now() - this.lastData > 400) return;
    }
  }

  async disconnect(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    if (!socket || socket.destroyed) return;
    await new Promise<void>((resolve) => {
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

  async sendCommand(command: string): Promise<void> {
    if (!this.socket || this.socket.destroyed) {
      throw new McpToolError("NO_SESSION", "The Telnet session is not open.", {
        suggestion: "Call the tool again: the connection opens itself before the first command.",
      });
    }
    this.socket.write(`${command}${EOL_BY_PROTOCOL.TELNET}`);
  }

  async readOutput(options: { idleMs?: number; maxMs?: number } = {}): Promise<string> {
    const idleMs = options.idleMs ?? 700;
    const maxMs = options.maxMs ?? 20_000;
    const deadline = Date.now() + maxMs;

    while (Date.now() < deadline) {
      if (this.buffer.length > 0 && Date.now() - this.lastData >= idleMs) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const output = this.buffer;
    this.buffer = "";
    return output;
  }
}

export function createTransport(options: ConnectionOptions): DeviceTransport {
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

function throwUnknownProtocol(protocol: never): never {
  throw new McpToolError(
    "VALIDATION",
    `Unsupported transport protocol: ${String(protocol)}`,
    { suggestion: "Use one of: SERIAL, SSH or TELNET." },
  );
}

export { waitFor };
