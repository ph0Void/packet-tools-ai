
import { z } from "zod";
import type {
  DomainModule,
  AnyToolDefinition,
} from "@/core/ToolRegistry";
import { defineTool } from "@/core/ToolRegistry";
import { createTransport } from "@/transports/adapters";
import {
  runCommands,
  conservativeVendorNote,
} from "@/transports/commandEngine";
import type { DeviceTransport } from "@/transports/DeviceTransport";


const sessions = new Map<string, DeviceTransport>();


function sessionKey(host: string, port: number, username?: string): string {
  return `${username ?? "anon"}@${host}:${port}`;
}


async function getSession(
  host: string,
  port: number,
  credentials: { username?: string; password?: string; privateKey?: string },
): Promise<DeviceTransport> {
  const key = sessionKey(host, port, credentials.username);
  const existing = sessions.get(key);
  if (existing?.isConnected()) return existing;

  const transport = createTransport({
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


export async function closeSshSessions(): Promise<void> {
  for (const transport of sessions.values()) {
    await transport.disconnect().catch(() => undefined);
  }
  sessions.clear();
}

const tools: AnyToolDefinition[] = [
  defineTool({
    name: "ssh_detect_vendor",
    description:
      "Connects to a device over SSH, reads its prompt and determines the VENDOR (Cisco IOS, Huawei VRP, MikroTik, ArubaOS, JunOS or generic). " +
      "Use it before configuring so the commands use the correct syntax.",
    inputSchema: {
      host: z.string().describe("Device IP or hostname"),
      username: z.string().describe("SSH user"),
      password: z
        .string()
        .optional()
        .describe("Password (if you use a private key, omit it)"),
      privateKey: z
        .string()
        .optional()
        .describe("Private key in PEM format, as text"),
      port: z
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
      const result = await runCommands(
        transport,
        [],
        {},
        { skipPreamble: true },
      );
      return {
        success: true,
        host,
        port: port ?? 22,
        vendor: result.vendorId,
        vendorLabel: result.vendorLabel,
        prompt: result.prompt,
        reliable: result.vendorId !== "conservative",
        note: conservativeVendorNote(result),
      };
    },
  }),
  defineTool({
    name: "ssh_send_commands",
    description:
      "Sends commands over SSH and returns the output of each one. " +
      "Detects the vendor, applies the profile preamble (for example 'terminal length 0' on Cisco) " +
      "and discards the commands that would close the session. It is the recommended path over Telnet.",
    inputSchema: {
      host: z.string().describe("Device IP or hostname"),
      username: z.string().describe("SSH user"),
      commands: z
        .array(z.string())
        .min(1)
        .describe("Commands to send, in order"),
      password: z
        .string()
        .optional()
        .describe("Password (if you use a private key, omit it)"),
      privateKey: z
        .string()
        .optional()
        .describe("Private key in PEM format, as text"),
      port: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("SSH port (default 22)"),
      idleMs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Silence to consider the output finished (default 700 ms)"),
      maxMs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum wait per command (default 20000 ms)"),
    },
    handler: async ({
      host,
      username,
      commands,
      password,
      privateKey,
      port,
      idleMs,
      maxMs,
    }) => {
      const transport = await getSession(host, port ?? 22, {
        username,
        password,
        privateKey,
      });
      const result = await runCommands(
        transport,
        commands,
        {},
        { idleMs, maxMs },
      );
      return {
        success: true,
        host,
        vendor: result.vendorId,
        vendorLabel: result.vendorLabel,
        prompt: result.prompt,
        durationMs: result.durationMs,
        output: result.output,
        note: conservativeVendorNote(result),
      };
    },
  }),
  defineTool({
    name: "ssh_disconnect",
    description: "Closes the SSH session with a device to free it.",
    inputSchema: {
      host: z.string().describe("Device IP or hostname"),
      username: z
        .string()
        .optional()
        .describe("User of the session to close"),
      port: z
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

export const sshModule: DomainModule = {
  id: "ssh",
  prefix: "ssh_",
  description:
    "SSH sessions against real devices: detect the vendor and send configuration commands in encrypted form.",
  tools,
};
