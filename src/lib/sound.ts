/**
 * Every sound on the site is synthesized with the Web Audio API: no files to
 * download, and nothing can play until the visitor has interacted with the page.
 * Noise is always band-limited (filtered) so nothing sounds harsh or grainy.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let master: GainNode | null = null;
/** Per-pack loudness trim, so every pack sits at about the same level. */
const LEVEL: Record<string, number> = { chimes: 1, birds: 1, cereal: 1.8, clown: 1.7, jungle: 1.3, chiptune: 1.5, tabletop: 1.1 };
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
  /** A pulse wave with this duty cycle (0.125, 0.25, 0.5), like an old game console's square channels. */
  pulse?: number;
};

const pulses = new Map<number, PeriodicWave>();
/**
 * A band-limited pulse wave (24 harmonics), so the retro squares are warm
 * rather than fizzy: f(t) = d + Σ 2/(nπ)·sin(nπd)·cos(nωt).
 */
function pulseWave(c: AudioContext, duty: number) {
  let w = pulses.get(duty);
  if (!w) {
    const n = 24;
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    w = c.createPeriodicWave(real, imag);
    pulses.set(duty, w);
  }
  return w;
}

function tone(freq: number, o: ToneOpts = {}) {
  const c = audio();
  const start = c.currentTime + (o.at ?? 0);
  const attack = o.attack ?? 0.01;
  const decay = o.decay ?? 0.2;
  const osc = c.createOscillator();
  if (o.pulse) osc.setPeriodicWave(pulseWave(c, o.pulse));
  else osc.type = o.type ?? "sine";
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

/** Retro game sounds: pulse-wave channels, stepped arpeggios and a noise channel. */
const NOTE = (semitones: number) => 523.25 * 2 ** (semitones / 12); // from C5
const chiptune = {
  /** A tiny menu blip on a thin pulse. */
  blip() {
    tone(NOTE(pick([12, 14, 16, 19, 21])), { pulse: 0.125, attack: 0.003, decay: 0.06, peak: 0.035 });
  },
  /** A coin: two quick notes, the second ringing. */
  coin() {
    tone(NOTE(11), { pulse: 0.25, attack: 0.002, decay: 0.06, peak: 0.05 });
    tone(NOTE(16), { pulse: 0.25, at: 0.065, attack: 0.002, decay: 0.28, peak: 0.05 });
  },
  /** A jump: a square sliding up. */
  jump() {
    tone(260, { pulse: 0.5, attack: 0.004, decay: 0.16, peak: 0.04, glideTo: 820 });
  },
  /** A power-up: a fast stepped arpeggio climbing two octaves. */
  powerUp() {
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone(NOTE(n - 5), { pulse: 0.25, at: i * 0.032, attack: 0.002, decay: 0.05, peak: 0.04 }));
  },
  /** A short three-step arpeggio, for pops. */
  bloop() {
    [0, 7, 12].forEach((n, i) => tone(NOTE(n + 7), { pulse: 0.5, at: i * 0.028, attack: 0.002, decay: 0.035, peak: 0.035 }));
  },
  /** A bump: the noise channel and a falling square. */
  bump() {
    hiss({ peak: 0.25, decay: 0.07, type: "lowpass", freq: 1800, q: 0.7 });
    tone(220, { pulse: 0.5, attack: 0.002, decay: 0.12, peak: 0.05, glideTo: 80 });
  },
  /** A little victory jingle: a run up, a beat, and a held top note over a bass line. */
  victory() {
    [-5, 0, 4, 7, 12, 16].forEach((n, i) => tone(NOTE(n), { pulse: 0.25, at: i * 0.06, attack: 0.003, decay: 0.07, peak: 0.045 }));
    tone(NOTE(19), { pulse: 0.25, at: 0.4, attack: 0.003, decay: 0.12, peak: 0.05 });
    tone(NOTE(24), { pulse: 0.25, at: 0.54, attack: 0.004, decay: 0.5, peak: 0.05, vibrato: 9, vibratoRate: 6 });
    [[-24, 0], [-17, 0.24], [-12, 0.54]].forEach(([n, at]) => tone(NOTE(n), { type: "triangle", at, attack: 0.004, decay: at > 0.5 ? 0.5 : 0.2, peak: 0.08 }));
  },
};

