import { ensureAudioReady, playSoundEvent, type SoundEvent } from "./engine";
import { useSoundStore } from "@/store/soundStore";

/** Suena solo si el usuario tiene activados los sonidos, el maestro y ese evento. Uso fuera de React (ChatContext, ApiClient). */
export function playSound(event: SoundEvent): void {
  if (typeof window === "undefined") return;
  const s = useSoundStore.getState();
  if (!s.enabled || s.volume <= 0 || !s.events[event]) return;
  playSoundEvent(event, { volume: s.volume });
}

/** Vista previa desde la UI de ajustes: suena siempre (aunque el maestro esté off o volumen 0), para preescucha; con volumen 0 usa 60. */
export function playSoundPreview(event: SoundEvent): void {
  if (typeof window === "undefined") return;
  const s = useSoundStore.getState();
  playSoundEvent(event, { volume: s.volume > 0 ? s.volume : 60, force: true });
}

export { ensureAudioReady };
export type { SoundEvent };
