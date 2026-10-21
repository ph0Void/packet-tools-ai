"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ListChecks,
  Sparkles,
} from "lucide-react";
import type { OpcionesPlan, OpcionPlan } from "@/hooks/useCiscoChat";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de opciones del modo planificación (@plan).
 *
 * Como opencode: el usuario elige una opción clicando (la elección viaja como un mensaje
 * normal del chat) o escribe su propia respuesta. No POSTea un endpoint — a diferencia de
 * las tarjetas HITL, que sí lo hacen.
 *
 * Las opciones ya respondidas se detectan DERIVADO del array de mensajes (marker
 * `[plan:<id>]`), sin estado nuevo: por eso el componente recibe `respondidas` como prop
 * en vez de mirar el contexto (regla de las tarjetas: nunca `useChatContext()`).
 */

const ETIQUETA_RIESGO: Record<OpcionPlan["risk"], string> = {
  safe: "Sin cambios",
  config: "Cambia configuración",
  danger: "Impacto de servicio",
};

const CLASE_RIESGO: Record<OpcionPlan["risk"], string> = {
  safe: "text-success",
  config: "text-warning",
  danger: "text-destructive",
};

interface PlanOpcionesProps {
  opciones: OpcionesPlan;
  respondidas?: Set<string>;
  disabled?: boolean;
  onElegir: (opcionId: string, titulo: string) => void;
  onEscribirPropia: (opcionId: string, texto: string) => void;
  className?: string;
}

export function PlanOpciones({
  opciones,
  respondidas,
  disabled = false,
  onElegir,
  onEscribirPropia,
  className,
}: PlanOpcionesProps) {
  const [abierto, setAbierto] = useState(true);
  const [escribiendoId, setEscribiendoId] = useState<string | null>(null);
  const [textoPropio, setTextoPropio] = useState("");

  if (opciones.options.length === 0) return null;

  // Una tarjeta ya respondida bloquea todas: la elección ya viajó como mensaje.
  const bloqueado = disabled || (respondidas?.size ?? 0) > 0;

  return (
    <div
      className={cn(
        "w-full max-w-2xl overflow-hidden rounded-[10px] border border-border bg-card",
        bloqueado && "opacity-70",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-[7px] text-left"
        aria-expanded={abierto}
      >
        <ListChecks className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.105em] text-muted-foreground">
          Opciones del plan
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
          {opciones.planTitle}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            abierto && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        <div className="border-t border-border px-0 pb-3">
          {opciones.planSummary && (
            <p className="px-4 pt-2 text-[12px] leading-relaxed text-muted-foreground">
              {opciones.planSummary}
            </p>
          )}

          <ul className="space-y-2 px-4 pt-2">
            {opciones.options.map((opcion) => {
              const recomendada = opcion.id === opciones.recommendedId;
              const elegida = respondidas?.has(opcion.id) ?? false;

              return (
                <li key={opcion.id}>
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => onElegir(opcion.id, opcion.title)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      recomendada
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/60 bg-muted/20",
                      elegida && "opacity-60",
                      !bloqueado && "cursor-pointer hover:border-primary/40",
                      bloqueado && !elegida && "opacity-50",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {recomendada && (
                        <Sparkles
                          className="size-3 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-[13px] font-medium">{opcion.title}</span>
                      {recomendada && (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-px font-mono text-[9.5px] font-semibold uppercase tracking-wide text-primary">
                          Recomendada
                        </span>
                      )}
                      {elegida && (
                        <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                      )}
                      <span
                        className={cn(
                          "ml-auto font-mono text-[9.5px] uppercase tracking-wide",
                          CLASE_RIESGO[opcion.risk],
                        )}
                      >
                        {ETIQUETA_RIESGO[opcion.risk]}
                      </span>
                    </div>

                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      {opcion.description}
                    </p>

                    {opcion.tradeoff && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                        {opcion.tradeoff}
                      </p>
                    )}

                    {opcion.commands && opcion.commands.length > 0 && (
                      <div className="mt-2 rounded-md border border-border/40 bg-background/60 p-2">
                        <p className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                          Comandos que se ejecutarían
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {opcion.commands.map((comando, i) => (
                            <li
                              key={`${opcion.id}-cmd-${i}`}
                              className="font-mono text-[11px] text-foreground"
                            >
                              {comando}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </button>

                  {escribiendoId === opcion.id && !bloqueado && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={textoPropio}
                        onChange={(e) => setTextoPropio(e.target.value)}
                        placeholder="Ajusta la opción o escribe tu propia respuesta…"
                        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && textoPropio.trim()) {
                            onEscribirPropia(opcion.id, textoPropio.trim());
                            setTextoPropio("");
                            setEscribiendoId(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!textoPropio.trim()}
                        onClick={() => {
                          onEscribirPropia(opcion.id, textoPropio.trim());
                          setTextoPropio("");
                          setEscribiendoId(null);
                        }}
                        className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary disabled:opacity-40"
                      >
                        Enviar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEscribiendoId(null);
                          setTextoPropio("");
                        }}
                        className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {!bloqueado && escribiendoId !== opcion.id && (
                    <button
                      type="button"
                      onClick={() => setEscribiendoId(opcion.id)}
                      className="mt-1 cursor-pointer px-1 text-[10.5px] text-muted-foreground/70 hover:text-foreground"
                    >
                      o escribe tu propia respuesta
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {bloqueado && (
            <p className="px-4 pt-2 text-[11px] text-muted-foreground/70">
              Opciones cerradas: ya respondiste a esta tarjeta.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default PlanOpciones;
