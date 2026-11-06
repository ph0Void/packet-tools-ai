"use client";

import { Check, Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, useT } from "@/hooks/useT";
import type { Locale } from "@/i18n/types";

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export default function LocaleToggle() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.common.changeLanguage}
          title={t.common.changeLanguage}
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
        >
          <Languages className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase">{locale}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setLocale(option.value)}
          >
            <span className="flex-1">{option.label}</span>
            {locale === option.value && (
              <Check className="size-4" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
