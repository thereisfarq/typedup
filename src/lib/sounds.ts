let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

interface GlassNote {
  frequency: number;
  at: number;
  duration: number;
  gain: number;
  detune?: number;
}

function playGlassNotes(notes: GlassNote[]): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.85;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 1200;
  highpass.Q.value = 0.7;

  master.connect(highpass);
  highpass.connect(ctx.destination);

  for (const note of notes) {
    const start = t0 + note.at;
    const end = start + note.duration;

    const partials = [
      { ratio: 1, gain: 1 },
      { ratio: 2.4, gain: 0.22 },
      { ratio: 4.1, gain: 0.08 },
    ];

    for (const partial of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.detune.value = note.detune ?? 0;

      const f0 = note.frequency * partial.ratio;
      osc.frequency.setValueAtTime(f0, start);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.06, start + 0.018);

      const peak = note.gain * partial.gain;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(end + 0.04);
    }
  }
}

/** Thin glass tap for UI hover */
export function playHoverSound(): void {
  playGlassNotes([
    { frequency: 3200, at: 0, duration: 0.05, gain: 0.028 },
  ]);
}

/** Bright ascending glass chime — correct answer */
export function playCorrectSound(): void {
  playGlassNotes([
    { frequency: 2400, at: 0, duration: 0.1, gain: 0.04 },
    { frequency: 3600, at: 0.07, duration: 0.14, gain: 0.05 },
    { frequency: 4800, at: 0.14, duration: 0.18, gain: 0.038 },
  ]);
}

/** Muted descending glass knock — wrong answer */
export function playWrongSound(): void {
  playGlassNotes([
    { frequency: 1800, at: 0, duration: 0.09, gain: 0.045, detune: -8 },
    { frequency: 1100, at: 0.06, duration: 0.12, gain: 0.04, detune: 6 },
  ]);
}
