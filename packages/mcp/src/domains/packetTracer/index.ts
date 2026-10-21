
import { z } from "zod";
import { defineTool } from "@/core/ToolRegistry";
import type { DomainModule, AnyToolDefinition } from "@/core/ToolRegistry";
import { Logger } from "@/utils/Logger";
import { envConfig } from "@/config/EnvConfig";
import { callPacketTracer, isOperationOk } from "./PacketTracerBridge";
import { getBridgeState } from "./PacketTracerBridgeServer";


async function simple(
  tool: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const result = await callPacketTracer(tool, input);
  return result ?? { success: false, error: "The extension returned no data." };
}


async function readDeviceModelCatalog(): Promise<string[]> {
  const raw = (await callPacketTracer("listDeviceModels", {})) as Record<
    string,
    unknown
  >;
  if (!raw || raw.success === false || raw.error) return [];

  const catalog = (raw.models ??
    (raw.data as Record<string, unknown>)?.models ??
    raw.data) as unknown;
  if (!Array.isArray(catalog)) return [];

  const ids: string[] = [];
  for (const entry of catalog) {
    if (typeof entry === "string" || typeof entry === "number") {
      ids.push(String(entry).trim());
      continue;
    }

    const id = (entry as { id?: unknown })?.id;
    if (typeof id === "string" && id.trim()) ids.push(id.trim());
  }
  return Array.from(new Set(ids.filter(Boolean)));
}


