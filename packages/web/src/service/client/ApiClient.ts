import { getAuthHeader } from "@/service/client/CookieService";
import { getDictionary } from "@/i18n";
import { LOCALE_COOKIE } from "@/i18n/types";
import { playSound } from "@/lib/sounds/playSound";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const isEnglishLocale = () =>
  typeof document !== "undefined" &&
  new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=en(?:;|$)`).test(document.cookie);

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(init?.headers);
    Object.entries(await getAuthHeader()).forEach(([key, value]) =>
      headers.set(key, value),
    );

    if (
      init?.body &&
      !(init.body instanceof FormData) &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    return (await res.json()) as ApiResponse<T>;
  } catch (error) {
    playSound("error");
    console.error(`Error en la petición a ${path}:`, error);
    return {
      success: false,
      message: getDictionary(isEnglishLocale() ? "en" : "es").errors
        .connectionError,
      data: null,
    };
  }
}
