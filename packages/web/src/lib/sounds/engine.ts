export type SoundEvent = "agentComplete" | "error" | "create" | "update" | "upload";

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const lastPlayed: Partial<Record<SoundEvent, number>> = {};
const THROTTLE_MS: Record<SoundEvent, number> = {
  error: 1000,
  agentComplete: 250,
  create: 250,
  update: 250,
  upload: 250,
};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  // `AudioContext` es un `declare var` global, no una propiedad declarada de `Window` en lib.dom.
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = win.AudioContext ?? win.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
      return null;
    }
  }
  return ctx;
}

export function ensureAudioReady(): void {
  const audio = getContext();
  if (audio && audio.state === "suspended") void audio.resume().catch(() => undefined);
}

interface ToneOptions {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  start: number;
  duration: number;
  peak?: number;
  lowpass?: number;
}

function tone(
  audio: AudioContext,
  dest: AudioNode,
  { freq, freqEnd, type = "sine", start, duration, peak = 0.4, lowpass }: ToneOptions,
): void {
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration * 0.85);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  if (lowpass) {
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(dest);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

const RECIPES: Record<SoundEvent, (audio: AudioContext, dest: AudioNode, t0: number) => void> = {
  agentComplete: (audio, dest, t0) => {
    // Arpegio mayor suave C5 -> E5 -> G5 (triangle), decay largo ~650ms total
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) =>
      tone(audio, dest, { freq, type: "triangle", start: t0 + i * 0.13, duration: 0.55, peak: 0.32 }),
    );
  },
  error: (audio, dest, t0) => {
    // Buzz grave 150Hz (square + lowpass 800Hz), 2 pulsos ~380ms
    tone(audio, dest, { freq: 150, type: "square", start: t0, duration: 0.16, peak: 0.22, lowpass: 800 });
    tone(audio, dest, { freq: 150, type: "square", start: t0 + 0.22, duration: 0.16, peak: 0.22, lowpass: 800 });
  },
  create: (audio, dest, t0) => {
    // Blip brillante A5 880Hz + armónico suave
    tone(audio, dest, { freq: 880, type: "sine", start: t0, duration: 0.22, peak: 0.34 });
    tone(audio, dest, { freq: 1760, type: "sine", start: t0, duration: 0.16, peak: 0.1 });
  },
  update: (audio, dest, t0) => {
    // Dos tonos E5 -> A5
    tone(audio, dest, { freq: 659.25, type: "sine", start: t0, duration: 0.18, peak: 0.32 });
    tone(audio, dest, { freq: 880, type: "sine", start: t0 + 0.11, duration: 0.24, peak: 0.32 });
  },
  upload: (audio, dest, t0) => {
    // Barrido ascendente 400 -> 1250Hz y blip de confirmación a 1320Hz
    tone(audio, dest, { freq: 400, freqEnd: 1250, type: "sine", start: t0, duration: 0.45, peak: 0.28 });
    tone(audio, dest, { freq: 1320, type: "triangle", start: t0 + 0.46, duration: 0.22, peak: 0.3 });
  },
};

export function playSoundEvent(event: SoundEvent, opts: { volume: number; force?: boolean }): void {
  const audio = getContext();
  if (!audio || !master) return;
  // El estado no cambia de forma síncrona: se reanuda y se programa igual. Sin gesto previo el
  // navegador descarta las notas en silencio; bloquear aquí perdería el primer sonido tras el gesto.
  if (audio.state === "suspended") void audio.resume().catch(() => undefined);
  const now = Date.now();
  const last = lastPlayed[event];
  if (!opts.force && last !== undefined && now - last < THROTTLE_MS[event]) return;
  lastPlayed[event] = now;
  const volume = Math.max(0, Math.min(100, opts.volume));
  master.gain.setValueAtTime((volume / 100) ** 2 * 0.9, audio.currentTime);
  const t0 = audio.currentTime + 0.01;
  try {
    RECIPES[event](audio, master, t0);
  } catch {
    // El audio nunca debe romper la UI.
  }
}