function similarModels(requested: string, catalog: string[]): string[] {
  const term = requested.trim().toLowerCase();
  if (!term) return [];
  return catalog
    .map((candidate) => {
      const model = candidate.toLowerCase();
      let common = 0;
      while (
        common < term.length &&
        common < model.length &&
        term[common] === model[common]
      ) {
        common++;
      }

      const contains = model.includes(term) || term.includes(model);

      const score = common < 2 && !contains ? 0 : common * 2 + (contains ? 1 : 0);
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.length - b.candidate.length)
    .slice(0, 5)
    .map((entry) => entry.candidate);
}


const LINK_TYPES = ["straight", "cross", "fiber", "serial", "auto"] as const;


const SIMULATION_MODES = ["realtime", "simulation"] as const;




const tools: AnyToolDefinition[] = [
  
  
  
  defineTool({
    name: "packet_tracer_list_device_models",
    description:
      "Lists the REAL catalog of device models that this Packet Tracer installation accepts. " +
      "Use it before adding a device if you are not sure of the exact model identifier: the catalog is decided by the engine, " +
      "not by this tool, and the comparison is case-sensitive.",
    inputSchema: {},
    handler: async () => simple("listDeviceModels", {}),
  }),
  defineTool({
    name: "packet_tracer_get_network",
    description:
      "Returns the current Packet Tracer topology: devices with their interfaces (name, whether they are in use, IP) and the links between them. " +
      "It is the main read to know what is on the canvas before changing anything.",
    inputSchema: {},
    handler: async () => simple("getNetwork", {}),
  }),
  defineTool({
    name: "packet_tracer_get_device_info",
    description:
      "Returns the profile of a specific device (model, type, its interfaces and its links). " +
      "Use it when you need free ports to cable or to confirm that a device exists.",
    inputSchema: {
      deviceName: z.string().describe("Exact name of the device on the canvas, for example 'R1' or 'PC1'"),
    },
    handler: async ({ deviceName }) => simple("getDeviceInfo", { deviceName }),
  }),
  defineTool({
    name: "packet_tracer_list_device_modules",
    description:
      "Lists the expansion modules a specific device supports (for example HWIC-2T serial cards). " +
      "Use it before installing a module to know the correct model.",
    inputSchema: {
      deviceName: z.string().describe("Name of the existing device"),
    },
    handler: async ({ deviceName }) => simple("listDeviceModules", { deviceName }),
  }),
  defineTool({
    name: "packet_tracer_get_device_config_snapshot",
    description:
      "Reads the full configuration of an IOS device (running-config, startup-config and its internal XML). " +
      "Use it to VERIFY that a configuration was really applied, instead of assuming it.",
    inputSchema: {
      deviceName: z.string().describe("Name of the IOS device to read the configuration from"),
    },
    handler: async ({ deviceName }) => simple("getDeviceConfigSnapshot", { deviceName }),
  }),
  defineTool({
    name: "packet_tracer_read_console",
    description:
      "Reads the last lines of a device's console (equivalent to looking at the CLI screen). " +
      "Use it to check a device's state or see the result of a command without sending anything.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      lines: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe("How many lines to read (default 40, maximum 5000)"),
    },
    handler: async ({ deviceName, lines }) =>
      simple("readDeviceConsole", { deviceName, lines }),
  }),
  defineTool({
    name: "packet_tracer_get_command_log",
    description:
      "Returns the history of commands executed on a device, with the time and the prompt they were executed at. " +
      "Use it to audit what has been sent to a device.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of entries to return (default 50, maximum 500)"),
    },
    handler: async ({ deviceName, limit }) => simple("getCommandLog", { deviceName, limit }),
  }),
  defineTool({
    name: "packet_tracer_get_routing_table",
    description:
      "Returns the routing table of an IOS device (equivalent to 'show ip route'). " +
      "Use it to check that routing was configured correctly.",
    inputSchema: {
      deviceName: z.string().describe("Name of the router or multilayer switch"),
    },
    handler: async ({ deviceName }) => simple("getRoutingTable", { deviceName }),
  }),
  defineTool({
    name: "packet_tracer_get_vlan_configuration",
    description:
      "Returns the VLAN configuration of a switch (defined VLANs and CLI output). " +
      "It only works on switches; on other device types the engine rejects it.",
    inputSchema: {
      switchName: z.string().describe("Switch name"),
    },
    handler: async ({ switchName }) => simple("getVlanConfiguration", { switchName }),
  }),
  defineTool({
    name: "packet_tracer_get_device_metrics",
    description:
      "Returns metrics of a device: power status, status of each interface and extended metrics. " +
      "Use it to diagnose why a link is not coming up.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
    },
    handler: async ({ deviceName }) => simple("getDeviceMetrics", { deviceName }),
  }),
  defineTool({
    name: "packet_tracer_validate_security_config",
    description:
      "Reviews the security posture of an IOS device: whether it has passwords, whether SSH is enabled and whether Telnet is disabled. " +
      "It also returns a list of warnings. Use it to audit an already-configured device.",
    inputSchema: {
      deviceName: z.string().describe("Name of the IOS device to audit"),
    },
    handler: async ({ deviceName }) => simple("validateSecurityConfig", { deviceName }),
  }),
  defineTool({
    name: "packet_tracer_validate_topology",
    description:
      "Analyzes the whole topology and returns errors, warnings, orphan devices, loops and unresolved links. " +
      "Use it as a quality check after building a topology.",
    inputSchema: {},
    handler: async () => simple("validateTopology", {}),
  }),
  defineTool({
    name: "packet_tracer_generate_network_report",
    description:
      "Generates a readable report of the current topology: device inventory, addressing and links. " +
      "Use it to summarize the state of the network for the user.",
    inputSchema: {},
    handler: async () => {
      
      
      
      const network = (await callPacketTracer("getNetwork", {})) as {
        result?: {
          deviceCount?: number;
          connectionCount?: number;
          devices?: Array<Record<string, unknown>>;
          connections?: Array<Record<string, unknown>>;
        };
      };

      const validation = (await callPacketTracer("validateTopology", {})) as Record<
        string,
        unknown
      >;

      const data = network?.result ?? {};

      const devices = data.devices ?? [];

      const byType = devices.reduce<Record<string, number>>((acc, device) => {
        const model = String(device?.model ?? "unknown");
        acc[model] = (acc[model] ?? 0) + 1;
        return acc;
      }, {});
      return {
        success: true,
        summary: {
          devices: data.deviceCount ?? devices.length,
          links: data.connectionCount ?? (data.connections ?? []).length,
          models: byType,
        },
        devices,
        links: data.connections ?? [],
        validation: {
          errors: validation?.errors ?? [],
          warnings: validation?.warnings ?? [],
          orphans: validation?.orphans ?? [],
          loops: validation?.loops ?? [],
        },
      };
    },
  }),
  
  
  
  defineTool({
    name: "packet_tracer_add_device",
    description:
      "Places a new device on the Packet Tracer canvas at the given coordinates. " +
      "The name must be unique and the model must be a REAL identifier from the Packet Tracer catalog " +
      "(for example '2911', '2960-24TT', 'Router-PT', 'PC-PT'): this tool checks the model against the engine catalog " +
      "and, if it does not exist, returns the closest matches instead of failing opaquely. " +
      "Use coordinates spaced apart between devices so they do not overlap.",
    inputSchema: {
      deviceName: z.string().describe("Unique device name, for example 'R1' or 'PC1'"),
      deviceModel: z
        .string()
        .min(1)
        .describe("Exact model identifier ('2911', '2960-24TT', 'Router-PT', 'PC-PT', 'Server-PT'...)"),
      x: z.number().describe("X coordinate on the canvas"),
      y: z.number().describe("Y coordinate on the canvas"),
    },
    handler: async ({ deviceName, deviceModel, x, y }) => {
      const catalog = await readDeviceModelCatalog();
      if (catalog.length === 0) {
        return {
          success: false,
          error:
            `Could not read the Packet Tracer model catalog, so it cannot be confirmed that '${deviceModel}' exists ` +
            `and NO device has been placed. Check that Packet Tracer is open with the extension connected and ` +
            `call packet_tracer_list_device_models.`,
        };
      }

      const requested = deviceModel.trim();
      if (!catalog.includes(requested)) {
        const suggestions = similarModels(requested, catalog);
        return {
          success: false,
          error:
            `'${requested}' is not a Packet Tracer device model.` +
            (suggestions.length > 0
              ? ` The closest catalog models are: ${suggestions.join(", ")}.`
              : ""),
          suggestions,
          availableModels: catalog.length,
        };
      }
      return simple("addDevice", { deviceName, deviceModel: requested, x, y });
    },
  }),
  defineTool({
    name: "packet_tracer_add_module",
    description:
      "Installs a physical expansion module in a device slot (for example an HWIC-2T serial card). " +
      "The device powers off and back on when doing so. Use it when the available ports run out.",
    inputSchema: {
      deviceName: z.string().describe("Name of an existing device"),
      slot: z.number().int().min(0).max(3).describe("Expansion slot number (0-3)"),
      model: z.string().describe("Module model, for example 'HWIC-2T' (serial) or 'NM-4E' (ethernet)"),
    },
    handler: async ({ deviceName, slot, model }) =>
      simple("addModule", { deviceName, slot, model }),
  }),
  defineTool({
    name: "packet_tracer_add_link",
    description:
      "Connects two devices with a cable. Both ports must be free. " +
      "Reuse the port data you have already read this turn with packet_tracer_get_network or packet_tracer_get_device_info; " +
      "read again only if a port was rejected or the topology changed.",
    inputSchema: {
      device1Name: z.string().describe("Name of the first device"),
      device1Interface: z.string().describe("Free interface of the first device, for example 'GigabitEthernet0/0'"),
      device2Name: z.string().describe("Name of the second device"),
      device2Interface: z.string().describe("Free interface of the second device"),
      linkType: z
        .enum(LINK_TYPES)
        .describe("'straight' for LAN, 'cross' for PC-PC, 'serial' for WAN, 'fiber' or 'auto'"),
    },
    handler: async (args) => simple("addLink", args),
  }),
  defineTool({
    name: "packet_tracer_remove_device",
    description:
      "Deletes one or more devices from the canvas. Destructive operation: the device and its links disappear. " +
      "It returns the detail per device, so in a batch deletion you can see which ones failed.",
    inputSchema: {
      deviceNames: z.array(z.string()).min(1).describe("Names of the devices to delete"),
    },
    handler: async ({ deviceNames }) => simple("removeDevice", { deviceNames }),
  }),
  defineTool({
    name: "packet_tracer_remove_link",
    description:
      "Removes one or more cables. Each entry identifies one end of the link by device and port.",
    inputSchema: {
      links: z
        .array(
          z.object({
            device: z.string().describe("Name of the device at one end of the link"),
            port: z.string().describe("Interface of that end, for example 'FastEthernet0/1'"),
          }),
        )
        .min(1)
        .describe("Ends of the links to remove (device + port)"),
    },
    handler: async ({ links }) => simple("removeLink", { links }),
  }),
  defineTool({
    name: "packet_tracer_move_device",
    description: "Moves a device to other coordinates on the canvas. It only changes its visual position, not its configuration.",
    inputSchema: {
      deviceName: z.string().describe("Name of the device to move"),
      x: z.number().describe("New X coordinate"),
      y: z.number().describe("New Y coordinate"),
    },
    handler: async ({ deviceName, x, y }) => simple("moveDevice", { deviceName, x, y }),
  }),
  defineTool({
    name: "packet_tracer_rename_device",
    description: "Changes the name of a device on the canvas. It affects how the other tools refer to it.",
    inputSchema: {
      deviceName: z.string().describe("Current device name"),
      newName: z.string().describe("New name (must be unique)"),
    },
    handler: async ({ deviceName, newName }) => simple("renameDevice", { deviceName, newName }),
  }),
  defineTool({
    name: "packet_tracer_set_power",
    description: "Powers a device on or off. Powering a router off and on forces it to restart (useful to see the boot).",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      power: z.boolean().describe("true to power on, false to power off"),
    },
    handler: async ({ deviceName, power }) => simple("setPower", { deviceName, power }),
  }),
  
  
  
  defineTool({
    name: "packet_tracer_configure_pc_ip",
    description:
      "Configures the IP addressing of an end device (PC, laptop, server or printer), static or via DHCP. " +
      "It only configures the FastEthernet0 port (the main card). " +
      "With dhcpEnabled=false you MUST send ipaddress and subnetMask: without both, Packet Tracer responds success without applying anything.",
    inputSchema: {
      deviceName: z.string().describe("Name of the end device"),
      dhcpEnabled: z.boolean().describe("true = DHCP; false = static IP (then ipaddress and subnetMask are required)"),
      ipaddress: z.string().optional().describe("Static IP for FastEthernet0 (required with dhcpEnabled=false)"),
      subnetMask: z.string().optional().describe("Subnet mask (required with dhcpEnabled=false)"),
      defaultGateway: z.string().optional().describe("Default gateway"),
      dnsServer: z.string().optional().describe("DNS server"),
    },
    handler: async (args) => {
      
      
      if (args.dhcpEnabled === false) {
        const missing: string[] = [];
        if (!args.ipaddress?.trim()) missing.push("ipaddress");
        if (!args.subnetMask?.trim()) missing.push("subnetMask");
        if (missing.length > 0) {
          return {
            success: false,
            error:
              `With dhcpEnabled=false you must send ${missing.join(" and ")}. ` +
              `Without IP and mask, Packet Tracer responds success without configuring anything, so the call is rejected here.`,
          };
        }
      }
      return simple("configurePcIp", args);
    },
  }),
  
  
  
  defineTool({
    name: "packet_tracer_run_device_commands",
    description:
      "Sends one or more CLI commands to a device and returns the output of each one. " +
      "It is the synchronous path (waits per line) and the right one for READS ('show ...') or short batches; " +
      "if you need a reliable result in a long batch, use packet_tracer_configure_ios_device.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      commands: z
        .array(z.string())
        .min(1)
        .describe("Commands to send, one per element (a single string with line breaks is also accepted)"),
      mode: z
        .enum(["", "user", "enable", "global"])
        .optional()
        .describe("CLI mode in which to run; empty or omitted uses the device's default mode"),
      waitMs: z.number().int().min(0).optional().describe("Wait per command in milliseconds (default 250)"),
      maxChars: z.number().int().min(1).optional().describe("Maximum output characters per command (default 8000)"),
    },
    handler: async ({ deviceName, commands, mode, waitMs, maxChars }) => {
      const options: Record<string, unknown> = {};
      if (mode !== undefined) options.mode = mode;
      if (waitMs !== undefined) options.waitMs = waitMs;
      if (maxChars !== undefined) options.maxChars = maxChars;
      return simple("runDeviceCommands", {
        deviceName,
        commands,
        ...(Object.keys(options).length > 0 ? { options } : {}),
      });
    },
  }),
  defineTool({
    name: "packet_tracer_configure_ios_device",
    description:
      "Applies a batch of IOS configuration to a device via CLI, reliably and verifiably. " +
      "Internally it launches the batch in the two-phase engine (runCommandAsync + pollCommandResult) in global configuration mode " +
      "and then CHECKS the result against the device's real configuration. " +
      "It is the recommended path to configure routers and switches: it sends the lines one by one, " +
      "and ends the batch with 'do write memory' to save to NVRAM. Maximum 120 lines per call.",
    inputSchema: {
      deviceName: z.string().describe("Name of the IOS device to configure"),
      commands: z
        .array(z.string())
        .min(1)
        .describe(
          "Configuration lines, one per element (for example ['hostname R1', 'interface Gi0/0', 'ip address 10.0.0.1 255.255.255.0', 'no shutdown'])",
        ),
      guardarEnNvram: z
        .boolean()
        .optional()
        .describe("Appends 'do write memory' at the end of the batch (default true). Set it to false only if the device does not support it."),
    },
    handler: async ({ deviceName, commands, guardarEnNvram }) => {
      const lines = commands
        .flatMap((line) => String(line).split(/\r?\n/))
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        return { success: false, error: "No configuration line was sent." };
      }
      if (lines.length > 120) {
        return {
          success: false,
          error:
            `The batch has ${lines.length} lines and the maximum per call is 120. ` +
            `Split it into several shorter calls.`,
        };
      }

      const save = guardarEnNvram !== false;

      const batch = save && !lines.includes("do write memory") ? [...lines, "do write memory"] : lines;
      return executeBatchWithVerification(deviceName, batch);
    },
  }),
  defineTool({
    name: "packet_tracer_apply_device_config",
    description:
      "Applies a complete configuration block (multiline text) to an IOS device. " +
      "It is the old engine's path: simpler but LESS reliable in long batches (blind wait per line). " +
      "For reliable configuration use packet_tracer_configure_ios_device. It ignores empty lines and comments starting with '!'.",
    inputSchema: {
      deviceName: z.string().describe("Name of the IOS device"),
      configText: z.string().min(1).describe("Configuration block as text, one line per command"),
    },
    handler: async ({ deviceName, configText }) => simple("applyDeviceConfig", { deviceName, configText }),
  }),
  defineTool({
    name: "packet_tracer_run_command_async",
    description:
      "Launches a batch of commands in the TWO-PHASE engine and returns a pending identifier immediately, without waiting for the result. " +
      "Use it only if you need manual control of the cycle; for the normal case use packet_tracer_configure_ios_device. " +
      "Afterwards you must poll with packet_tracer_poll_command_result.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      commands: z.array(z.string()).min(1).describe("Commands to send"),
      mode: z.enum(["", "user", "enable", "global"]).optional().describe("CLI mode"),
    },
    handler: async ({ deviceName, commands, mode }) =>
      simple("runCommandAsync", {
        deviceName,
        commands,
        ...(mode !== undefined ? { options: { mode } } : {}),
      }),
  }),
  defineTool({
    name: "packet_tracer_poll_command_result",
    description:
      "Polls the result of a batch launched with packet_tracer_run_command_async. " +
      "It returns whether it is still in progress or whether it finished, with the output of each command and the truncation warning if there was one.",
    inputSchema: {
      pendienteId: z.string().describe("Identifier returned by packet_tracer_run_command_async"),
      esperarMs: z.number().int().min(0).max(3000).optional().describe("How long to wait before responding (maximum 3000 ms)"),
    },
    handler: async ({ pendienteId, esperarMs }) =>
      simple("pollCommandResult", {
        pendienteId,
        ...(esperarMs !== undefined ? { options: { esperarMs } } : {}),
      }),
  }),
  
  
  
  defineTool({
    name: "packet_tracer_get_simulation_status",
    description: "Returns the simulation status: mode (realtime or simulation), current time and frame information.",
    inputSchema: {},
    handler: async () => simple("getSimulationStatus", {}),
  }),
  defineTool({
    name: "packet_tracer_set_simulation_mode",
    description:
      "Switches between realtime mode ('realtime') and simulation mode ('simulation'). " +
      "WARNING: it is a GLOBAL change of the shared scenario, visible to the other users.",
    inputSchema: {
      toSimMode: z.enum(SIMULATION_MODES).describe("'realtime' or 'simulation'"),
    },
    handler: async ({ toSimMode }) => simple("setSimulationMode", { toSimMode }),
  }),
  defineTool({
    name: "packet_tracer_step_simulation",
    description:
      "Advances the simulation. With direction='reset' the captured frames are DELETED and not recovered: it is destructive. " +
      "The other directions advance one step or one second.",
    inputSchema: {
      direction: z
        .enum(["forward", "backward", "reset", "play", "pause"])
        .describe("Direction of the advance; 'reset' clears the captured frames"),
      steps: z.number().int().min(1).max(100).optional().describe("How many steps to advance (maximum 100)"),
    },
    handler: async ({ direction, steps }) => simple("stepSimulation", { direction, steps }),
  }),
  defineTool({
    name: "packet_tracer_send_pdu",
    description:
      "Injects a packet (PDU) from a source device to a destination one and returns the simulation result. " +
      "It is the way to check end-to-end connectivity in the scenario.",
    inputSchema: {
      sourceDevice: z.string().describe("Name of the source device"),
      destinationDevice: z.string().describe("Name of the destination device"),
    },
    handler: async ({ sourceDevice, destinationDevice }) =>
      simple("sendPdu", { sourceDevice, destinationDevice }),
  }),
  defineTool({
    name: "packet_tracer_get_pdu_results",
    description:
      "Returns the frames captured in the event simulator with their status (accepted, discarded...). " +
      "Use it to understand WHY a packet did not arrive.",
    inputSchema: {
      types: z
        .array(z.string())
        .optional()
        .describe("Filter by traffic type; omit it to not filter"),
      limit: z.number().int().min(1).max(500).optional().describe("Maximum frames (default 50, maximum 500)"),
    },
    handler: async ({ types, limit }) =>
      simple("getPduResults", {
        types,
        ...(limit !== undefined ? { options: { limit } } : {}),
      }),
  }),
  defineTool({
    name: "packet_tracer_ping",
    description:
      "Checks connectivity between two devices (equivalent to a ping). " +
      "It first tries a PDU and, if that does not work, the CLI; the 'metodo' field of the result says which one was used. " +
      "Use it to verify that a network configuration really works.",
    inputSchema: {
      sourceName: z.string().describe("Name of the source device"),
      targetName: z.string().describe("Name of the destination device"),
    },
    handler: async ({ sourceName, targetName }) => simple("pingDevices", { sourceName, targetName }),
  }),
  defineTool({
    name: "packet_tracer_reachability_matrix",
    description:
      "Checks the connectivity of one source against several destinations at once (maximum 10). " +
      "It is much more efficient than chaining pings when you want to validate a whole topology.",
    inputSchema: {
      sourceName: z.string().describe("Name of the source device"),
      targetNames: z.array(z.string()).min(1).max(10).describe("Names of the destinations (maximum 10)"),
    },
    handler: async ({ sourceName, targetNames }) =>
      simple("reachabilityMatrix", { sourceName, targetNames }),
  }),
  defineTool({
    name: "packet_tracer_simulate_link_failure",
    description:
      "Simulates a link going down by powering off its interface, to test the topology's fault tolerance. " +
      "Undo it afterwards with packet_tracer_restore_link.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      interfaceName: z.string().describe("Interface to power off, for example 'GigabitEthernet0/0'"),
      durationSeconds: z.number().int().min(1).optional().describe("Suggested duration in seconds (the engine accepts it but does not apply it)"),
    },
    handler: async ({ deviceName, interfaceName, durationSeconds }) =>
      simple("simulateLinkFailure", { deviceName, interfaceName, durationSeconds }),
  }),
  defineTool({
    name: "packet_tracer_restore_link",
    description: "Restores a previously downed link, bringing the interface back up.",
    inputSchema: {
      deviceName: z.string().describe("Device name"),
      interfaceName: z.string().describe("Interface to bring up"),
    },
    handler: async ({ deviceName, interfaceName }) =>
      simple("restoreLink", { deviceName, interfaceName }),
  }),
  
  
  
  defineTool({
    name: "packet_tracer_clear_workspace",
    description:
      "DELETES ALL devices and links from the canvas. It is irreversible and does not ask for confirmation: " +
      "confirm it with the user before calling it, unless they explicitly asked for it.",
    inputSchema: {},
    handler: async () => simple("clearWorkspace", {}),
  }),
  defineTool({
    name: "packet_tracer_export_workspace",
    description:
      "Exports the current workspace to a .pkt file. If the engine can write to disk it returns the path; " +
      "if not, it returns the content in base64 so it can be saved from outside.",
    inputSchema: {
      filename: z.string().optional().describe("File name (default 'topologia.pkt')"),
      targetDir: z.string().optional().describe("Destination folder on the machine where Packet Tracer runs"),
    },
    handler: async ({ filename, targetDir }) => simple("exportWorkspace", { filename, targetDir }),
  }),
  defineTool({
    name: "packet_tracer_import_workspace",
    description:
      "Loads a .pkt workspace, REPLACING the current content of the canvas. " +
      "It accepts a path on the Packet Tracer machine or the content in base64.",
    inputSchema: {
      filename: z.string().describe("Name of the .pkt file to load"),
      sourcePath: z.string().optional().describe("Path of the file on the machine where Packet Tracer runs"),
      base64: z.string().optional().describe("Content of the .pkt in base64 (alternative to sourcePath)"),
    },
    handler: async ({ filename, sourcePath, base64 }) =>
      simple("importWorkspace", { filename, sourcePath, base64 }),
  }),
];




