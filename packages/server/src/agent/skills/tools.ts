import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { requestContext } from "@/utils/RequestContext";
import {
  actualizarSkill,
  crearSkill,
  eliminarSkill,
  listarSkills,
  resolverSkill,
  SkillNoEncontradaError,
  SkillSlugDuplicadoError,
} from "@/service/SkillBaseService";
import {
  cargarSkillBajoDemanda,
  invalidateSkillsCache,
} from "./loader";

interface SkillTurn {
  userId: string;
  username: string;
  role: string;
}

/**
 * El `emit` del turno vive en `approvalChannel`, no en la raíz del contexto
 * (`RequestContext`). Leerlo de aquí hacía que `skill_created` y `admin_action` nunca se
 * emitieran: el toast del chat y el log `AGENT_SKILL` nunca aparecían.
 */
function emitTurno(evento: string, data: unknown): void {
  const ctx = requestContext.getStore();
  ctx?.approvalChannel?.emit?.(evento, data);
}

function turno(): SkillTurn | null {
  return (requestContext.getStore() as SkillTurn | undefined) ?? null;
}

class SkillError extends Error {}

function exigeAdmin(operacion: string): SkillTurn {
  const ctx = turno();
  if (!ctx) throw new SkillError(`No hay contexto de turno para ${operacion}.`);
  if (ctx.role !== "ADMIN") {
    throw new SkillError(
      `Operación '${operacion}' reservada al rol ADMIN (rol actual: ${ctx.role}).`,
    );
  }
  return ctx;
}

function exigeStaff(operacion: string): SkillTurn {
  const ctx = turno();
  if (!ctx) throw new SkillError(`No hay contexto de turno para ${operacion}.`);
  if (ctx.role !== "ADMIN" && ctx.role !== "STAFF") {
    throw new SkillError(
      `Operación '${operacion}' requiere rol ADMIN o STAFF (rol actual: ${ctx.role}).`,
    );
  }
  return ctx;
}

async function auditarSkill(params: {
  accion: string;
  objetivo: string;
  resultado: "ok" | "error";
  payload?: Record<string, unknown>;
}): Promise<void> {
  const ctx = turno();
  try {
    await prismaClient.log.create({
      data: {
        level: "ADMIN_ACTION",
        title: `${params.accion} skill → ${params.objetivo}`,

        userId: ctx?.userId ?? null,
        content:
          `actor=${ctx?.username ?? "system"} (${ctx?.role ?? "?"}) ` +
          `resultado=${params.resultado}` +

          (params.payload === undefined ? "" : ` payload=${JSON.stringify(params.payload)}`),
      },
    });
  } catch {

  }
  emitTurno("admin_action", {
    action: params.accion,
    target: `skill:${params.objetivo}`,
    result: params.resultado,
  });
}

function responder(fn: () => Promise<unknown>): Promise<string> {
  return (async () => {
    try {
      return JSON.stringify(await fn());
    } catch (error) {
      if (error instanceof SkillError) {
        return JSON.stringify({ success: false, error: error.message });
      }
      if (error instanceof SkillSlugDuplicadoError) {
        return JSON.stringify({ success: false, error: error.message });
      }
      if (error instanceof SkillNoEncontradaError) {
        return JSON.stringify({ success: false, error: error.message });
      }
      throw error;
    }
  })();
}

const MAX_CHARS_READ_SKILL = 20_000;

/**
 * Carga el cuerpo de una skill bajo demanda. Es el mecanismo de progressive disclosure:
 * el catálogo del prompt sólo da slug y descripción, y el modelo pide el cuerpo aquí
 * cuando una petición encaja con alguna skill.
 */
