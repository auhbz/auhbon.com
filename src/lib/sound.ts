/**
 * Every sound on the site is synthesized with the Web Audio API: no files to
 * download, and nothing can play until the visitor has interacted with the page.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext) {
  if (noise) return noise;
  noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

const VOLUME = 0.6;

function envelope(c: AudioContext, start: number, peak: number, attack: number, decay: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak * VOLUME, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  g.connect(c.destination);
  return g;
}

function tone(freq: number, opts: { type?: OscillatorType; at?: number; peak?: number; attack?: number; decay?: number; glideTo?: number; vibrato?: number } = {}) {
  const c = audio();
  const start = c.currentTime + (opts.at ?? 0);
  const decay = opts.decay ?? 0.2;
  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, start + (opts.attack ?? 0.01) + decay);
  if (opts.vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 11;
    depth.gain.value = opts.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + decay + 0.1);
  }
  osc.connect(envelope(c, start, opts.peak ?? 0.08, opts.attack ?? 0.01, decay));
  osc.start(start);
  osc.stop(start + (opts.attack ?? 0.01) + decay + 0.05);
}

function burstNoise(opts: { at?: number; peak?: number; decay?: number; filter?: BiquadFilterType; freq?: number; q?: number }) {
  const c = audio();
  const start = c.currentTime + (opts.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = opts.filter ?? "highpass";
  f.frequency.value = opts.freq ?? 3000;
  f.Q.value = opts.q ?? 1;
  src.connect(f).connect(envelope(c, start, opts.peak ?? 0.2, 0.002, opts.decay ?? 0.04));
  src.start(start);
  src.stop(start + (opts.decay ?? 0.04) + 0.05);
}

const PENTATONIC = [1047, 1175, 1319, 1568, 1760, 2093, 2349];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export type SoundPack = "chimes" | "cereal" | "clown";
export type SoundEvent = "hover" | "press" | "pop" | "launch" | "hit" | "secret" | "toggle";

/** Play a site event in the chosen pack. Never throws. */
export function play(pack: SoundPack, event: SoundEvent) {
  try {
    if (event === "secret") {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, decay: 0.25, peak: 0.08 }));
      return;
    }
    if (pack === "chimes") {
      if (event === "hover") {
        // Wind chimes: two soft bell partials with a long ring.
        const f = pick(PENTATONIC);
        tone(f, { decay: 1.4, peak: 0.035 });
        tone(f * 2.76, { decay: 0.6, peak: 0.01 });
      } else if (event === "press" || event === "toggle") {
        // Referee-style whistle: bright tone with fast vibrato.
        tone(2300, { type: "sine", attack: 0.02, decay: 0.22, peak: 0.06, vibrato: 90 });
      } else if (event === "pop") tone(1568, { decay: 0.5, peak: 0.05 });
      else if (event === "launch") tone(900, { glideTo: 2600, decay: 0.25, peak: 0.05, vibrato: 40 });
      else if (event === "hit") tone(pick(PENTATONIC) / 2, { decay: 0.9, peak: 0.06 });
    } else if (pack === "cereal") {
      if (event === "hover") {
        // Crackle: a few tiny random ticks.
        for (let i = 0; i < 4; i++) burstNoise({ at: Math.random() * 0.12, peak: 0.08, decay: 0.012, freq: 4000 });
      } else if (event === "press" || event === "toggle") {
        burstNoise({ peak: 0.35, decay: 0.03, freq: 1800 }); // snap
        tone(900, { at: 0.04, glideTo: 260, decay: 0.09, peak: 0.08 }); // pop
      } else if (event === "pop") tone(1200, { glideTo: 300, decay: 0.08, peak: 0.1 });
      else if (event === "launch") burstNoise({ peak: 0.25, decay: 0.12, filter: "bandpass", freq: 1200, q: 2 });
      else if (event === "hit") burstNoise({ peak: 0.3, decay: 0.05, freq: 900 });
    } else if (pack === "clown") {
      if (event === "hover") {
        // Slide whistle, up or down.
        const up = Math.random() < 0.5;
        tone(up ? 500 : 1400, { glideTo: up ? 1400 : 500, attack: 0.02, decay: 0.3, peak: 0.05 });
      } else if (event === "press" || event === "toggle") {
        // Bike-horn honk: two detuned squares through a low-pass.
        tone(370, { type: "square", attack: 0.01, decay: 0.16, peak: 0.035 });
        tone(392, { type: "square", attack: 0.01, decay: 0.16, peak: 0.035 });
      } else if (event === "pop") tone(700, { glideTo: 1800, decay: 0.12, peak: 0.06 });
      else if (event === "launch") tone(300, { glideTo: 2000, attack: 0.02, decay: 0.45, peak: 0.06 });
      else if (event === "hit") {
        tone(330, { type: "square", decay: 0.12, peak: 0.03 });
        tone(247, { type: "square", at: 0.12, decay: 0.2, peak: 0.03 });
      }
    }
  } catch {
    // Web Audio unavailable: stay silent.
  }
}
