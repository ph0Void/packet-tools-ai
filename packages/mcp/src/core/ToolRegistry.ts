import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Logger } from "@/utils/Logger";


export interface ToolDefinition<Schema extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  inputSchema: Schema;
  handler: (args: z.infer<z.ZodObject<Schema>>) => Promise<unknown>;
}


export type AnyToolDefinition = ToolDefinition<any>;


export function defineTool<Schema extends z.ZodRawShape>(
  tool: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return tool;
}


export interface DomainModule {
  id: string;
  prefix: string;
  description: string;
  tools: AnyToolDefinition[];
}


class ToolRegistry {
  private readonly modules: DomainModule[] = [];
  private readonly registeredNames = new Set<string>();

  register(module: DomainModule): void {
    if (module.tools.length === 0) {
      throw new Error(
        `The domain '${module.id}' exposes no tools: check that the module is declaring them.`,
      );
    }

    for (const tool of module.tools) {
      if (!tool.name.startsWith(module.prefix)) {
        throw new Error(
          `Tool '${tool.name}' of domain '${module.id}' does not start with its prefix '${module.prefix}'. ` +
            `The prefix is not decorative: it is what lets the model know which domain the tool belongs to.`,
        );
      }
      if (this.registeredNames.has(tool.name)) {
        throw new Error(
          `Tool '${tool.name}' is already registered by another domain. Names must be unique across the whole server.`,
        );
      }
      this.registeredNames.add(tool.name);
    }

    this.modules.push(module);
    Logger.debug(
      `Domain registered: ${module.id} (${module.tools.length} tools)`,
    );
  }

  getModules(): readonly DomainModule[] {
    return this.modules;
  }

  getTools(): AnyToolDefinition[] {
    return this.modules.flatMap((module) => module.tools);
  }

  countTools(): number {
    return this.registeredNames.size;
  }

  connectToServer(server: McpServer): void {
    for (const tool of this.getTools()) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.inputSchema,
        },
        (async (args: Record<string, unknown>) => {
          const startTime = Date.now();
          Logger.trace(`→ ${tool.name}`, args);

          try {
            const result = await tool.handler(args as never);
            Logger.trace(`← ${tool.name} OK (${Date.now() - startTime} ms)`);
            return toMcpResponse(result);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Logger.warning(`← ${tool.name} FAILED (${Date.now() - startTime} ms): ${message}`);
            return toMcpResponse(
              error && typeof error === "object" && "toModelMessage" in error
                ? (error as { toModelMessage(): string }).toModelMessage()
                : `Unexpected error in '${tool.name}': ${message}`,
              true,
            );
          }
        }) as never,
      );
    }
  }
}


function toMcpResponse(
  value: unknown,
  isError = false,
): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2);

  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}


export const toolRegistry = new ToolRegistry();