/**
 * Board game night, all from filtered noise and short resonances: dice, cards,
 * wooden pieces and clay poker chips.
 */
const tabletop = {
  /** A card flicked onto the table: a papery snap with a soft landing. */
  flick(soft = false) {
    hiss({ peak: soft ? 0.12 : 0.28, decay: 0.028, freq: rand(2600, 3200), q: 1.8 });
    hiss({ at: 0.012, peak: soft ? 0.05 : 0.12, decay: 0.03, type: "lowpass", freq: 700, q: 0.8 });
  },
  /** A wooden game piece set down: a hollow knock, twice (clack-clack). */
  clack() {
    for (const [at, k] of [[0, 1], [0.07, 0.6]] as const) {
      const f = rand(980, 1150);
      tone(f, { at, attack: 0.001, decay: 0.055, peak: 0.1 * k });
      tone(f * 1.52, { at, attack: 0.001, decay: 0.03, peak: 0.04 * k });
      hiss({ at, peak: 0.22 * k, decay: 0.025, freq: 1300, q: 7 });
    }
  },
  /** Dice shaken in a hand: bright, irregular clicks. */
  rattle() {
    for (let i = 0; i < 11; i++) hiss({ at: rand(0, 0.34), peak: rand(0.12, 0.26), decay: rand(0.008, 0.016), freq: rand(2600, 3800), q: 4 });
  },
  /** Dice rolled onto the table: a thud, then bounces that slow and soften, then a tumble. */
  roll() {
    hiss({ peak: 0.3, decay: 0.06, type: "lowpass", freq: 900, q: 0.9 });
    tone(150, { attack: 0.002, decay: 0.08, peak: 0.12, glideTo: 90 });
    let at = 0.07;
    for (let i = 0; i < 7; i++) {
      const k = 1 - i / 8;
      hiss({ at, peak: 0.26 * k, decay: 0.02, freq: rand(1700, 2600), q: 6 });
      tone(rand(900, 1300), { at, attack: 0.001, decay: 0.03, peak: 0.035 * k });
      at += 0.055 + i * 0.016;
    }
    for (let i = 0; i < 5; i++) hiss({ at: at + i * 0.03, peak: 0.08 * (1 - i / 5), decay: 0.012, freq: 2200, q: 5 });
  },
  /** A riffle shuffle: a quick flutter of card edges, then the bridge settling them. */
  shuffle() {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      hiss({ at: t * 0.42 + rand(0, 0.008), peak: 0.06 + 0.16 * Math.sin(Math.PI * t), decay: 0.009, freq: rand(3200, 4600), q: 1.4 });
    }
    hiss({ at: 0.46, peak: 0.1, attack: 0.03, decay: 0.16, type: "highpass", freq: 2400, q: 0.6 });
  },
  /** One clay poker chip clicking onto another. */
  chip(at = 0, k = 1) {
    hiss({ at, peak: 0.3 * k, decay: 0.045, freq: rand(3800, 4800), q: 11 });
    tone(rand(5200, 6200), { at, attack: 0.001, decay: 0.04, peak: 0.015 * k });
  },
  /** A stack of chips pushed in: five clicks, a little uneven. */
  chipStack() {
    for (let i = 0; i < 5; i++) tabletop.chip(i * 0.055 + rand(0, 0.015), 1 - i * 0.1);
  },
};

// ----------------------------------------------------------------- dispatcher

export type SoundPack = "chimes" | "cereal" | "clown" | "birds" | "jungle" | "chiptune" | "tabletop";
export type SoundEvent = "hover" | "press" | "pop" | "launch" | "hit" | "secret" | "toggle";

let presses = 0;

