import { createMiddleware, type AgentMiddleware } from "langchain";
import { ToolMessage } from "@langchain/core/messages";
import { proposeOptionsTool, OPTIONS_PRESENTED_MARKER } from "./Tool";
import { PLAN_MODE_PROMPT } from "./Promt";
import { requestContext } from "@/utils/RequestContext";
import { getToolPolicy } from "@/agent/security/ToolPolicy";
import { Logger } from "@/utils/Logger";

/**
 * Modo planificación de un turno `@plan`.
 *
 * Dos responsabilidades, y la primera es la trampa del diseño:
 *
 * 1. **Filtrar herramientas**: sólo pueden pasar las de investigación real (readonly) más
 *    `write_todos` y `propose_options`. Estas dos NO están en el mapa de ToolPolicy y
 *    `getToolPolicy` responde `mutating` (fail-closed) para lo desconocido
 *    (ToolPolicy.ts:648-656), así que un filtro "sólo access === 'readonly'" las
 *    eliminaría y mataría la tarjeta del plan. Por eso se permiten POR NOMBRE y no por
 *    access. La delegación (`task`/`transfer_to_*`) y toda mutante quedan fuera.
 *
 * 2. **Cerrar el turno sin ejecutar**: cuando `propose_options` ya presentó las opciones
 *    (marcador OPTIONS_PRESENTED en el historial), el modelo pasa a tener CERO
 *    herramientas: sólo puede redactar el cierre. Es el mismo patrón de strip que
 *    `lazyTools.ts` usa en producción.
 *
 * Sin `planRequired` el middleware hace retorno temprano y NO cambia nada: el prompt y las
 * herramientas del supervisor quedan intactos en los turnos normales, que es lo que los
 * evals (`consulta-simple-consola`) vigilan.
 */

const WRITE_TODOS = "write_todos";

const NOMBRE = "PlanModeMiddleware";

export function esHerramientaDePlan(name: string): boolean {
  return name === WRITE_TODOS || name === proposeOptionsTool.name;
}

/** Las herramientas readonly reales + las dos del plan, por nombre y no por access. */
function herramientasDePlan(request: {
  tools?: Array<{ name?: string }>;
}): Array<{ name?: string }> {
  const todas = request.tools ?? [];
  return todas.filter((t) => {
    const nombre = t?.name ?? "";
    if (esHerramientaDePlan(nombre)) return true;
    // Fail-closed igual que ToolPolicy: lo desconocido se va. Sólo las readonly reales
    // sobreviven (investigación permitida: RAG, web, skills, lecturas de consola).
    const policy = getToolPolicy(nombre);
    return policy.access === "readonly";
  });
}

/** ¿El turno ya presentó las opciones? Identidad por marcador, no por parseo de JSON. */
function opcionesYaPresentadas(mensajes: unknown[]): boolean {
  return mensajes.some((m) => {
    const contenido = (m as { content?: unknown })?.content;
    if (typeof contenido !== "string") return false;
    return contenido.includes(OPTIONS_PRESENTED_MARKER);
  });
}

/**
 * Detecta el marcador en `request.messages` (lo que se envía al modelo) y en
 * `request.state.messages` (el estado del grafo): la tool escribe el marcador como
 * contenido de su ToolMessage, y según dónde esté el turno uno u otro lo lleva.
 */
function turnoConOpcionesPresentadas(request: {
  messages?: unknown[];
  state?: { messages?: unknown[] } | null;
}): boolean {
  return (
    opcionesYaPresentadas(request.messages ?? []) ||
    opcionesYaPresentadas(request.state?.messages ?? [])
  );
}

/**
 * Dos fuentes, por este orden:
 *
 * 1. `runtime.context` del grafo (lo que `buildTurnContext` puso): es la verdad scoped al
 *    turno de LangGraph.
 * 2. `AsyncLocalStorage` del turno HTTP: `turnoStream` lo puebla con la mención resuelta,
 *    y `ApprovalMiddleware` ya demuestra en producción que se propaga dentro del grafo.
 *
 * Se revisan las dos porque ninguna de las solas es garantía: el runtime depende de cómo
 * deepagents lo pase a cada middleware, y AsyncLocalStorage depende de que el consumo del
 * stream siga dentro del `requestContext.run`.
 */
function enModoPlan(request: { runtime?: { context?: unknown } | null }): boolean {
  const contexto = request.runtime?.context as { planRequired?: boolean } | undefined | null;
  if (contexto?.planRequired) return true;
  return Boolean(requestContext.getStore()?.planRequired);
}

export function planModeMiddleware(): AgentMiddleware {
  return createMiddleware({
    name: NOMBRE,
    wrapModelCall: async (request, handler) => {
      if (!enModoPlan(request)) return handler(request);

      const yaPresentadas = turnoConOpcionesPresentadas(request);

      if (yaPresentadas) {
        // Turno de plan ya con opciones presentadas: el modelo sólo puede redactar el
        // cierre. Cero herramientas = imposible ejecutar nada a partir de aquí.
        return handler({ ...request, tools: [] as never });
      }

      const filtradas = herramientasDePlan(request);
      const sistema = `${String(request.systemMessage ?? "")}\n\n${PLAN_MODE_PROMPT}`;

      Logger.info({
        message: "[PLAN] Turno de planificación: tools filtradas",
        data: {
          total: (request.tools ?? []).length,
          permitidas: filtradas.map((t) => t?.name ?? "(sin nombre)"),
        },
      });

      return handler({
        ...request,
        tools: filtradas as never,
        systemMessage: sistema,
      } as never);
    },
    wrapToolCall: async (request, handler) => {
      if (!enModoPlan(request)) return handler(request);

      const nombre = String(
        (request as { toolCall?: { name?: string } }).toolCall?.name ?? "",
      );

      // Las permitidas pasan; el resto recibe un rechazo claro SIN ejecutar.
      if (esHerramientaDePlan(nombre)) return handler(request);
      const policy = getToolPolicy(nombre);
      if (policy.access === "readonly") return handler(request);

      return new ToolMessage({
        content:
          `[PLAN] La herramienta '${nombre}' no está disponible en modo planificación ` +
          "(@plan): el turno sólo puede investigar y proponer, no ejecutar. " +
          "Presenta tus opciones con 'propose_options' y termina; la elección del usuario " +
          "llegará en el siguiente mensaje.",
        tool_call_id: String(
          (request as { toolCall?: { id?: string } }).toolCall?.id ?? "",
        ),
        name: nombre,
      }) as never;
    },
  });
}