const readSkillTool = tool(
  async ({ name }) =>
    responder(async () => {
      const skill = await cargarSkillBajoDemanda(name);
      if (!skill) {
        return {
          success: false,
          error: `No existe ninguna skill habilitada identificada como '${name}'. Consulta 'listSkills' para ver las disponibles.`,
        };
      }

      const truncado = skill.document.content.length > MAX_CHARS_READ_SKILL;
      const contenido = truncado
        ? skill.document.content.slice(0, MAX_CHARS_READ_SKILL) +
          "\n\n[AVISO: contenido recortado. Si el procedimiento quedó incompleto, dilo al usuario en lugar de suponer los pasos que faltan.]"
        : skill.document.content;

      return {
        success: true,
        slug: skill.slug,
        title: skill.title,
        description: skill.document.description,
        truncated: truncado,
        content: contenido,
      };
    }),
  {
    name: "read_skill",
    description:
      "Carga el contenido completo de una skill (playbook reutilizable) por su slug o su título. Úsala ANTES de actuar cuando la petición del usuario encaje con alguna skill del catálogo: el catálogo sólo da nombre y descripción, el procedimiento completo está aquí. No inventes el contenido de una skill que no hayas cargado.",
    schema: z.object({
      name: z
        .string()
        .min(1)
        .max(200)
        .describe("Slug de la skill (como aparece en el catálogo) o su título"),
    }),
  },
);

const listSkillsTool = tool(
  async ({ filter }) => {
    const resumen = await listarSkills({
      q: filter?.query,
      soloHabilitadas: true,
      limite: 100,
    });
    const habilidades = resumen.map((skill) => ({
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      description: skill.description,
      updatedAt: skill.updatedAt,
    }));
    return JSON.stringify({
      success: true,
      count: habilidades.length,
      hint: "Usa 'read_skill' con el slug para cargar el procedimiento completo.",
      skills: habilidades,
    });
  },
  {
    name: "listSkills",
    description:
      "Lista las skills de agente disponibles (playbooks reutilizables) con su slug y descripción. Úsela para responder '¿qué skills tengo?' o antes de crear una similar.",
    schema: z.object({
      filter: z.object({ query: z.string().max(200).optional() }).optional(),
    }),
  },
);

const createSkillTool = tool(
  async (args) =>
    responder(async () => {
      const ctx = exigeStaff("createSkill");

      const existente = await resolverSkill(args.title);
      if (existente) {
        return {
          success: true,
          created: false,
          reason: `Ya existe la skill «${existente.title}» (slug ${existente.slug}). Actualízala si el contenido debe cambiar.`,
          skill: { id: existente.id, title: existente.title, slug: existente.slug },
        };
      }

      const creada = await crearSkill({
        title: args.title,
        description: args.description ?? null,
        content: args.content,
        createdById: ctx.userId,
      });

      invalidateSkillsCache();
      await auditarSkill({
        accion: "createSkill",
        objetivo: creada.title,
        resultado: "ok",
        payload: { id: creada.id, slug: creada.slug },
      });
      emitTurno("skill_created", { skillId: creada.id, title: creada.title, slug: creada.slug });

      return {
        success: true,
        created: true,
        skill: creada,
        hint: `Ya está disponible. El usuario puede invocarla con @skill:${creada.slug} o pedirte que la cargues con 'read_skill'.`,
      };
    }),
  {
    name: "createSkill",
    description:
      "Crea una skill de agente (playbook reutilizable). Antes de crearla, consulta 'listSkills' para no duplicar. El contenido debe incluir cuándo aplicarla y los pasos concretos. Se puede invocar después con @skill:<slug>.",
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z
        .string()
        .max(1024)
        .optional()
        .describe("Cuándo usar esta skill y para qué (una frase)"),
      content: z
        .string()
        .min(1)
        .max(100_000)
        .describe("Cuerpo de la skill: pasos, comandos de ejemplo y criterios de verificación"),
    }),
  },
);

