/**
 * Every sound on the site is synthesized with the Web Audio API: no files to
 * download, and nothing can play until the visitor has interacted with the page.
 * Noise is always band-limited (filtered) so nothing sounds harsh or grainy.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let master: GainNode | null = null;
/** Per-pack loudness trim, so every pack sits at about the same level. */
const LEVEL: Record<string, number> = { chimes: 1, birds: 1, cereal: 1.8, clown: 1.7, jungle: 1.3 };
let level = 1;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    // A gentle master low-pass and level so no pack can get piercing.
    master = ctx.createGain();
    master.gain.value = 0.6;
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 9000;
    master.connect(soften).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function out() {
  audio();
  return master!;
}

function noiseBuffer(c: AudioContext) {
  if (noise) return noise;
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(c: AudioContext, start: number, peak: number, attack: number, decay: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.min(0.9, peak * level), start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  g.connect(out());
  return g;
}

type ToneOpts = {
  type?: OscillatorType;
  at?: number;
  peak?: number;
  attack?: number;
  decay?: number;
  glideTo?: number;
  vibrato?: number;
  vibratoRate?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
};

function tone(freq: number, o: ToneOpts = {}) {
  const c = audio();
  const start = c.currentTime + (o.at ?? 0);
  const attack = o.attack ?? 0.01;
  const decay = o.decay ?? 0.2;
  const osc = c.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, start + attack + decay);
  if (o.vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = o.vibratoRate ?? 11;
    depth.gain.value = o.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + attack + decay + 0.1);
  }
  const env = envelope(c, start, o.peak ?? 0.08, attack, decay);
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = o.filter.type;
    f.frequency.value = o.filter.freq;
    f.Q.value = o.filter.q ?? 1;
    osc.connect(f).connect(env);
  } else osc.connect(env);
  osc.start(start);
  osc.stop(start + attack + decay + 0.05);
}

function hiss(o: { at?: number; peak?: number; attack?: number; decay?: number; type?: BiquadFilterType; freq?: number; q?: number }) {
  const c = audio();
  const start = c.currentTime + (o.at ?? 0);
  const decay = o.decay ?? 0.04;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.value = o.freq ?? 1500;
  f.Q.value = o.q ?? 1;
  src.connect(f).connect(envelope(c, start, o.peak ?? 0.2, o.attack ?? 0.002, decay));
  src.start(start, Math.random() * 0.5);
  src.stop(start + decay + 0.05);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * A voiced sound: a buzzy source through parallel formant filters, which is how
 * vowels are shaped. Used for monkey "ooh"s and "aah"s and the elephant.
 */
function vowel(f0: number, formants: [number, number][], o: { at?: number; peak?: number; attack?: number; decay?: number; glideTo?: number; vibrato?: number; vibratoRate?: number } = {}) {
  const c = audio();
  const start = c.currentTime + (o.at ?? 0);
  const attack = o.attack ?? 0.03;
  const decay = o.decay ?? 0.2;
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(f0, start);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, start + attack + decay);
  if (o.vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = o.vibratoRate ?? 8;
    depth.gain.value = o.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + attack + decay + 0.1);
  }
  const env = envelope(c, start, o.peak ?? 0.08, attack, decay);
  for (const [freq, q] of formants) {
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    osc.connect(f).connect(env);
  }
  osc.start(start);
  osc.stop(start + attack + decay + 0.05);
}
const OOH: [number, number][] = [[320, 6], [800, 7]];
const AAH: [number, number][] = [[760, 5], [1150, 6], [2500, 8]];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// ----------------------------------------------------------------- sound kits

const PENTATONIC = [1047, 1175, 1319, 1568, 1760, 2093, 2349];

const chimes = {
  windChime() {
    const f = pick(PENTATONIC);
    tone(f, { decay: 1.4, peak: 0.035 });
    tone(f * 2.76, { decay: 0.6, peak: 0.01 });
  },
  whistle() {
    tone(2300, { attack: 0.02, decay: 0.22, peak: 0.06, vibrato: 90 });
  },
  bell() {
    const f = pick(PENTATONIC) / 2;
    tone(f, { decay: 1, peak: 0.06 });
    tone(f * 2.4, { decay: 0.5, peak: 0.015 });
  },
};