/** Play a site event in the chosen pack. Never throws. */
export function play(pack: SoundPack, event: SoundEvent) {
  try {
    level = event === "secret" ? 1 : (LEVEL[pack] ?? 1);
    // These two packs have their own fanfare for a found secret.
    if (event === "secret" && pack === "chiptune") return chiptune.victory();
    if (event === "secret" && pack === "tabletop") {
      level = LEVEL.tabletop ?? 1;
      tabletop.roll();
      for (let i = 0; i < 6; i++) tabletop.chip(0.6 + i * 0.06, 1 - i * 0.08);
      return;
    }
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
      case "chiptune":
        if (event === "hover") chiptune.blip();
        else if (event === "press") chiptune.coin();
        else if (event === "toggle") chiptune.powerUp();
        else if (event === "pop") chiptune.bloop();
        else if (event === "launch") chiptune.jump();
        else if (event === "hit") chiptune.bump();
        break;
      case "tabletop":
        if (event === "hover") tabletop.flick(true);
        else if (event === "press") tabletop.clack();
        else if (event === "toggle") tabletop.shuffle();
        else if (event === "pop") tabletop.chip();
        else if (event === "launch") tabletop.rattle();
        else if (event === "hit") tabletop.roll();
        break;
    }
  } catch {
    // Web Audio unavailable: stay silent.
  }
}

// ----------------------------------------------------------------- fireworks

/**
 * Fireworks for the milestone show (see fireworks.tsx). These play regardless of
 * the chosen pack; the caller checks that sound effects are on. `pan` is -1..1.
 */
export const fireworkSound = {
  /** A rising whistle with a fizz of burning fuse under it. */
  whistle(duration = 1.1) {
    try {
      level = 1;
      const from = rand(700, 1000);
      tone(from, { type: "sine", attack: 0.05, decay: duration, glideTo: from * rand(2.2, 2.8), peak: 0.022, vibrato: 18, vibratoRate: 23 });
      hiss({ attack: 0.05, decay: duration * 0.9, peak: 0.05, freq: 3200, q: 0.8 });
    } catch {
      // Web Audio unavailable: stay silent.
    }
  },
  /** The burst: a soft, deep thump with a crack on top. `size` 0.5..1.5. */
  boom(size = 1) {
    try {
      level = 1;
      tone(rand(60, 80), { type: "sine", attack: 0.004, decay: 0.7 * size, glideTo: 32, peak: 0.22 * size });
      hiss({ peak: 0.32 * size, attack: 0.003, decay: 0.9 * size, type: "lowpass", freq: 420, q: 0.7 });
      hiss({ peak: 0.12, attack: 0.001, decay: 0.05, freq: 2200, q: 1.2 });
    } catch {
      // Web Audio unavailable: stay silent.
    }
  },
  /** Glittering crackle: a scatter of tiny bright pops. */
  crackle(count = 14, spread = 0.7) {
    try {
      level = 1;
      for (let i = 0; i < count; i++) hiss({ at: 0.15 + Math.random() * spread, peak: rand(0.04, 0.09), attack: 0.001, decay: rand(0.01, 0.022), freq: rand(2800, 6000), q: 2 });
    } catch {
      // Web Audio unavailable: stay silent.
    }
  },
};

/** Little creature voices for the hidden extras (caller checks that sound effects are on). */
export const extraSound = {
  /** A chicken's "buk-buk-BAWK". `angry` makes it louder and higher. */
  cluck(angry = false) {
    try {
      level = 1;
      const base = angry ? 620 : 480;
      vowel(base, AAH, { decay: 0.06, peak: 0.05 });
      vowel(base * 1.05, AAH, { at: 0.11, decay: 0.06, peak: 0.05 });
      vowel(base * 1.5, AAH, { at: 0.24, attack: 0.02, decay: angry ? 0.22 : 0.14, glideTo: base * 1.1, peak: angry ? 0.09 : 0.06 });
    } catch {
      // Web Audio unavailable: stay silent.
    }
  },
  /** A clay pot breaking, then gems tinkling. */
  smash(gems = 3) {
    try {
      level = 1;
      hiss({ peak: 0.35, decay: 0.12, freq: 1400, q: 0.9 });
      hiss({ peak: 0.2, decay: 0.2, freq: 600, q: 0.8, at: 0.02 });
      for (let i = 0; i < gems; i++) tone(rand(1800, 2600), { at: 0.25 + i * 0.09, decay: 0.25, peak: 0.03 });
    } catch {
      // Web Audio unavailable: stay silent.
    }
  },
  /** A leafling's tiny two-note piping. */
  pip() {
    try {
      level = 1;
      tone(1760, { decay: 0.09, peak: 0.04, vibrato: 30 });
      tone(2349, { at: 0.12, decay: 0.16, peak: 0.04, vibrato: 30 });
    } catch {
      // Web Audio unavailable: stay silent.
    }
  },
};
