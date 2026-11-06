"use client";

import { useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Bot,
  Pencil,
  Play,
  PlusCircle,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useT";
import { interp } from "@/i18n/interp";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SOUND_PREFERENCES,
  useSoundStore,
} from "@/store/soundStore";
import { playSoundPreview } from "@/lib/sounds/playSound";
import type { SoundEvent } from "@/lib/sounds/engine";

const emptySubscribe = () => () => {};

const SOUND_ROWS = [
  { key: "agentComplete", icon: Bot },
  { key: "error", icon: AlertTriangle },
  { key: "create", icon: PlusCircle },
  { key: "update", icon: Pencil },
  { key: "upload", icon: Upload },
] as const satisfies readonly { key: SoundEvent; icon: LucideIcon }[];

export default function SoundSettingsCard() {
  const t = useT();
  const enabled = useSoundStore((s) => s.enabled);
  const volume = useSoundStore((s) => s.volume);
  const events = useSoundStore((s) => s.events);
  const setEnabled = useSoundStore((s) => s.setEnabled);
  const setVolume = useSoundStore((s) => s.setVolume);
  const toggleEvent = useSoundStore((s) => s.toggleEvent);
  const resetDefaults = useSoundStore((s) => s.resetDefaults);
  // El store se rehidrata desde localStorage en el primer render del cliente: hasta montar se
  // pinta el valor por defecto para que el SSR y la hidratación coincidan.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const currentEnabled = mounted ? enabled : DEFAULT_SOUND_PREFERENCES.enabled;
  const currentVolume = mounted ? volume : DEFAULT_SOUND_PREFERENCES.volume;
  const currentEvents = mounted ? events : DEFAULT_SOUND_PREFERENCES.events;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Volume2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">
            {t.configuration.sounds.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t.configuration.sounds.subtitle}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Switch
            id="sound-master"
            checked={currentEnabled}
            onCheckedChange={setEnabled}
            aria-label={t.configuration.sounds.masterAria}
          />
          <label
            htmlFor="sound-master"
            className="cursor-pointer text-sm font-medium"
          >
            {currentEnabled
              ? t.configuration.sounds.enabled
              : t.configuration.sounds.disabled}
          </label>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-3",
          !currentEnabled && "pointer-events-none opacity-40",
        )}
        aria-hidden={!currentEnabled}
      >
        <VolumeX className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={currentVolume}
          disabled={!currentEnabled}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label={t.configuration.sounds.volume}
          className="h-2 w-full cursor-pointer accent-primary"
        />
        <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
          {currentVolume}%
        </span>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {SOUND_ROWS.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <Icon
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {t.configuration.sounds.events[key].label}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {t.configuration.sounds.events[key].description}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => playSoundPreview(key)}
              aria-label={interp(t.configuration.sounds.previewAria, {
                event: t.configuration.sounds.events[key].label,
              })}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {t.configuration.sounds.preview}
              </span>
            </Button>
            <Switch
              checked={currentEvents[key]}
              disabled={!currentEnabled}
              onCheckedChange={() => toggleEvent(key)}
              aria-label={t.configuration.sounds.events[key].label}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {t.configuration.sounds.footnote}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={resetDefaults}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t.configuration.sounds.reset}
        </Button>
      </div>
    </section>
  );
}
