/**
 * Normalización de títulos a identificadores de skill. Vive en su propio módulo (y no en
 * `loader.ts`) porque lo necesitan tanto el loader como `SkillBaseService`, y meterlo en
 * cualquiera de los dos crearía un ciclo de importación: loader → service → loader.
 *
 * Es la MISMA función que debe usar el frontend para construir el token de la mención, o
 * `@skill:<slug>` deja de resolver. El backend expone el slug ya calculado en la columna
 * `SkillBase.slug`, así que el cliente ya no necesita duplicarla (ver
 * `packages/web/src/component/chat/items/MentionAutocomplete.tsx`).
 */
export function slugify(title: string): string {
  const base = String(title ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 64) || "skill";
}