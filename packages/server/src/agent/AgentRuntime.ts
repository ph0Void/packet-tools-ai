import {
  anthropicPromptCachingMiddleware,
  ClearToolUsesEdit,
  contextEditingMiddleware,
  createMiddleware,
  modelCallLimitMiddleware,
  toolCallLimitMiddleware,
  type AgentMiddleware,
} from "langchain";
import { isGraphInterrupt } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import { envConfig } from "@/config/EnvConfig";
import { Logger } from "@/utils/Logger";
import { compactText, estimateMessagesTokens } from "@/utils/MessageContext";
import { approvalMiddleware } from "./approval/ApprovalMiddleware";
import { agentBudgetMiddleware } from "./deep/budgetMiddleware";
import { duplicateGuardMiddleware } from "./deep/duplicateGuardMiddleware";
import { retryGuardMiddleware } from "./deep/retryGuardMiddleware";
import { LC_ERROR_CODE_PLAZO_CUMPLIDO } from "./deep/turnPlazo";
import { turnPlazoMiddleware } from "./deep/turnPlazoMiddleware";
import { readCacheMiddleware } from "./tools/readCacheMiddleware";

const TOOL_ERROR_PREFIX = "[HERRAMIENTA_FALLIDA]";

const HINT_RECORTE =
  "\n[hint: output truncated to fit the context budget; narrow the call with filters/limits if you need the full payload]";

/**
 * Convierte el fallo de UNA herramienta en un `ToolMessage` de error en lugar de dejar
 * que reviente el turno entero.
 *
 * Por qué hace falta: `ToolNode` (langchain 1.5.x) tiene dos caminos. Sin middleware de
 * `wrapToolCall`, el error del handler se envuelve en un `ToolMessage` y el modelo se
 * corrige. CON middleware —y aquí siempre hay varios: aprobaciones, presupuesto, guardas
 * de duplicados, reintentos— el error se trata como "error de middleware" y se **revuelve**:
 * `#handleError` hace `if (errorFromMiddleware && this.handleToolErrors !== true) throw`.
 *
 * La consecuencia real: `executeTelnetCommands` contra un equipo apagado lanzaba, el
 * `throw` salía del nodo de herramientas, moría el grafo y **toda** la ejecución
 * inteligente quedaba en FAILED sin que el agente pudiera recuperarse ni informar. En una
 * automatización programada eso es exactamente "lanzo la tarea y falla".
 *
 * Se coloca como middleware MÁS EXTERNO (el primero en la pila) para que envuelva también
 * a los demás. No se traga lo que no debe: si el turno fue abortado (plazo agotado o
 * cancelación del usuario) o si es una interrupción de grafo, se vuelve a lanzar para que
 * el corte siga siendo un corte.
 */
export function toolErrorToMessageMiddleware(): AgentMiddleware {
  return createMiddleware({
    name: "ToolErrorToMessage",
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (error) {
        if ((error as { lc_error_code?: unknown } | undefined)?.lc_error_code ===
          LC_ERROR_CODE_PLAZO_CUMPLIDO) {
          throw error;
        }
        if (isGraphInterrupt(error)) throw error;
        if (request.runtime?.signal?.aborted) throw error;

        const toolCallId = request.toolCall?.id ?? "";
        const toolName = request.toolCall?.name ?? "(herramienta)";
        if (!toolCallId) throw error;

        const detalle =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : String(error ?? "error desconocido");

        Logger.error({
          message: `[TOOL_ERROR] '${toolName}' falló; se devuelve el error al modelo en lugar de abortar el turno.`,
          data: detalle.slice(0, 300),
        });

        return new ToolMessage({
          content: `${TOOL_ERROR_PREFIX} ${detalle}\nNo es un error del turno: informa del resultado obtenido hasta aquí y de este fallo concreto, y termina el turno.`,
          tool_call_id: toolCallId,
          name: toolName,
          status: "error",
        });
      }
    },
  });
}

