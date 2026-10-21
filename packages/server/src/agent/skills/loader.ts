import { Logger } from "@/utils/Logger";
import {
  obtenerSkillPorSlug,
  listarSkills,
  resolverSkill,
  type SkillRow,
} from "@/service/SkillBaseService";

export { slugify } from "./slug";

export interface SkillDocument {
  id: string;

  slug: string;
  title: string;
  description: string;

  path: string;
  content: string;
  updatedAt: Date;
}

interface CacheEntry {
  skills: SkillDocument[];
  loadedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: CacheEntry | null = null;

const MAX_DESCRIPTION_LENGTH = 1024;

const MAX_CONTENT_CHARS = 100_000;

export const SKILLS_ROOT = "/skills";

export const SKILLS_SECTION_HEADER = "## Available skills (in /skills/)";

/**
 * Normaliza un título al identificador de la skill. Sólo se usa al CREAR (el slug queda
 * fijo después): es lo que garantiza que un `@skill:<slug>` guardado por el usuario siga
 * resolviendo aunque la skill se renombre.
 *
 * Reexportada desde `./slug` porque la consumen también `SkillBaseService` y el script de
 * migración; la implementación vive allí para no crear un ciclo con el service.
 */

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function serializeSkillMd(skill: {
  name: string;
  description: string;
  content: string;
}): string {
  const contenido = String(skill.content ?? "").slice(0, MAX_CONTENT_CHARS);
  const yaTieneFrontmatter = /^---\r?\n/.test(contenido.trimStart());
  if (yaTieneFrontmatter) return contenido;

  return [
    "---",
    `name: ${skill.name}`,
    `description: ${yamlString(
      skill.description.slice(0, MAX_DESCRIPTION_LENGTH),
    )}`,
    "---",
    "",
    contenido,
  ].join("\n");
}

/** El slug viene de la columna, no del título: es estable frente a renombrados. */
function toSkillDocument(row: SkillRow): SkillDocument {
  const description =
    row.description && row.description.trim().length > 0
      ? row.description.trim()
      : `Skill «${row.title}» de Packet-Tools.`;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: description.slice(0, MAX_DESCRIPTION_LENGTH),
    path: `${SKILLS_ROOT}/${row.slug}/SKILL.md`,
    content: serializeSkillMd({
      name: row.slug,
      description,
      content: row.content,
    }),
    updatedAt: row.updatedAt,
  };
}

export function documentoDeSkill(row: SkillRow): SkillDocument {
  return toSkillDocument(row);
}

/**
 * Sólo habilidades habilitadas: una desactivada desaparece del catálogo y de la
 * proyección, así que el agente no puede leerla ni aunque la mencione.
 */
export async function cargarSkillsHabilitadas(): Promise<SkillDocument[]> {
  const ahora = Date.now();
  if (cache && ahora - cache.loadedAt < CACHE_TTL_MS) return cache.skills;

  try {
    const rows = await listarSkills({ soloHabilitadas: true });
    const skills = rows.map(toSkillDocument);
    cache = { skills, loadedAt: ahora };
    return skills;
  } catch (error) {
    Logger.error({
      message: "[SKILLS] Error cargando skills desde SkillBase",
      data: error,
    });
    return cache?.skills ?? [];
  }
}

/**
 * Resuelve la skill de una mención `@skill:<slug>` y la proyecta a su archivo virtual.
 * Es la única vía por la que un cuerpo de skill entra en `state.files`.
 */
export async function proyectarSkillMencionada(
  slug: string | null | undefined,
): Promise<SkillDocument | null> {
  if (!slug) return null;

  const porSlug = await obtenerSkillPorSlug(slug.trim().toLowerCase());
  if (porSlug) {
    return porSlug.enabled ? toSkillDocument(porSlug) : null;
  }

  const resuelta = await resolverSkill(slug);
  if (!resuelta?.enabled) return null;
  return toSkillDocument(resuelta);
}

/** Cuerpo de una skill para la tool `read_skill`, o null si no existe / está desactivada. */
export async function cargarSkillBajoDemanda(
  identificador: string,
): Promise<{ slug: string; title: string; document: SkillDocument } | null> {
  const skill = await resolverSkill(identificador);
  if (!skill || !skill.enabled) return null;
  return { slug: skill.slug, title: skill.title, document: toSkillDocument(skill) };
}

export function invalidateSkillsCache(): void {
  cache = null;
}

/**
 * Catálogo para el prompt del sistema: sólo nombre y descripción. Los cuerpos NO se
 * incluyen aquí (progressive disclosure); se piden con `read_skill` cuando hacen falta.
 */
export async function buildSkillsCatalog(): Promise<string> {
  const skills = await cargarSkillsHabilitadas();
  if (skills.length === 0) return "";
  return [
    SKILLS_SECTION_HEADER,
    "Reusable playbooks available on demand. Each has a slug you can invoke with @skill:<slug>:",
    ...skills.map((skill) => `- ${skill.slug}: ${skill.description}`),
  ].join("\n");
}

export function clearSkillsCache(): void {
  cache = null;
}