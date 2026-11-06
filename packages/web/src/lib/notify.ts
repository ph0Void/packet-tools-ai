import { toast } from "sonner";
import { playSound } from "@/lib/sounds/playSound";

/**
 * Sustituto de toast.error con sonido: respeta maestro on/off, volumen y
 * el toggle de sonido de error del usuario (throttle global de 1s en el motor).
 */
export function notifyError(
  message: Parameters<typeof toast.error>[0],
  options?: Parameters<typeof toast.error>[1],
) {
  playSound("error");
  return toast.error(message, options);
}
