"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  type Locale,
} from "@/i18n";

const subscribeToCookies = () => () => {};

function readLocaleCookie(): Locale {
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore(
    subscribeToCookies,
    readLocaleCookie,
    () => DEFAULT_LOCALE,
  );
  const t = getDictionary(locale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale} className="dark">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {t.errors.title}
          </h1>
          <p style={{ color: "#94a3b8" }}>{t.errors.description}</p>
          <button
            onClick={reset}
            style={{
              margin: "0 auto",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #22d3ee55",
              background: "rgba(34,211,238,0.1)",
              color: "#67e8f9",
              cursor: "pointer",
            }}
          >
            {t.errors.retryLabel}
          </button>
        </div>
      </body>
    </html>
  );
}
