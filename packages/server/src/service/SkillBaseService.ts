import { Prisma } from "@/prisma/generated/client";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { slugify } from "@/agent/skills/slug";

/**
 * Única capa de escritura sobre `SkillBase`. La comparten el router HTTP, las tools del
 * agente y los scripts de migración: cuando cada consumidor escribía por su cuenta (skills
 * en `KnowledgeBase`) los caminos divergían y una skill creada desde el chat no aparecía
 * en la UI.
 */

export const SKILL_ROW = {
  id: true,
  slug: true,
  title: true,
  description: true,
  content: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

export type SkillRow = Prisma.SkillBaseGetPayload<{ select: typeof SKILL_ROW }>;

export class SkillSlugDuplicadoError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(`Ya existe una skill con el identificador '${slug}'`);
    this.name = "SkillSlugDuplicadoError";
    this.slug = slug;
  }
}

export class SkillNoEncontradaError extends Error {
  constructor(id: string) {
    super(`No existe la skill '${id}'`);
    this.name = "SkillNoEncontradaError";
  }
}

export interface ListarSkillsOpciones {
  q?: string;
  soloHabilitadas?: boolean;
  limite?: number;
}

export interface CrearSkillEntrada {
  title: string;
  description?: string | null;
  content: string;
  createdById?: string | null;
}

export interface ActualizarSkillEntrada {
  title?: string;
  description?: string | null;
  content?: string;
  enabled?: boolean;
}

/** Listado sin `content`: lo que consumen el autocomplete del chat y el catálogo del agente. */
const SELECT_LISTADO = {
  id: true,
  slug: true,
  title: true,
  description: true,
  enabled: true,
  updatedAt: true,
  createdById: true,
} as const;

export type SkillResumen = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  enabled: boolean;
  updatedAt: Date;
  createdById: string | null;
};

function esSlugDuplicado(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" ||
      String((error as { meta?: { target?: unknown } }).meta?.target ?? "").includes(
        "slug",
      ))
  );
}

export async function listarSkills(
  opciones: ListarSkillsOpciones = {},
): Promise<SkillRow[]> {
  return prismaClient.skillBase.findMany({
    where: construirWhereSkills(opciones),
    select: SKILL_ROW,
    orderBy: { updatedAt: "desc" },
    ...(opciones.limite ? { take: opciones.limite } : {}),
  });
}

/** Igual que `listarSkills` pero sin `content`, para no arrastrar los cuerpos completos. */
export async function listarSkillsResumidas(
  opciones: ListarSkillsOpciones = {},
): Promise<SkillResumen[]> {
  return prismaClient.skillBase.findMany({
    where: construirWhereSkills(opciones),
    select: SELECT_LISTADO,
    orderBy: { updatedAt: "desc" },
    ...(opciones.limite ? { take: opciones.limite } : {}),
  });
}

function construirWhereSkills(opciones: ListarSkillsOpciones) {
  return {
    ...(opciones.soloHabilitadas ? { enabled: true } : {}),
    ...(opciones.q ? { title: { contains: opciones.q } } : {}),
  };
}

export async function obtenerSkillPorId(id: string): Promise<SkillRow | null> {
  return prismaClient.skillBase.findUnique({ where: { id }, select: SKILL_ROW });
}

export async function obtenerSkillPorSlug(slug: string): Promise<SkillRow | null> {
  return prismaClient.skillBase.findUnique({
    where: { slug },
    select: SKILL_ROW,
  });
}

/**
 * Resuelve un identificador ambiguo: primero exacto como slug y, si no, por título
 * normalizado. Permite que el agente diga "carga la skill OSPF" sin conocer el slug.
 */
export async function resolverSkill(identificador: string): Promise<SkillRow | null> {
  const limpio = identificador.trim();
  if (!limpio) return null;

  const porSlug = await obtenerSkillPorSlug(limpio.toLowerCase());
  if (porSlug) return porSlug;

  const porTitulo = await prismaClient.skillBase.findMany({
    where: { title: { contains: limpio } },
    select: SKILL_ROW,
    take: 20,
  });

  const objetivo = limpio.toLowerCase();
  return (
    porTitulo.find((s) => s.title.trim().toLowerCase() === objetivo) ??
    porTitulo.find((s) => slugify(s.title) === objetivo) ??
    porTitulo[0] ??
    null
  );
}

/**
 * El `slug` se asigna una vez y NO cambia al renombrar el título: es lo que usa la mención
 * `@skill:<slug>`, así que si se recalculara, toda mención guardada por el usuario dejaría
 * de resolver en silencio.
 */
export async function crearSkill(
  entrada: CrearSkillEntrada,
): Promise<SkillRow> {
  try {
    return await prismaClient.skillBase.create({
      data: {
        slug: slugify(entrada.title),
        title: entrada.title,
        description: entrada.description ?? null,
        content: entrada.content,
        createdById: entrada.createdById ?? null,
      },
      select: SKILL_ROW,
    });
  } catch (error) {
    if (esSlugDuplicado(error)) {
      throw new SkillSlugDuplicadoError(slugify(entrada.title));
    }
    throw error;
  }
}

export async function actualizarSkill(
  id: string,
  cambios: ActualizarSkillEntrada,
): Promise<SkillRow> {
  const existente = await prismaClient.skillBase.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existente) throw new SkillNoEncontradaError(id);

  return prismaClient.skillBase.update({
    where: { id },
    data: {
      ...(cambios.title !== undefined ? { title: cambios.title } : {}),
      ...(cambios.description !== undefined
        ? { description: cambios.description }
        : {}),
      ...(cambios.content !== undefined ? { content: cambios.content } : {}),
      ...(cambios.enabled !== undefined ? { enabled: cambios.enabled } : {}),
    },
    select: SKILL_ROW,
  });
}

export async function eliminarSkill(id: string): Promise<SkillRow> {
  const existente = await prismaClient.skillBase.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existente) throw new SkillNoEncontradaError(id);
  return prismaClient.skillBase.delete({ where: { id }, select: SKILL_ROW });
}

export async function contarSkills(soloHabilitadas = false): Promise<number> {
  return prismaClient.skillBase.count({
    where: soloHabilitadas ? { enabled: true } : {},
  });
}