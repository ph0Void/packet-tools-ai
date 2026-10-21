import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { requestContext } from "@/utils/RequestContext";
import { Logger } from "@/utils/Logger";

/**
 * Última tool del turno de planificación: presenta las opciones al usuario por SSE y
 * ordena al supervisor TERMINAR sin ejecutar.
 *
 * No toca la base de datos ni ejecuta nada: valida, emite `options_requested` y devuelve
 * un recordatorio. La elección del usuario llega después como un mensaje normal del chat
 * (sin broker, sin endpoint), igual que hace "Continuar tarea".
 *
 * La emisión va por `ctx.approvalChannel?.emit` y NO por un emit raíz: el emit del turno
 * vive en `approvalChannel` (ver RequestContext), y leerlo de la raíz hacía que el evento
 * nunca llegara (bug ya visto con `skill_created`).
 */

const OPCION_SCHEMA = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .describe("Identificador corto y estable de la opción (ej: 'ospf-area-unica')"),
  title: z.string().min(1).max(120).describe("Título breve de la opción"),
  description: z
    .string()
    .min(1)
    .max(1000)
    .describe("Qué hace esta opción y qué implica, en 1-3 frases"),
  risk: z
    .enum(["safe", "config", "danger"])
    .describe(
      "safe: sin cambios de configuración; config: cambia configuración del equipo; danger: incluye algo destructivo o de impacto",
    ),
  commands: z
    .array(z.string().max(400))
    .max(20)
    .optional()
    .describe("Comandos concretos que se ejecutarían si el usuario elige esta opción"),
  tradeoff: z
    .string()
    .max(500)
    .optional()
    .describe("Qué se gana y qué se pierde frente a las demás opciones"),
});

const SCHEMA = z.object({
  planTitle: z.string().min(1).max(120).describe("Título del plan propuesto"),
  planSummary: z
    .string()
    .min(1)
    .max(2000)
    .describe("Resumen de lo investigado y de lo que el plan pretende lograr"),
  recommendedId: z
    .string()
    .min(1)
    .max(80)
    .describe("id de la opción que recomiendas (DEBE ser el id de una opción de la lista)"),
  options: z
    .array(OPCION_SCHEMA)
    .min(2)
    .max(6)
    .describe("Entre 2 y 6 opciones mutuamente excluyentes para lograr el objetivo"),
});

export const OPTIONS_PRESENTED_MARKER = "OPTIONS_PRESENTED";

function emitirOpciones(payload: unknown): void {
  const ctx = requestContext.getStore();
  ctx?.approvalChannel?.emit?.("options_requested", payload);
}

async function auditarOpciones(planTitle: string, total: number, recomendada: string): Promise<void> {
  const ctx = requestContext.getStore();
  try {
    // `ctx.id` es el userId del turno: sin él, la fila nunca la vería su autor
    // (regla de AGENTS.md sobre userId).
    await prismaClient.log.create({
      data: {
        level: "AGENT_PLAN",
        title: `Opciones de plan → ${planTitle.slice(0, 120)}`,
        content: `recomendada=${recomendada} opciones=${total}`,
        userId: ctx?.id ?? null,
      },
    });
    Logger.info({
      message: "[PLAN] Opciones presentadas al usuario",
      data: { planTitle, total, recomendada },
    });
  } catch {
    // La auditoría no debe romper nunca el turno: mismo fail-soft que auditarSkill.
  }
}

function planoValido(args: z.infer<typeof SCHEMA>): string | null {
  const ids = new Set(args.options.map((o) => o.id));
  if (ids.size !== args.options.length) {
    return "Dos o más opciones repiten el mismo id. Renómbralas para que sean únicos.";
  }
  if (!ids.has(args.recommendedId)) {
    return `recommendedId '${args.recommendedId}' no corresponde a ninguna opción de la lista`;
  }
  return null;
}

export const proposeOptionsTool = tool(
  async (args) => {
    const motivo = planoValido(args);
    if (motivo) {
      return JSON.stringify({ success: false, error: motivo });
    }

    emitirOpciones({
      planTitle: args.planTitle,
      planSummary: args.planSummary,
      recommendedId: args.recommendedId,
      options: args.options,
    });

    await auditarOpciones(args.planTitle, args.options.length, args.recommendedId);

    return JSON.stringify({
      success: true,
      status: OPTIONS_PRESENTED_MARKER,
      optionsPresented: args.options.length,
      recommendedId: args.recommendedId,
      instruction:
        "OPCIONES PRESENTADAS. TERMINA EL TURNO YA: responde en 1-3 frases presentando las opciones y NO llames a ninguna otra herramienta. La elección del usuario llegará en el siguiente mensaje del chat. No ejecutes nada.",
    });
  },
  {
    name: "propose_options",
    description:
      "Presenta al usuario entre 2 y 6 opciones mutuamente excluyentes para lograr el objetivo del plan, con una recomendada. Sólo usable en modo planificación (@plan): debe ser la ÚLTIMA tool del turno, y tras llamarla terminas sin ejecutar nada. Cada opción lleva título, descripción, riesgo (safe/config/danger), comandos opcionales y qué se gana o pierde.",
    schema: SCHEMA,
  },
);

export type OpcionesPlanPayload = z.infer<typeof SCHEMA>;