const updateSkillTool = tool(
  async (args) =>
    responder(async () => {
      exigeStaff("updateSkill");

      const skill = await resolverSkill(args.id);
      if (!skill) throw new SkillError(`No existe la skill '${args.id}'.`);

      const actualizada = await actualizarSkill(skill.id, {
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.description !== undefined
          ? { description: args.description }
          : {}),
        ...(args.content !== undefined ? { content: args.content } : {}),
        ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
      });

      invalidateSkillsCache();
      await auditarSkill({
        accion: "updateSkill",
        objetivo: actualizada.title,
        resultado: "ok",
      });
      return {
        success: true,
        skill: actualizada,
        note: `El identificador '${actualizada.slug}' no cambia aunque se renombre el título, para que las menciones @skill: sigan resolviendo.`,
      };
    }),
  {
    name: "updateSkill",
    description:
      "Actualiza el título, la descripción, el contenido o el estado habilitado de una skill existente. El slug NO cambia: las menciones @skill: siguen resolviendo.",
    schema: z.object({
      id: z.string().min(1).describe("Slug o id de la skill"),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(1024).optional(),
      content: z.string().min(1).max(100_000).optional(),
      enabled: z.boolean().optional(),
    }),
  },
);

const deleteSkillTool = tool(
  async ({ id }) =>
    responder(async () => {

    exigeAdmin("deleteSkill");
    const skill = await resolverSkill(id);
    if (!skill) throw new SkillError(`No existe la skill '${id}'.`);

    await eliminarSkill(skill.id);
    invalidateSkillsCache();
    await auditarSkill({
      accion: "deleteSkill",
      objetivo: skill.title,
      resultado: "ok",
    });
    return { success: true, deletedId: skill.id, deletedSlug: skill.slug };
  }),
  {
    name: "deleteSkill",
    description:
      "Elimina permanentemente una skill. Es destructivo: requiere rol ADMIN y confirmación del usuario.",
    schema: z.object({ id: z.string().min(1) }),
  },
);

/**
 * Sólo documentos del RAG. Las skills se crean con `createSkill`: esta tool escribe
 * `type=DATA`, que el agente no lee como playbook.
 */
const createKnowledgeDocumentTool = tool(
  async (args) =>
    responder(async () => {
      const ctx = exigeStaff("createKnowledgeDocument");

      const existente = await prismaClient.knowledgeBase.findFirst({
        where: { type: "DATA", title: args.title },
      });
      if (existente) {
        return {
          success: true,
          created: false,
          reason: "Ya existe un documento con ese título.",
          document: { id: existente.id, title: existente.title },
        };
      }
      const creado = await prismaClient.knowledgeBase.create({
        data: {
          title: args.title,
          description: args.description ?? null,
          content: args.content,
          type: "DATA",
          createdById: ctx.userId,
        },
        select: { id: true, title: true, updatedAt: true },
      });
      await auditarSkill({
        accion: "createKnowledgeDocument",
        objetivo: creado.title,
        resultado: "ok",
      });
      return { success: true, created: true, document: creado };
    }),
  {
    name: "createKnowledgeDocument",
    description:
      "Añade un documento (tipo DATA) a la base de conocimiento para que el RAG lo recupere. Para playbooks de agente usa createSkill en su lugar.",
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1024).optional(),
      content: z.string().min(1).max(200_000),
    }),
  },
);

export const SKILL_TOOLS = [
  readSkillTool,
  listSkillsTool,
  createSkillTool,
  updateSkillTool,
  deleteSkillTool,
  createKnowledgeDocumentTool,
] as const;

export const SKILL_TOOLS_STAFF = SKILL_TOOLS.filter(
  (t) => t.name !== "deleteSkill",
);

/**
 * Única tool de skills que ve el supervisor: `read_skill`.
 *
 * El resto (`listSkills`, `createSkill`, `updateSkill`, `deleteSkill`) queda en
 * `system_admin_specialist`. El presupuesto de tools del supervisor está medido y vigilado
 * por el eval `consulta-simple-consola` (`test/agent-evals/escenarios.ts`): cada schema
 * adicional se paga en CADA llamada al modelo, y subir las cuatro costaba ~545 tokens por
 * turno. La creación desde el chat sigue funcionando porque el prompt del supervisor ahora
 * nombra a `system_admin_specialist` y le delega.
 *
 * `deleteSkill` además es irreversible y sólo ADMIN.
 */
export { readSkillTool };