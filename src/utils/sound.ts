let audioCtx: AudioContext | null = null;
let isMuted = false;

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
}

function getAudioContext(): AudioContext | null {
  if (isMuted || typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume?.().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue = 0.12,
  delay = 0,
  endFreq?: number
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + delay;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    }

    gain.gain.setValueAtTime(gainValue, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  } catch {
    // Ignore audio scheduling errors on restricted browsers
  }
}

export const sfx = {
  pop: (): void => playTone(520, 0.08, 'sine', 0.14, 0, 260),
  tick: (): void => playTone(980, 0.05, 'square', 0.05),
  whoosh: (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const length = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.2);
      gain.gain.value = 0.16;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
    } catch {
      // Ignore audio errors
    }
  },
  alert: (): void => {
    playTone(660, 0.18, 'triangle', 0.15);
    playTone(880, 0.3, 'triangle', 0.15, 0.2);
  },
  fanfare: (): void => {
    [523, 659, 784, 1047, 784, 1047].forEach((freq, idx) =>
      playTone(freq, 0.28, 'sawtooth', 0.08, idx * 0.14)
    );
  },

  /**
   * Coach / referee pea whistle: dual high oscillators with an LFO trill and breath transient.
   */
  whistle: (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const duration = 0.32;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const masterGain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(2200, now);
      osc1.frequency.exponentialRampToValueAtTime(2820, now + 0.045);

      osc2.frequency.setValueAtTime(2350, now);
      osc2.frequency.exponentialRampToValueAtTime(2980, now + 0.045);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(38, now);
      lfoGain.gain.setValueAtTime(110, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
      masterGain.gain.setValueAtTime(0.11, now + duration - 0.07);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(masterGain);
      osc2.connect(masterGain);
      masterGain.connect(ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + duration + 0.02);
      osc1.stop(now + duration + 0.02);
      osc2.stop(now + duration + 0.02);
    } catch {
      // Fallback single tone if complex node graph fails
      playTone(2800, 0.28, 'sine', 0.1);
    }
  },

  /**
   * Boxing / round gym bell: bright inharmonic metallic partials with resonant decay.
   */
  bell: (strikes = 1): void => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const count = Math.max(1, Math.min(3, strikes));
      const baseFreq = 880;
      const partials: [number, number, number][] = [
        [1.0, 0.14, 0.78],
        [2.02, 0.09, 0.56],
        [2.76, 0.06, 0.42],
        [3.42, 0.04, 0.3],
        [4.18, 0.025, 0.2],
      ];

      for (let s = 0; s < count; s++) {
        const strikeTime = ctx.currentTime + s * 0.24;
        for (const [ratio, amp, decay] of partials) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * ratio, strikeTime);

          gain.gain.setValueAtTime(amp, strikeTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + decay);

          osc.connect(gain).connect(ctx.destination);
          osc.start(strikeTime);
          osc.stop(strikeTime + decay + 0.02);
        }
      }
    } catch {
      playTone(880, 0.45, 'triangle', 0.15);
    }
  },

  /**
   * Arena / shot-clock gym buzzer: low detuned sawtooth pair routed through a warm low-pass filter.
   */
  buzzer: (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const duration = 0.28;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(145, now);
      osc2.frequency.setValueAtTime(152, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(760, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.015);
      gain.gain.setValueAtTime(0.13, now + duration - 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.02);
      osc2.stop(now + duration + 0.02);
    } catch {
      playTone(150, 0.26, 'sawtooth', 0.12);
    }
  },
};
