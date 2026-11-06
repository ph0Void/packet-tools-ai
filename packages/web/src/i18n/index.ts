import es from "./messages/es";
import en from "./messages/en";
import type { Dictionary } from "./messages/es";
import type { Locale } from "./types";

export const LOCALES: Locale[] = ["es", "en"];

export function getDictionary(
  locale: Locale | string | null | undefined,
): Dictionary {
  return locale === "en" ? en : es;
}

export { DEFAULT_LOCALE, LOCALE_COOKIE } from "./types";
export type { Locale } from "./types";
export type { Dictionary } from "./messages/es";
