import { prismaClient } from "@/prisma/lib/PrismaClient";
import { slugify } from "@/agent/skills/slug";

/**
 * Barre las skills que hoy viven en `KnowledgeBase WHERE type='SKILL'` a la tabla propia
 * `SkillBase` y borra las filas de origen.
 *
 * Idempotente: una skill ya migrada se reconoce por título y se omite (borrando además su
 * fila huérfana de KnowledgeBase), así que se puede correr dos veces sin duplicar ni perder.
 *
 * El slug lo deriva `slugify()` y NO SQL a propósito: SQLite no tiene REGEXP en el bundle de
 * better-sqlite3, así que no se pueden quitar acentos ni colapsar separadores con una
 * expresión. Reimplementarlo en SQL haría que la lógica viviera en dos sitios y divergiera.
 *
 *   npx tsx scripts/migrate-skills.ts --dry-run   # siempre primero
 *   npx tsx scripts/migrate-skills.ts
 */

interface FilaSkill {
  id: string;
  title: string;
  content: string;
  description: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Resultado {
  title: string;
  slug: string;
  estado: "migrada" | "omitida";
  motivo?: string;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function resumirMotivo(motivo: string): string {
  return motivo.length > 90 ? `${motivo.slice(0, 87)}…` : motivo;
}

/**
 * La lectura va en SQL crudo a propósito: tras quitar `SKILL` del enum `TypeDataBase` el
 * cliente tipado ya no acepta ese valor, pero las filas legacy siguen conteniéndolo como
 * TEXT (SQLite guarda los enums sin CHECK constraint). Es la única forma de encontrarlas.
 */
async function leerCandidatas(): Promise<FilaSkill[]> {
  return prismaClient.$queryRaw<FilaSkill[]>`
    SELECT "id", "title", "content", "description", "createdById", "createdAt", "updatedAt"
    FROM "KnowledgeBase"
    WHERE "type" = 'SKILL'
    ORDER BY "createdAt" ASC
  `;
}

async function contarRemanentes(): Promise<number> {
  const filas = await prismaClient.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) AS total FROM "KnowledgeBase" WHERE "type" = 'SKILL'
  `;
  return Number(filas[0]?.total ?? 0n);
}

/**
 * El borrado va en SQL crudo por la misma razón que la lectura, y con un motivo extra:
 * `prismaClient.knowledgeBase.delete()` sí ejecuta el DELETE, pero Prisma 7 deserializa la
 * fila devuelta contra el enum `TypeDataBase`, que ya no tiene `SKILL`. O sea: borra y
 * después lanza `Value 'SKILL' not found in enum 'TypeDataBase'`, dejando el script con la
 * impresión de haber fallado cuando en realidad la fila ya no está. En crudo no hay
 * deserialización y no se puede dar ese falso negativo.
 */
async function borrarFilaLegacy(id: string): Promise<void> {
  await prismaClient.$executeRaw`DELETE FROM "KnowledgeBase" WHERE "id" = ${id}`;
}

async function migrar(dryRun: boolean): Promise<void> {
  const candidatas = await leerCandidatas();

  const existentes = await prismaClient.skillBase.findMany({
    select: { slug: true, title: true },
  });

  // Normalización de título idéntica a la de `buscarSkillPorTitulo` en las tools del
  // agente: comparar por título (y no por slug) es lo que hace la corrida idempotente sin
  // perder skills. Con slug solamente, un fallo a medias dejaría fuera a la skill que
  // colisiona y su contenido se perdería.
  const titulosMigrados = new Map(
    existentes.map((s) => [normalizarTitulo(s.title), s.slug] as const),
  );
  const slugsOcupados = new Set(existentes.map((s) => s.slug));

  const resultados: Resultado[] = [];
  let migradas = 0;
  let omitidas = 0;

  for (const fila of candidatas) {
    const clave = normalizarTitulo(fila.title);
    const slugExistente = titulosMigrados.get(clave);

    if (slugExistente) {
      // Ya está en SkillBase (corrida anterior). Se limpia la fila huérfana para que la
      // verificación llegue a cero y las siguientes corridas no vuelvan a mirarla.
      if (!dryRun) {
        await borrarFilaLegacy(fila.id);
      }
      resultados.push({
        title: fila.title,
        slug: slugExistente,
        estado: "omitida",
        motivo: "ya migrada en una corrida anterior",
      });
      omitidas += 1;
      continue;
    }

    // Dos títulos distintos que normalizan al mismo slug se pisaban entre sí en
    // `/skills/<slug>/SKILL.md` (el filesystem virtual es un Record y el último ganaba).
    // La primera se queda con el slug; las siguientes ganan un sufijo para no perder
    // contenido.
    const slugBase = slugify(fila.title);
    const slug = slugLibre(slugBase, slugsOcupados);
    slugsOcupados.add(slug);
    titulosMigrados.set(clave, slug);

    if (!dryRun) {
      await prismaClient.skillBase.create({
        data: {
          slug,
          title: fila.title,
          description: fila.description ?? null,
          content: fila.content,
          enabled: true,
          createdAt: fila.createdAt,
          updatedAt: fila.updatedAt,
          createdById: fila.createdById,
        },
      });
      await borrarFilaLegacy(fila.id);
    }

    resultados.push({ title: fila.title, slug, estado: "migrada" });
    migradas += 1;
  }

  if (!dryRun) {
    // `userId` se deja a propósito en null: es una acción del sistema, no de un usuario.
    // Las filas con userId null sólo las ve ADMIN, que es lo correcto para una migración.
    await prismaClient.log.create({
      data: {
        level: "ADMIN_ACTION",
        title: "Migración KnowledgeBase → SkillBase",
        content: `migradas=${migradas} omitidas=${omitidas} candidatas=${candidatas.length}`,
      },
    });
  }

  const remanentes = await contarRemanentes();
  const enDestino = await prismaClient.skillBase.count();

  const label = dryRun ? "[dry-run] " : "";
  console.log(`${label}Candidatas en KnowledgeBase: ${candidatas.length}`);
  console.log(`${label}Migradas: ${migradas} · omitidas: ${omitidas}`);
  for (const r of resultados) {
    const sufijo = r.estado === "migrada" ? "" : ` [${resumirMotivo(r.motivo ?? "")}]`;
    console.log(`  ${r.estado} ${r.slug}  «${r.title}»${sufijo}`);
  }
  console.log(
    `${label}Verificación: SkillBase tiene ${enDestino} fila(s); KnowledgeBase conserva ${remanentes} con type='SKILL'`,
  );
  if (dryRun) {
    console.log("\nDry-run: no se ha escrito nada. Repite sin --dry-run para aplicar.");
  }
}

function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLowerCase();
}

function slugLibre(base: string, ocupados: Set<string>): string {
  if (!ocupados.has(base)) return base;
  let n = 2;
  while (ocupados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

async function main(): Promise<void> {
  if (hasFlag("--revert")) {
    throw new Error(
      "No hay --revert: deshacer esta migración destruiría skills. Copia la base antes de aplicar.",
    );
  }
  await migrar(hasFlag("--dry-run"));
}

main()
  .catch((error: unknown) => {
    console.error(
      "[migrate-skills] Error:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });