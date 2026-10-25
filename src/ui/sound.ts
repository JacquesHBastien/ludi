// Small synthesized sound effects (Web Audio). No audio files, nothing to download or license.
// Every sound is triggered by a tap, so browsers let the audio context start.

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted || typeof AudioContext === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slideTo?: number;
}

function tone(freq: number, dur: number, { type = 'sine', gain = 0.18, at = 0, slideTo }: ToneOpts = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + at;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, { gain = 0.25, at = 0, freq = 2500 }: { gain?: number; at?: number; freq?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + at;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const amp = a.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  /** Dice rattling out of the hand, bouncing twice on the board and settling, over `seconds`. */
  roll(seconds = 0.5) {
    [0, 0.05, 0.11, 0.16, 0.22].forEach((at, i) => noise(0.05, { at, freq: 1800 + i * 300, gain: 0.3 }));
    // Bounces line up with the FlyingDice path.
    noise(0.07, { at: seconds * 0.46, freq: 1100, gain: 0.55 });
    noise(0.06, { at: seconds * 0.6, freq: 1300, gain: 0.4 });
    [0.8, 0.88, 0.94].forEach((f) => noise(0.04, { at: seconds * f, freq: 2200, gain: 0.25 }));
    noise(0.08, { at: seconds * 0.99, freq: 900, gain: 0.5 });
  },
  /** One shake of the dice in a closed hand; harder shakes rattle louder. */
  shake(power = 1) {
    const gain = 0.12 + 0.22 * Math.min(power, 1.5);
    noise(0.035, { freq: 1700 + Math.random() * 900, gain });
    noise(0.03, { at: 0.045, freq: 2300 + Math.random() * 900, gain: gain * 0.8 });
  },
  /** One hop of a man moving a square. */
  step() {
    tone(720, 0.05, { type: 'triangle', gain: 0.07 });
  },
  /** A cork-pop, then a bright little "ta-da" climbing up: a new man is out. */
  born() {
    noise(0.05, { freq: 1500, gain: 0.6 });
    tone(880, 0.09, { type: 'sine', slideTo: 330, gain: 0.3 });
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.35 : 0.13, { type: 'triangle', at: 0.08 + i * 0.08, gain: 0.26 }));
    tone(2093, 0.25, { type: 'sine', at: 0.4, gain: 0.08 });
  },
  block() {
    tone(196, 0.09, { type: 'square', gain: 0.1 });
    tone(196, 0.12, { type: 'square', at: 0.13, gain: 0.12 });
  },
  /** A hard smack, then a sad "wah-wah" sliding down: sent back to the yard. */
  kill() {
    noise(0.12, { freq: 220, gain: 0.9 });
    noise(0.05, { freq: 3000, gain: 0.35 });
    tone(150, 0.18, { type: 'square', slideTo: 60, gain: 0.22 });
    tone(392, 0.28, { type: 'sawtooth', at: 0.16, slideTo: 370, gain: 0.16 });
    tone(349, 0.55, { type: 'sawtooth', at: 0.46, slideTo: 196, gain: 0.18 });
  },
  heaven() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', at: i * 0.09, gain: 0.16 }));
  },
  win() {
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      tone(f, i === 6 ? 0.6 : 0.16, { type: 'triangle', at: i * 0.13, gain: 0.18 }),
    );
  },
  /** Nothing to move: a soft "aw". */
  noMoves() {
    tone(294, 0.3, { type: 'sine', slideTo: 220, gain: 0.12 });
  },
};