export function toolOutputBudgetMiddleware(
  maxChars: number = envConfig.AGENT_TOOL_OUTPUT_CHARS,
): AgentMiddleware {
  return createMiddleware({
    name: "ToolOutputBudget",
    wrapToolCall: async (request, handler) => {
      const resultado = await handler(request);
      if (!ToolMessage.isInstance(resultado)) return resultado;
      const texto = typeof resultado.content === "string" ? resultado.content : "";
      if (!texto || texto.length <= maxChars) return resultado;
      return new ToolMessage({
        ...(resultado as any),
        content: compactText(texto, maxChars, "tool output truncated") + HINT_RECORTE,
      });
    },
  });
}

export interface AgentMiddlewareOptions {

  provider?: string | null;

  toolCallLimit?: number;

  modelCallLimit?: number;

  toolOutputChars?: number;

  contextEditTokens?: number;

  withApproval?: boolean;

  budget?: boolean;

  retryGuard?: boolean;

  readCache?: boolean;

  turnDeadline?: boolean;

  duplicateToolGuard?: boolean;
}

export function buildAgentMiddleware(
  options: AgentMiddlewareOptions = {},
): AgentMiddleware[] {
  const middleware: AgentMiddleware[] = [];

  // PRIMERO = más externo: tiene que envolver a todos los demás para que un fallo de
  // herramienta nunca salga del nodo de herramientas.
  middleware.push(toolErrorToMessageMiddleware());

  if (options.withApproval !== false) middleware.push(approvalMiddleware);

  if (options.retryGuard !== false) middleware.push(retryGuardMiddleware());
  middleware.push(
    toolOutputBudgetMiddleware(
      options.toolOutputChars ?? envConfig.AGENT_TOOL_OUTPUT_CHARS,
    ),
  );

  if (options.readCache) middleware.push(readCacheMiddleware());

  middleware.push(
    contextEditingMiddleware({
      edits: [
        new ClearToolUsesEdit({
          trigger: { tokens: options.contextEditTokens ?? envConfig.AGENT_CONTEXT_EDIT_TOKENS },
          keep: { messages: 4 },

          excludeTools: ["search_knowledge_base", "search_web_tool"],
          placeholder: "[older tool output cleared to save context]",
        }),
      ],
      tokenCountMethod: "approx",
    }),
  );

  const toolCallLimit = options.toolCallLimit ?? envConfig.AGENT_SPECIALIST_TOOL_LIMIT;
  const modelCallLimit = options.modelCallLimit ?? envConfig.AGENT_SPECIALIST_MODEL_LIMIT;

  if (options.turnDeadline !== false) {
    middleware.push(turnPlazoMiddleware());
  }

  if (options.budget !== false) {
    middleware.push(agentBudgetMiddleware({ modelLimit: modelCallLimit }));
  }

  if (options.duplicateToolGuard !== false) {
    middleware.push(duplicateGuardMiddleware());
  }

  middleware.push(
    toolCallLimitMiddleware({
      runLimit: toolCallLimit,
      exitBehavior: "continue",
    }),
  );
  middleware.push(
    modelCallLimitMiddleware({
      runLimit: modelCallLimit,
      exitBehavior: "end",
    }),
  );

  if (
    envConfig.AGENT_PROMPT_CACHING &&
    String(options.provider ?? "").toUpperCase() === "ANTHROPIC"
  ) {
    middleware.push(
      anthropicPromptCachingMiddleware({
        ttl: "1h",
        unsupportedModelBehavior: "ignore",
      }),
    );
  }

  return middleware;
}

export function logNodoTokens(nodo: string, cantidadMensajes: number, tokens: number): void {
  if (!envConfig.AGENT_TOKEN_LOGGING) return;
  Logger.info({
    message: "[AGENT_TOKENS]",
    data: { nodo, mensajes: cantidadMensajes, tokensEntrada: tokens },
  });
}

export { estimateMessagesTokens };