const cereal = {
  /** A finger snap: a tight, resonant click with a soft body. */
  snap() {
    hiss({ peak: 0.5, decay: 0.045, freq: 2300, q: 3.5 });
    hiss({ peak: 0.15, decay: 0.07, freq: 900, q: 1.2, at: 0.002 });
  },
  /** Bubble wrap: a short, round pop. */
  pop() {
    const f = rand(700, 1100);
    hiss({ peak: 0.35, decay: 0.022, freq: f, q: 1.6 });
    tone(rand(260, 340), { glideTo: 110, decay: 0.05, peak: 0.12 });
  },
  /** A cereal crunch: a cluster of soft, low grains. */
  crunch(soft = false) {
    const grains = soft ? 4 : 7;
    for (let i = 0; i < grains; i++) {
      hiss({ at: rand(0, soft ? 0.08 : 0.14), peak: rand(0.06, soft ? 0.12 : 0.22), decay: rand(0.018, 0.04), freq: rand(500, 1400), q: 0.9 });
    }
  },
};

const clown = {
  /** A bulb horn: buzzy reed through a nasal formant, with a little pitch sag. */
  honk() {
    for (const [f, at] of [[420, 0], [426, 0]] as const) {
      tone(f, { type: "sawtooth", at, attack: 0.012, decay: 0.24, peak: 0.07, glideTo: f * 0.9, filter: { type: "bandpass", freq: 1150, q: 3 } });
    }
    tone(210, { type: "square", attack: 0.012, decay: 0.2, peak: 0.02, glideTo: 190, filter: { type: "lowpass", freq: 900 } });
  },
  /** Two quick squeezes of the horn, the second higher. (Lab option B) */
  honkHonk() {
    const one = (at: number, f: number) => {
      for (const d of [0, 6]) tone(f + d, { type: "sawtooth", at, attack: 0.012, decay: 0.24, peak: 0.07, glideTo: (f + d) * 0.9, filter: { type: "bandpass", freq: 1150, q: 3 } });
      tone(f / 2, { type: "square", at, attack: 0.012, decay: 0.2, peak: 0.02, glideTo: f / 2.2, filter: { type: "lowpass", freq: 900 } });
    };
    one(0, 400);
    one(0.14, 470);
  },
  /** Ba-dum-tss. (Lab option D) */
  rimshot() {
    for (const [at, f] of [[0, 190], [0.14, 150]] as const) {
      tone(f, { at, glideTo: f * 0.6, attack: 0.003, decay: 0.12, peak: 0.12 });
      hiss({ at, peak: 0.12, decay: 0.05, freq: 1800, q: 0.8 });
    }
    hiss({ at: 0.3, peak: 0.1, decay: 0.55, type: "highpass", freq: 5500, q: 0.5 });
  },
  /** A soft, wet pie to the face, with a drip. (Lab option G) */
  pieSplat() {
    hiss({ peak: 0.4, attack: 0.002, decay: 0.12, type: "lowpass", freq: 700, q: 1.2 });
    tone(140, { glideTo: 60, attack: 0.003, decay: 0.12, peak: 0.12 });
    tone(900, { at: 0.2, glideTo: 1500, attack: 0.004, decay: 0.05, peak: 0.03 });
  },
  /** A short round of applause. */
  applause() {
    const claps = 34;
    for (let i = 0; i < claps; i++) {
      const t = Math.pow(Math.random(), 1.6) * 1.3;
      hiss({ at: 0.25 + t, peak: rand(0.05, 0.12) * (1 - t / 1.6), decay: rand(0.01, 0.02), freq: rand(1200, 2400), q: 1.2 });
    }
  },
  slideWhistle() {
    const up = Math.random() < 0.5;
    tone(up ? 600 : 1700, { glideTo: up ? 1700 : 600, attack: 0.03, decay: 0.32, peak: 0.045, vibrato: 12, vibratoRate: 6 });
  },
  kazoo() {
    tone(rand(280, 340), { type: "sawtooth", attack: 0.02, decay: 0.22, peak: 0.04, vibrato: 25, vibratoRate: 16, filter: { type: "bandpass", freq: 900, q: 2.5 } });
  },
  boing() {
    tone(160, { glideTo: 520, attack: 0.005, decay: 0.3, peak: 0.06, vibrato: 30, vibratoRate: 14 });
  },
  /** A whoopee cushion: rare, on purpose. */
  toot() {
    tone(rand(85, 110), { type: "sawtooth", attack: 0.02, decay: 0.38, peak: 0.08, vibrato: 14, vibratoRate: 22, glideTo: 70, filter: { type: "lowpass", freq: 480, q: 4 } });
    hiss({ peak: 0.05, attack: 0.02, decay: 0.3, type: "lowpass", freq: 420 });
  },
};

