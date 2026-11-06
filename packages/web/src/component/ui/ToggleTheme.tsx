"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useT";

const emptySubscribe = () => () => {};

export default function ToggleTheme() {
  const t = useT();
  const themeUI = useUiStore((state) => state.theme);
  const changeTheme = useUiStore((state) => state.changeTheme);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    const html = document.documentElement;
    if (themeUI === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [themeUI]);

  const toggleThemeButton = () => {
    changeTheme();
  };

  if (!mounted) {
    return <div className="size-9 shrink-0 rounded-lg" />;
  }

  return (
    <button
      type="button"
      onClick={toggleThemeButton}
      aria-label={
        themeUI === "dark" ? t.topbar.theme.toLight : t.topbar.theme.toDark
      }
      title={themeUI === "dark" ? t.topbar.theme.light : t.topbar.theme.dark}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
    >
      <Sun className="size-4 block dark:hidden" aria-hidden="true" />
      <Moon
        className="hidden size-4 fill-warning text-warning dark:block"
        aria-hidden="true"
      />
    </button>
  );
}
