import type { SoundEvent } from "@/lib/sounds/engine";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const SOUND_STORAGE_KEY = "packet-tools-sounds";

export interface SoundPreferences {
  enabled: boolean;
  volume: number;
  events: Record<SoundEvent, boolean>;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 60,
  events: { agentComplete: true, error: true, create: true, update: true, upload: true },
};

interface SoundState extends SoundPreferences {
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  toggleEvent: (event: SoundEvent) => void;
  setEvent: (event: SoundEvent, enabled: boolean) => void;
  resetDefaults: () => void;
}

const memoryStorage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      ...DEFAULT_SOUND_PREFERENCES,

      setEnabled: (enabled) => set({ enabled }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, Math.round(volume))) }),

      toggleEvent: (event) =>
        set((state) => ({ events: { ...state.events, [event]: !state.events[event] } })),

      setEvent: (event, enabled) =>
        set((state) => ({ events: { ...state.events, [event]: enabled } })),

      resetDefaults: () =>
        set({
          ...DEFAULT_SOUND_PREFERENCES,
          events: { ...DEFAULT_SOUND_PREFERENCES.events },
        }),
    }),
    {
      name: SOUND_STORAGE_KEY,
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
        events: state.events,
      }),
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage,
      ),
    },
  ),
);
