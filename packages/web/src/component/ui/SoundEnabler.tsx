"use client";

import { useEffect } from "react";
import { ensureAudioReady } from "@/lib/sounds/playSound";

/**
 * Desbloquea el AudioContext en el primer gesto del usuario (política de
 * autoplay de los navegadores). Sin UI: devuelve null.
 */
export default function SoundEnabler() {
  useEffect(() => {
    const unlock = () => ensureAudioReady();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