const birds = {
  /** Two or three quick chirps. */
  chirp() {
    const n = 2 + Math.floor(Math.random() * 2);
    const base = rand(3000, 3800);
    for (let i = 0; i < n; i++) tone(base, { at: i * 0.07, attack: 0.004, decay: 0.045, peak: 0.035, glideTo: base * 1.45 });
  },
  /** A two-note whistled call, like the whistle that inspired this pack. */
  call() {
    tone(2400, { attack: 0.015, decay: 0.16, peak: 0.05, glideTo: 3300, vibrato: 40, vibratoRate: 18 });
    tone(3100, { at: 0.2, attack: 0.015, decay: 0.22, peak: 0.045, glideTo: 2100, vibrato: 40, vibratoRate: 18 });
  },
  trill() {
    for (let i = 0; i < 6; i++) tone(rand(2800, 3600), { at: i * 0.045, attack: 0.003, decay: 0.03, peak: 0.03 });
  },
};

const jungle = {
  /** A monkey: two rising "ooh"s, then two higher "aah"s. */
  monkey() {
    const base = rand(380, 460);
    vowel(base, OOH, { attack: 0.03, decay: 0.14, peak: 0.12, glideTo: base * 1.35 });
    vowel(base * 1.05, OOH, { at: 0.17, attack: 0.03, decay: 0.14, peak: 0.12, glideTo: base * 1.45 });
    vowel(base * 1.6, AAH, { at: 0.36, attack: 0.02, decay: 0.16, peak: 0.1, glideTo: base * 1.9 });
    vowel(base * 1.7, AAH, { at: 0.55, attack: 0.02, decay: 0.2, peak: 0.1, glideTo: base * 1.3 });
  },
  /** A single curious "ooh?" (rising), for hovering. */
  ooh() {
    const base = rand(400, 520);
    vowel(base, OOH, { attack: 0.03, decay: 0.16, peak: 0.08, glideTo: base * 1.4 });
  },
  /** The elephant: a brassy, rough trumpet that swells and bends. */
  trumpet() {
    const f = rand(480, 560);
    vowel(f, [[900, 3], [1700, 4], [2600, 6]], { attack: 0.08, decay: 0.6, peak: 0.1, glideTo: f * 1.25, vibrato: 30, vibratoRate: 27 });
    hiss({ attack: 0.08, decay: 0.55, peak: 0.05, freq: 2200, q: 1.5 });
  },
  /** A tropical bird: a liquid two-tone whistle. */
  toucan() {
    const f = rand(1300, 1700);
    tone(f, { attack: 0.01, decay: 0.09, peak: 0.05, glideTo: f * 1.6 });
    tone(f * 1.5, { at: 0.11, attack: 0.01, decay: 0.14, peak: 0.045, glideTo: f * 0.9, vibrato: 30, vibratoRate: 20 });
  },
  /** A frog's ribbit: two quick, croaky pulses. */
  ribbit() {
    for (const at of [0, 0.09]) {
      tone(rand(110, 140), { type: "square", at, attack: 0.005, decay: 0.06, peak: 0.07, vibrato: 40, vibratoRate: 70, filter: { type: "bandpass", freq: 600, q: 3 } });
    }
  },
  /** Insects in the canopy: a short, rhythmic chirr. */
  cricket() {
    for (let i = 0; i < 4; i++) tone(4300, { at: i * 0.035, attack: 0.002, decay: 0.022, peak: 0.02 });
  },
  /** A parrot's squawk. */
  squawk() {
    vowel(rand(700, 850), AAH, { attack: 0.01, decay: 0.2, peak: 0.08, glideTo: 520, vibrato: 90, vibratoRate: 45 });
  },
  /** Hand drums: two bongo hits. */
  bongo() {
    tone(330, { attack: 0.002, decay: 0.12, peak: 0.12, glideTo: 260 });
    tone(220, { at: 0.11, attack: 0.002, decay: 0.16, peak: 0.12, glideTo: 170 });
  },
};