async function executeBatchWithVerification(
  deviceName: string,
  lines: string[],
): Promise<unknown> {
  
  const info = (await callPacketTracer("getDeviceInfo", { deviceName })) as Record<
    string,
    unknown
  >;
  if (info?.success === false || info?.error) {
    return {
      success: false,
      error:
        `Could not read the device '${deviceName}': ${String(info?.error ?? "it is not in the topology")}. ` +
        `The batch has not been sent. Check the name with packet_tracer_get_network.`,
    };
  }
  
  const launch = (await callPacketTracer("runCommandAsync", {
    deviceName,
    commands: lines,
    options: { mode: "global" },
  })) as Record<string, unknown>;
  if (launch?.success === false || launch?.error) {
    return {
      success: false,
      error:
        `The engine did not accept the batch for '${deviceName}': ${String(launch?.error ?? "no detail")}.`,
      batch: lines,
    };
  }

  const pendingId = launch?.pendienteId;
  if (typeof pendingId !== "string") {
    return {
      success: false,
      error:
        `Packet Tracer did not return a pending command identifier for '${deviceName}', ` +
        `so the result cannot be tracked. Engine output: ${JSON.stringify(launch).slice(0, 300)}`,
    };
  }
  
  
  const BUDGET_MS = 25_000;

  const startTime = Date.now();
  let last: Record<string, unknown> = {};
  while (Date.now() - startTime < BUDGET_MS) {
    last = (await callPacketTracer("pollCommandResult", {
      pendienteId: pendingId,
      options: { esperarMs: 1000 },
    })) as Record<string, unknown>;
    if (last?.done === true || last?.success === false) break;
    
    
  }
  
  const verification = await verifyBatch(deviceName, lines, last);

  const completed = last?.done === true;
  return {
    success: completed && verification.ok !== false,
    deviceName,
    batch: lines,
    state: completed ? "finished" : "in_progress_or_timed_out",
    source: last?.fuente ?? null,
    results: last?.results ?? null,
    summary: last?.summary ?? null,
    verification,
    ...(last?.warning ? { warning: last.warning } : {}),
    ...(!completed
      ? {
          notice:
            "The batch was launched but it could not be confirmed that it finished within the budget. " +
            "Check the state with packet_tracer_read_console before repeating the configuration.",
        }
      : {}),
  };
}


