import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./types";
import { getDictionary } from "./index";

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : DEFAULT_LOCALE;
}

export async function getServerDictionary() {
  return getDictionary(await getServerLocale());
}
