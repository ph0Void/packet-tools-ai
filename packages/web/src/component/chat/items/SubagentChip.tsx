"use client";

import { useState } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import type { SubagentEvent } from "@/hooks/useCiscoChat";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

const LABELS: Record<string, string> = {
  packet_tracer_specialist: "Packet Tracer",
  gns3_specialist: "GNS3",
  ssh_specialist: "SSH",
  telnet_specialist: "Telnet",
};

export function etiquetaSubagente(
  name: string,
  t: ReturnType<typeof useT>,
): string {
  if (LABELS[name]) return LABELS[name];
  if (name === "serial_specialist") return t.chat.subagent.labels.serial;
  if (name === "knowledge_specialist") return t.chat.subagent.labels.knowledge;
  if (name === "system_admin_specialist") return t.chat.subagent.labels.admin;
  if (name === "general-purpose") return t.chat.subagent.labels.general;
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SubagentChip({
  subagents,
  className,
}: {
  subagents: SubagentEvent[];
  className?: string;
}) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const t = useT();
  if (subagents.length === 0) return null;

  return (
    <div className={cn("flex w-full max-w-2xl flex-col", className)}>
      {subagents.map((sub) => {
        const enCurso = !sub.summary;
        const abierto = expandido === sub.name;
        return (
          <div
            key={sub.name}
            className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 py-[5px]"
          >
            <span
              className="absolute top-0 bottom-0 left-[10.5px] w-px bg-border"
              aria-hidden="true"
            />
            <span className="relative z-[1] grid h-[22px] w-[22px] place-items-center">
              <i
                className={cn(
                  "grid h-[15px] w-[15px] place-items-center rounded-full border bg-card",
                  enCurso
                    ? "border-primary/40 text-primary"
                    : "border-success/40 bg-success/10 text-success",
                )}
              >
                {enCurso ? (
                  <LoaderCircle className="size-[9px] animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-[9px]" aria-hidden="true" />
                )}
              </i>
            </span>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setExpandido(abierto ? null : sub.name)}
                className="flex min-h-[22px] w-full min-w-0 cursor-pointer items-center gap-2 text-left"
                aria-expanded={abierto}
              >
                <span className="text-[12.5px] font-medium tracking-[-0.002em] text-foreground">
                  {t.chat.subagent.delegation}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                  {sub.name} · {t.chat.subagent.isolated}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200",
                    abierto && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              {abierto && (
                <p className="pt-1 pb-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {enCurso ? `${t.chat.subagent.delegating} ` : ""}
                    {etiquetaSubagente(sub.name, t)}
                    {enCurso ? "… " : ": "}
                  </span>
                  {sub.summary ?? sub.task ?? t.chat.subagent.noDetail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SubagentChip;