async function verifyBatch(
  deviceName: string,
  lines: string[],
  result: Record<string, unknown>,
): Promise<{
  performed: boolean;
  ok: boolean | null;
  data: Array<{ expected: string; found: string; ok: boolean }>;
  reason?: string;
}> {
  const expectedHostname = lines
    .map((line) => /^hostname\s+(\S+)\s*$/i.exec(line))
    .find(Boolean)?.[1];

  const expectedIps = lines
    .map((line) => /^ip\s+address\s+(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\S+))?\s*$/i.exec(line))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ ip: m[1], mask: m[2] ?? "" }));
  if (!expectedHostname && expectedIps.length === 0) {
    return {
      performed: false,
      ok: null,
      data: [],
      reason:
        "The batch did not include 'hostname' or 'ip address', so there is nothing that can be checked against the device's configuration.",
    };
  }

  const snapshot = (await callPacketTracer("getDeviceConfigSnapshot", { deviceName })) as Record<
    string,
    unknown
  >;

  const config = String(
    snapshot?.runningConfig ?? snapshot?.config ?? snapshot?.result ?? "",
  );
  if (!config.trim()) {
    return {
      performed: false,
      ok: null,
      data: [],
      reason:
        `Packet Tracer did not return the configuration of '${deviceName}', so it cannot be stated what was applied. ` +
        `The batch WAS sent: check the result with packet_tracer_read_console.`,
    };
  }

  const data: Array<{ expected: string; found: string; ok: boolean }> = [];
  if (expectedHostname) {
    const found = /^\s*hostname\s+(\S+)\s*$/im.exec(config)?.[1] ?? null;
    data.push({
      expected: `hostname ${expectedHostname}`,
      found: found ? `hostname ${found}` : "(no hostname appears in the configuration)",
      ok: found !== null && found.toLowerCase() === expectedHostname.toLowerCase(),
    });
  }
  for (const { ip, mask } of expectedIps) {
    const line = config
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => {
        const m = /^ip\s+address\s+(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\S+))?/i.exec(l);
        if (!m || m[1] !== ip) return false;
        return mask ? m[2] === mask : true;
      });
    data.push({
      expected: `ip address ${ip}${mask ? ` ${mask}` : ""}`,
      found: line ?? "(that address does not appear in the configuration)",
      ok: Boolean(line),
    });
  }
  return { performed: true, ok: data.every((d) => d.ok), data };
}




