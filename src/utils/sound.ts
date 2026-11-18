let audioCtx: AudioContext | null = null;
let isMuted = false;

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
}

function getAudioContext(): AudioContext | null {
  if (isMuted) return null;
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
    audioCtx.resume().catch(() => {});
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
};
