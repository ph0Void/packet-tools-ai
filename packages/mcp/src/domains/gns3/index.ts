
import { z } from "zod";
import type { DomainModule, AnyToolDefinition } from "@/core/ToolRegistry";
import { defineTool } from "@/core/ToolRegistry";
import { createGns3Client, resolveGns3Credentials } from "./Gns3McpClient";
import { Logger } from "@/utils/Logger";
import { McpToolError } from "@/core/errors";
import { prismaClient } from "@/prisma/lib/PrismaClient";


const activeProjects = new Map<string, string>();


async function projectKey(providerId?: string | null): Promise<string> {
  if (providerId?.trim()) return providerId.trim();
  const credentials = await resolveGns3Credentials(null);
  return credentials.baseUrl;
}


async function rememberProject(
  providerId: string | null | undefined,
  projectId: string,
): Promise<void> {
  activeProjects.set(await projectKey(providerId), projectId);
}


async function resolveProject(
  providerId: string | null | undefined,
  projectId?: string,
): Promise<string> {
  const explicitValue = projectId?.trim();
  if (explicitValue) return explicitValue;
  const active = activeProjects.get(await projectKey(providerId));
  if (active) return active;
  throw new McpToolError(
    "NOT_FOUND",
    "There is no active GNS3 project and 'projectId' was not provided.",
    {
      suggestion:
        "Call gns3_list_projects first to see the available projects and then gns3_open_project with the chosen 'projectId'; from then on the other tools will already know which one to use. You can also pass 'projectId' explicitly on each call.",
    },
  );
}


async function resolveNode(
  client: Awaited<ReturnType<typeof createGns3Client>>,
  projectId: string,
  nodeId?: string,
  nodeName?: string,
): Promise<Record<string, unknown>> {
  const nodes = ((await client.get(`/projects/${projectId}/nodes`)) ?? []) as Array<
    Record<string, unknown>
  >;
  if (nodeId?.trim()) {
    const found = nodes.find((n) => n?.node_id === nodeId.trim());
    if (!found) {
      throw new McpToolError(
        "NOT_FOUND",
        `There is no node with node_id '${nodeId}' in the project.`,
        { suggestion: "Use gns3_list_nodes to see the project's real nodes." },
      );
    }
    return found;
  }
  const searched = nodeName?.trim().toLowerCase();
  if (!searched) {
    throw new McpToolError(
      "VALIDATION",
      "You must provide 'nodeId' or 'nodeName' to choose the node.",
      { suggestion: "The names are the ones you see in the GNS3 interface; if you do not remember them, use gns3_list_nodes." },
    );
  }
  const exactMatches = nodes.filter((n) => String(n?.name ?? "").toLowerCase() === searched);
  const candidates =
    exactMatches.length > 0
      ? exactMatches
      : nodes.filter((n) => String(n?.name ?? "").toLowerCase().includes(searched));
  if (candidates.length === 0) {
    throw new McpToolError(
      "NOT_FOUND",
      `No node in the project is named '${nodeName}'.`,
      { suggestion: "Use gns3_list_nodes to see the real names." },
    );
  }
  if (candidates.length > 1) {
    const names = candidates.map((n) => `"${n?.name}"`).join(", ");
    throw new McpToolError(
      "VALIDATION",
      `Several nodes match '${nodeName}': ${names}.`,
      { suggestion: "Repeat the call providing 'nodeId' to choose one unambiguously." },
    );
  }
  return candidates[0];
}


const argProviderId = z
  .string()
  .optional()
  .describe("Id of the GNS3 device configured in the MCP; omit it if you only have one");


const argProjectId = z
  .string()
  .optional()
  .describe("Id of the GNS3 project; omit it to use the active project");