async function checkBridge(): Promise<unknown> {
  const state = getBridgeState();

  if (!state.active) {
    return {
      success: false,
      connected: false,
      bridge: state.url,
      error:
        `The Packet Tracer bridge of this MCP server is not listening on ${state.url}. ` +
        "It usually means MCP_BRIDGE_ENABLED is false or that the port was already taken at startup; " +
        `change MCP_BRIDGE_PORT (default ${envConfig.MCP_BRIDGE_PORT}) or free the port and restart the MCP server.`,
    };
  }

  if (!state.extensionConnected) {
    return {
      success: false,
      connected: false,
      bridge: state.url,
      error:
        `The MCP server bridge is listening on ${state.url} but the Packet Tracer extension has not connected. ` +
        "Open Packet Tracer with the extension loaded and point its configuration to that same host and port " +
        "(if it has PT_EXTENSION_SECRET, it must be the same on both sides).",
    };
  }

  const network = (await callPacketTracer("getNetwork", {}, { timeoutMs: 15_000 })) as Record<
    string,
    unknown
  >;
  if (!isOperationOk(network)) {
    return {
      success: false,
      connected: false,
      bridge: state.url,
      error:
        `The extension responded but Packet Tracer did not return the topology: ${String(network?.error ?? "no detail")}. ` +
        "Check that Packet Tracer is open with a workspace loaded and that the extension does not have a " +
        "modal dialog blocking the operation.",
    };
  }

  const result = (network?.result ?? {}) as Record<string, unknown>;
  return {
    success: true,
    connected: true,
    bridge: state.url,
    extension: state.extensionSocketId,
    devices: result.deviceCount ?? 0,
    links: result.connectionCount ?? 0,
  };
}


tools.push(
  defineTool({
    name: "packet_tracer_connection_status",
    description:
      "Checks the Packet Tracer bridge hosted by this MCP server and returns whether the extension is connected, " +
      "plus how many devices and links there are. Use it when starting to work or when a tool fails, to " +
      "distinguish 'the MCP bridge is not listening' / 'the extension is not connected' from 'the command went wrong'. " +
      "No other service (such as the Packet Tools backend) is needed for it to work.",
    inputSchema: {},
    handler: async () => checkBridge(),
  }),
);

Logger.debug(`packet-tracer domain: ${tools.length} tools ready.`);

export const packetTracerModule: DomainModule = {
  id: "packet-tracer",
  prefix: "packet_tracer_",
  description:
    "Cisco Packet Tracer: build topologies (devices, links, modules), configure IOS devices via CLI, simulate traffic and export/import workspaces.",
  tools,
};