// ----------------------------------------------------------------- dispatcher

export type SoundPack = "chimes" | "cereal" | "clown" | "birds" | "jungle";
export type SoundEvent = "hover" | "press" | "pop" | "launch" | "hit" | "secret" | "toggle";

let presses = 0;

/** Play a site event in the chosen pack. Never throws. */
export function play(pack: SoundPack, event: SoundEvent) {
  try {
    level = event === "secret" ? 1 : (LEVEL[pack] ?? 1);
    if (event === "secret") {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, decay: 0.25, peak: 0.07 }));
      return;
    }
    switch (pack) {
      case "chimes":
        if (event === "hover") chimes.windChime();
        else if (event === "press" || event === "toggle") chimes.whistle();
        else if (event === "pop") tone(1568, { decay: 0.5, peak: 0.05 });
        else if (event === "launch") tone(900, { glideTo: 2600, decay: 0.25, peak: 0.05, vibrato: 40 });
        else if (event === "hit") chimes.bell();
        break;
      case "cereal":
        if (event === "hover") cereal.crunch(true);
        else if (event === "press") cereal.snap();
        else if (event === "toggle" || event === "pop") cereal.pop();
        else if (event === "launch") cereal.snap();
        else if (event === "hit") cereal.crunch();
        break;
      case "clown":
        if (event === "hover") {
          const r = Math.random();
          if (r < 0.08) clown.toot();
          else if (r < 0.45) clown.slideWhistle();
          else if (r < 0.75) clown.kazoo();
          else clown.boing();
        } else if (event === "press" || event === "toggle") {
          // Presses rotate through the three picks from the Clown Click Lab.
          if (event === "toggle") clown.honkHonk();
          else pick([clown.pieSplat, clown.rimshot, clown.honkHonk])();
          // Every so often, the crowd goes wild.
          if (event === "press" && ++presses % 5 === 0) clown.applause();
        } else if (event === "pop") clown.boing();
        else if (event === "launch") clown.slideWhistle();
        else if (event === "hit") clown.honk();
        break;
      case "jungle":
        if (event === "hover") {
          const r = Math.random();
          if (r < 0.3) jungle.toucan();
          else if (r < 0.55) jungle.ooh();
          else if (r < 0.8) jungle.ribbit();
          else jungle.cricket();
        } else if (event === "press") jungle.monkey();
        else if (event === "toggle") jungle.bongo();
        else if (event === "pop") jungle.ribbit();
        else if (event === "launch") jungle.squawk();
        else if (event === "hit") jungle.trumpet();
        break;
      case "birds":
        if (event === "hover") birds.chirp();
        else if (event === "press" || event === "toggle") birds.call();
        else if (event === "pop") birds.chirp();
        else if (event === "launch") birds.trill();
        else if (event === "hit") birds.call();
        break;
    }
  } catch {
    // Web Audio unavailable: stay silent.
  }
}