const tools: AnyToolDefinition[] = [
  
  
  
  defineTool({
    name: "gns3_list_configured_servers",
    description:
      "Lists the GNS3 servers configured in the MCP (with their id, name and URL). " +
      "Use it when you have several GNS3 installations and need to know which one to target.",
    inputSchema: {},
    handler: async () => {
      const rows = await prismaClient.deviceProviderMcp.findMany({
        where: { typeDevice: "GNS3" },
        select: { id: true, name: true, host: true, username: true, status: true },
      });
      const defaultCredentials = await resolveGns3Credentials(null);
      return {
        success: true,
        configured: rows.map((row) => ({
          id: row.id,
          name: row.name,
          url: row.host,
          username: row.username,
          status: row.status,
        })),
        total: rows.length,
        defaultUrl: defaultCredentials.baseUrl,
        message:
          rows.length === 0
            ? "No GNS3 server is configured, so the default URL will be used. If your GNS3 is at another address, configure it so the MCP can find it."
            : "Pass the 'id' of one of these servers as 'providerId' to target it.",
      };
    },
  }),
  defineTool({
    name: "gns3_test_connection",
    description:
      "Checks that the GNS3 server responds and returns its version. " +
      "Use it first, to distinguish 'GNS3 is not available' from 'the project does not exist'.",
    inputSchema: { providerId: argProviderId },
    handler: async ({ providerId }) => {
      const client = await createGns3Client(providerId);
      try {
        const version = await client.get("/version");
        return {
          success: true,
          connected: true,
          url: client.url,
          version,
        };
      } catch (error) {
        if (error instanceof McpToolError) {
          
          
          return {
            success: false,
            connected: false,
            url: client.url,
            error: error.message,
            suggestion: error.suggestion,
          };
        }
        throw error;
      }
    },
  }),
  defineTool({
    name: "gns3_list_projects",
    description:
      "Lists the projects on the GNS3 server. It is the starting point: this is where the 'projectId' that the other tools need comes from.",
    inputSchema: { providerId: argProviderId },
    handler: async ({ providerId }) => {
      const client = await createGns3Client(providerId);
      const projects = await client.get("/projects");
      return { success: true, url: client.url, projects: projects ?? [] };
    },
  }),
  defineTool({
    name: "gns3_find_project",
    description:
      "Searches GNS3 projects by name (partial match, case-insensitive). " +
      "Use it when you know the project's name but not its id.",
    inputSchema: {
      name: z.string().describe("Text to search for in the project name"),
      providerId: argProviderId,
    },
    handler: async ({ name, providerId }) => {
      const client = await createGns3Client(providerId);
      const projects = ((await client.get("/projects")) ?? []) as Array<Record<string, unknown>>;
      const searched = name.trim().toLowerCase();
      const found = projects.filter((p) =>
        String(p?.name ?? "").toLowerCase().includes(searched),
      );
      return {
        success: true,
        found,
        total: found.length,
        ...(found.length === 0
          ? {
              message: `No project contains '${name}'. Use gns3_list_projects to see all the names.`,
            }
          : {}),
      };
    },
  }),
  defineTool({
    name: "gns3_get_project",
    description: "Returns the data of a specific GNS3 project (status, number of nodes and links, path on disk).",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, project: await client.get(`/projects/${id}`) };
    },
  }),
  defineTool({
    name: "gns3_create_project",
    description:
      "Creates a new GNS3 project and leaves it as the active project. " +
      "Use it to start a topology from scratch.",
    inputSchema: {
      name: z.string().describe("Name of the new project"),
      providerId: argProviderId,
    },
    handler: async ({ name, providerId }) => {
      const client = await createGns3Client(providerId);
      const project = (await client.post("/projects", { name })) as Record<string, unknown>;
      const id = String(project?.project_id ?? "");
      if (id) await rememberProject(providerId, id);
      return {
        success: true,
        project,
        message: id ? `Project '${name}' created and marked as active.` : "Project created.",
      };
    },
  }),
  defineTool({
    name: "gns3_open_project",
    description:
      "Opens a GNS3 project and leaves it as the ACTIVE project, so that the other tools already know which one to operate on. " +
      "Use it after gns3_list_projects.",
    inputSchema: { projectId: z.string().describe("Id of the project to open"), providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const result = await client.post(`/projects/${projectId}/open`);
      await rememberProject(providerId, projectId);
      return {
        success: true,
        project: result,
        message: `Project '${projectId}' opened and marked as active.`,
      };
    },
  }),
  defineTool({
    name: "gns3_close_project",
    description:
      "Closes a GNS3 project (powers off its nodes and frees resources). It deletes nothing: the project stays on disk and can be reopened.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, result: await client.post(`/projects/${id}/close`) };
    },
  }),
  defineTool({
    name: "gns3_delete_project",
    description:
      "DELETES a GNS3 project and all its content (nodes, links, snapshots). It is IRREVERSIBLE: " +
      "confirm it with the user before calling it unless they explicitly asked for it. " +
      "If you only want to leave it powered off, use gns3_close_project.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, result: await client.del(`/projects/${id}`) };
    },
  }),
  defineTool({
    name: "gns3_get_project_stats",
    description: "Returns statistics of a GNS3 project (number of nodes, links and their status).",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, stats: await client.get(`/projects/${id}/stats`) };
    },
  }),
  defineTool({
    name: "gns3_get_server_resources",
    description:
      "Queries the GNS3 server resources (CPU, memory and disk). " +
      "Use it before bringing up large topologies, to know whether the server will hold.",
    inputSchema: { providerId: argProviderId },
    handler: async ({ providerId }) => {
      const client = await createGns3Client(providerId);
      
      
      const computes = ((await client.get("/computes")) ?? []) as Array<Record<string, unknown>>;
      const computeId = String(computes[0]?.compute_id ?? "local");
      return {
        success: true,
        computes,
        resources: await client.get(`/computes/${computeId}/resources`),
      };
    },
  }),

  
  
  
  defineTool({
    name: "gns3_list_nodes",
    description:
      "Lists the nodes (devices) of a GNS3 project, with their id, name, type, template and power status. " +
      "Use it to discover the real names before operating on them.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const nodes = (await client.get(`/projects/${id}/nodes`)) ?? [];
      return { success: true, projectId: id, nodes };
    },
  }),
  defineTool({
    name: "gns3_get_templates",
    description:
      "Lists the device templates available on the GNS3 server (routers, switches, hosts...). " +
      "Use it before creating a node: the 'templateId' must be one of these.",
    inputSchema: { providerId: argProviderId },
    handler: async ({ providerId }) => {
      const client = await createGns3Client(providerId);
      return { success: true, templates: (await client.get("/templates")) ?? [] };
    },
  }),
  defineTool({
    name: "gns3_create_node",
    description:
      "Creates a node (device) in a GNS3 project from a template. " +
      "The name must be unique within the project. Use gns3_get_templates to know the 'templateId'.",
    inputSchema: {
      name: z.string().describe("Name of the new node, for example 'R1'"),
      templateId: z.string().describe("Id of the template to use (from gns3_get_templates)"),
      x: z.number().optional().describe("X position on the canvas (default 0)"),
      y: z.number().optional().describe("Y position on the canvas (default 0)"),
      computeId: z.string().optional().describe("Id of the compute to run it on (default 'local')"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ name, templateId, x, y, computeId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const node = await client.post(`/projects/${id}/templates/${templateId}`, {
        name,
        x: x ?? 0,
        y: y ?? 0,
        compute_id: computeId ?? "local",
      });
      return { success: true, node };
    },
  }),
  defineTool({
    name: "gns3_control_node_power",
    description:
      "Powers on, powers off, suspends or restarts a GNS3 node. " +
      "Use gns3_list_nodes for the name or id if you do not remember them.",
    inputSchema: {
      action: z
        .enum(["start", "stop", "suspend", "reload"])
        .describe("Power action to apply"),
      nodeId: z.string().optional().describe("Node id"),
      nodeName: z.string().optional().describe("Node name (alternative to nodeId)"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ action, nodeId, nodeName, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const node = await resolveNode(client, id, nodeId, nodeName);
      const realNodeId = String(node.node_id);
      const result = await client.post(`/projects/${id}/nodes/${realNodeId}/${action}`);
      return {
        success: true,
        node: node.name,
        action,
        result,
      };
    },
  }),
  defineTool({
    name: "gns3_list_node_files",
    description: "Lists the files associated with a GNS3 node (for example, its images or its logs).",
    inputSchema: {
      nodeId: z.string().optional().describe("Node id"),
      nodeName: z.string().optional().describe("Node name (alternative to nodeId)"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ nodeId, nodeName, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const node = await resolveNode(client, id, nodeId, nodeName);
      return {
        success: true,
        files: await client.get(`/projects/${id}/nodes/${String(node.node_id)}/files`),
      };
    },
  }),
  defineTool({
    name: "gns3_read_node_log",
    description:
      "Reads a GNS3 node's log. It is the way to see WHY a device does not boot or why an image fails.",
    inputSchema: {
      nodeId: z.string().optional().describe("Node id"),
      nodeName: z.string().optional().describe("Node name (alternative to nodeId)"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ nodeId, nodeName, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const node = await resolveNode(client, id, nodeId, nodeName);
      const realNodeId = String(node.node_id);
      const files = ((await client.get(`/projects/${id}/nodes/${realNodeId}/files`)) ?? []) as string[];
      const logFile = files.find((f) => /\.log$/i.test(String(f)));
      if (!logFile) {
        return {
          success: false,
          error: `Node '${node.name}' has no .log file.`,
          availableFiles: files,
        };
      }
      return {
        success: true,
        node: node.name,
        file: logFile,
        content: await client.get(
          `/projects/${id}/nodes/${realNodeId}/files/${encodeURIComponent(logFile)}`,
          "text",
        ),
      };
    },
  }),

  
  
  
  defineTool({
    name: "gns3_list_links",
    description: "Lists the links (cables) of a GNS3 project, with the nodes and adapters they connect.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, links: (await client.get(`/projects/${id}/links`)) ?? [] };
    },
  }),
  defineTool({
    name: "gns3_connect_nodes",
    description:
      "Connects two GNS3 nodes with a cable. You must provide the adapter and port of each end " +
      "(usually adapter 0 and port 0 for the first interface). " +
      "Check gns3_list_nodes if you do not know which adapters each node has.",
    inputSchema: {
      node1Name: z.string().optional().describe("Name of the first node"),
      node1Id: z.string().optional().describe("Id of the first node (alternative to the name)"),
      adapter1: z.number().int().min(0).optional().describe("Adapter of the first node (default 0)"),
      port1: z.number().int().min(0).optional().describe("Port of the first node (default 0)"),
      node2Name: z.string().optional().describe("Name of the second node"),
      node2Id: z.string().optional().describe("Id of the second node (alternative to the name)"),
      adapter2: z.number().int().min(0).optional().describe("Adapter of the second node (default 0)"),
      port2: z.number().int().min(0).optional().describe("Port of the second node (default 0)"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async (args) => {
      const client = await createGns3Client(args.providerId);
      const id = await resolveProject(args.providerId, args.projectId);
      const node1 = await resolveNode(client, id, args.node1Id, args.node1Name);
      const node2 = await resolveNode(client, id, args.node2Id, args.node2Name);
      const link = await client.post(`/projects/${id}/links`, {
        nodes: [
          {
            node_id: node1.node_id,
            adapter_number: args.adapter1 ?? 0,
            port_number: args.port1 ?? 0,
          },
          {
            node_id: node2.node_id,
            adapter_number: args.adapter2 ?? 0,
            port_number: args.port2 ?? 0,
          },
        ],
      });
      return {
        success: true,
        link,
        message: `Connected '${node1.name}' and '${node2.name}'.`,
      };
    },
  }),
  defineTool({
    name: "gns3_start_link_capture",
    description:
      "Starts capturing traffic on a GNS3 link. Afterwards the pcap is downloaded with gns3_download_link_pcap.",
    inputSchema: {
      linkId: z.string().describe("Id of the link to capture (from gns3_list_links)"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ linkId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return {
        success: true,
        capture: await client.post(`/projects/${id}/links/${linkId}/capture/start`),
      };
    },
  }),
  defineTool({
    name: "gns3_stop_link_capture",
    description: "Stops the traffic capture of a GNS3 link.",
    inputSchema: {
      linkId: z.string().describe("Link id"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ linkId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return {
        success: true,
        capture: await client.post(`/projects/${id}/links/${linkId}/capture/stop`),
      };
    },
  }),
  defineTool({
    name: "gns3_get_link_capture",
    description: "Queries the capture status of a GNS3 link (whether it is active and where the pcap is saved).",
    inputSchema: {
      linkId: z.string().describe("Link id"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ linkId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, capture: await client.get(`/projects/${id}/links/${linkId}/capture`) };
    },
  }),
  defineTool({
    name: "gns3_download_link_pcap",
    description:
      "Downloads the pcap file of a link's capture and returns its size. " +
      "Use it to analyze the captured traffic.",
    inputSchema: {
      linkId: z.string().describe("Link id"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ linkId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const data = await client.get(`/projects/${id}/links/${linkId}/capture/download`, "buffer");
      const buffer = Buffer.isBuffer(data) ? data : Buffer.alloc(0);
      return {
        success: true,
        bytes: buffer.length,
        
        
        
        message:
          buffer.length > 0
            ? `Capture obtained (${buffer.length} bytes). The pcap file is on the GNS3 server; open it there with Wireshark.`
            : "The link has no capture available.",
      };
    },
  }),

  
  
  
  defineTool({
    name: "gns3_list_snapshots",
    description: "Lists the snapshots (restore points) of a GNS3 project.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, snapshots: (await client.get(`/projects/${id}/snapshots`)) ?? [] };
    },
  }),
  defineTool({
    name: "gns3_create_snapshot",
    description:
      "Creates a snapshot of a GNS3 project: saves the state of all its nodes so you can return to it. " +
      "Use it before making risky changes.",
    inputSchema: {
      name: z.string().describe("Snapshot name"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ name, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return { success: true, snapshot: await client.post(`/projects/${id}/snapshots`, { name }) };
    },
  }),
  defineTool({
    name: "gns3_restore_snapshot",
    description:
      "Restores a GNS3 project to a snapshot: DISCARDS the changes made since then. " +
      "Confirm it with the user if they did not ask for it.",
    inputSchema: {
      snapshotId: z.string().describe("Id of the snapshot to restore"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ snapshotId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return {
        success: true,
        result: await client.post(`/projects/${id}/snapshots/${snapshotId}/restore`),
      };
    },
  }),
  defineTool({
    name: "gns3_delete_snapshot",
    description: "Deletes a snapshot of a GNS3 project. Irreversible operation.",
    inputSchema: {
      snapshotId: z.string().describe("Id of the snapshot to delete"),
      projectId: argProjectId,
      providerId: argProviderId,
    },
    handler: async ({ snapshotId, projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      return {
        success: true,
        result: await client.del(`/projects/${id}/snapshots/${snapshotId}`),
      };
    },
  }),

  
  
  
  defineTool({
    name: "gns3_get_template",
    description: "Returns the detail of a GNS3 template (image, adapters, RAM, console...).",
    inputSchema: {
      templateId: z.string().describe("Template id"),
      providerId: argProviderId,
    },
    handler: async ({ templateId, providerId }) => {
      const client = await createGns3Client(providerId);
      return { success: true, template: await client.get(`/templates/${templateId}`) };
    },
  }),
  defineTool({
    name: "gns3_create_template",
    description:
      "Creates a new GNS3 device template. It needs at least the name, the template type and the image or model, " +
      "depending on the type (qemu, docker, dynamips, vpcs...).",
    inputSchema: {
      name: z.string().describe("Template name"),
      templateType: z
        .string()
        .describe("Template type: 'qemu', 'docker', 'dynamips', 'iou', 'vpcs'..."),
      computeId: z.string().optional().describe("Id of the compute to run it on (default 'local')"),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Type-specific properties (image, ram, adapters...). They are passed as-is to the GNS3 API."),
      providerId: argProviderId,
    },
    handler: async ({ name, templateType, computeId, properties, providerId }) => {
      const client = await createGns3Client(providerId);
      const template = await client.post("/templates", {
        name,
        template_type: templateType,
        compute_id: computeId ?? "local",
        ...(properties ?? {}),
      });
      return { success: true, template };
    },
  }),
  defineTool({
    name: "gns3_update_template",
    description:
      "Modifies an existing GNS3 template. Only the given fields are sent, so there is no need to pass the whole template.",
    inputSchema: {
      templateId: z.string().describe("Id of the template to modify"),
      changes: z
        .record(z.string(), z.unknown())
        .describe("Fields to change, as the GNS3 API understands them (for example {name, ram})"),
      providerId: argProviderId,
    },
    handler: async ({ templateId, changes, providerId }) => {
      const client = await createGns3Client(providerId);
      return { success: true, template: await client.put(`/templates/${templateId}`, changes) };
    },
  }),
  defineTool({
    name: "gns3_delete_template",
    description: "Deletes a GNS3 template. Irreversible: nodes already created with it are not deleted, but no more can be created.",
    inputSchema: {
      templateId: z.string().describe("Id of the template to delete"),
      providerId: argProviderId,
    },
    handler: async ({ templateId, providerId }) => {
      const client = await createGns3Client(providerId);
      return { success: true, result: await client.del(`/templates/${templateId}`) };
    },
  }),
  defineTool({
    name: "gns3_duplicate_template",
    description:
      "Duplicates a GNS3 template under a new name. Useful to create variants without touching the original.",
    inputSchema: {
      templateId: z.string().describe("Id of the template to duplicate"),
      name: z.string().describe("Name of the new template"),
      providerId: argProviderId,
    },
    handler: async ({ templateId, name, providerId }) => {
      const client = await createGns3Client(providerId);
      const original = (await client.get(`/templates/${templateId}`)) as Record<string, unknown>;
      
      
      const { template_id: _ignored, ...rest } = original ?? {};
      void _ignored;
      return {
        success: true,
        template: await client.post("/templates", { ...rest, name }),
      };
    },
  }),

  
  
  
  defineTool({
    name: "gns3_export_project",
    description:
      "Exports a complete GNS3 project. Returns the size of the exported file; " +
      "the file stays on the GNS3 server, ready to download or import.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      const data = await client.get(`/projects/${id}/export`, "buffer");
      const buffer = Buffer.isBuffer(data) ? data : Buffer.alloc(0);
      return {
        success: true,
        bytes: buffer.length,
        message:
          buffer.length > 0
            ? `Project exported (${buffer.length} bytes). You can import it on another server with gns3_import_project.`
            : "The server returned no content when exporting the project.",
      };
    },
  }),
  defineTool({
    name: "gns3_import_project",
    description:
      "Imports a GNS3 project from a .gns3project file that is ON THE GNS3 SERVER " +
      "(provide its path with 'path'). The imported project is marked as active.",
    inputSchema: {
      name: z.string().describe("Name the imported project will have"),
      path: z.string().describe("Path of the .gns3project file on the GNS3 server"),
      providerId: argProviderId,
    },
    handler: async ({ name, path: pathValue, providerId }) => {
      const client = await createGns3Client(providerId);
      const project = (await client.post("/projects/import", {
        name,
        path: pathValue,
      })) as Record<string, unknown>;
      const id = String(project?.project_id ?? "");
      if (id) await rememberProject(providerId, id);
      return { success: true, project };
    },
  }),
  defineTool({
    name: "gns3_auto_layout_project",
    description:
      "Automatically reorganizes the position of the project's nodes so the diagram looks tidy.",
    inputSchema: { projectId: argProjectId, providerId: argProviderId },
    handler: async ({ projectId, providerId }) => {
      const client = await createGns3Client(providerId);
      const id = await resolveProject(providerId, projectId);
      try {
        return { success: true, result: await client.post(`/projects/${id}/auto_layout`) };
      } catch (error) {
        
        Logger.debug("GNS3 does not support auto_layout in this version.", {
          error: String(error),
        });
        return {
          success: false,
          error:
            "This GNS3 server does not support automatic reorganization (endpoint /auto_layout not available). " +
            "You can move the nodes one by one from the GNS3 interface.",
        };
      }
    },
  }),
];

export const gns3Module: DomainModule = {
  id: "gns3",
  prefix: "gns3_",
  description:
    "GNS3 server: projects, nodes and their power, links, traffic captures, snapshots and device templates.",
  tools,
};
