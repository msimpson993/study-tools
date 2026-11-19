/** Earbud sound examples for the map pop-ups (opt-in core audio module). All generated here from the earbud model in ex.ts. No car sounds. */
import { rangeFrame, graphAxes, curve, tline, text, col, linspace } from '@study/core';
import type { AudioRegistry } from '@study/core/audio';
import { bilinearLowpass2, biquadRun, biquadMag, logSweep, logSweepFreq, chirp, foldFreq } from '@study/core/audio-dsp';
import { spk, hImp, Hf, cabs, UM_PER_V, XMAX_UM, TAU } from './ex';

type G = CanvasRenderingContext2D;
const fr = (g: G, w: number, h: number, xr: [number, number], yr: [number, number], xl: string, yl: string, L = 34) => {
  g.clearRect(0, 0, w, h); const f = rangeFrame(w, h, xr, yr, L, 6, 18, 24); graphAxes(g, f, xr, yr, xl, yl); return f;
};
/** The earbud's H(s) = a₀/(s² + a₁s + a₀) as a digital biquad (bilinear, prewarped at the natural frequency), damping scaled by `damp`. */
export function earbudBiquad(fs: number, damp = 1) { const p = spk(damp); return bilinearLowpass2(p.a0 * 1e6, p.a1 * 1e3, fs); }
/** 440 Hz through the earbud's illustrative soft excursion limit x = Xmax·tanh(x_lin/Xmax), drive in volts. */
export function clipped440(fs: number, volts: number, T = 1.5) {
  const xl = volts * UM_PER_V * cabs(Hf(440)), n = Math.round(fs * T), y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = XMAX_UM * Math.tanh((xl * Math.sin((TAU * 440 * i) / fs)) / XMAX_UM);
  return y;
}
/** level of harmonic k relative to the fundamental, dB, of one period of the clipped tone */
export function harmonicDb(volts: number, k: number) {
  const xl = volts * UM_PER_V * cabs(Hf(440)), N = 4096; let a1 = 0, ak = 0;
  for (let i = 0; i < N; i++) { const th = (TAU * i) / N, y = XMAX_UM * Math.tanh((xl * Math.sin(th)) / XMAX_UM); a1 += y * Math.sin(th); ak += y * Math.sin(k * th); }
  return 20 * Math.log10(Math.max(1e-9, Math.abs(ak)) / Math.abs(a1));
}
/** clicks every `gap` s, each convolved with the earbud's h(t) (a click is an impulse, so each copy is h itself) */
export function pings(fs: number, damp: number, count: number, gap: number) {
  const n = Math.round(fs * gap * count), y = new Float32Array(n), L = Math.round(fs * gap);
  for (let c = 0; c < count; c++) for (let i = 0; i < L; i++) y[c * L + i] = hImp((i / fs) * 1000, damp);
  return y;
}
export const SWEEP = { f1: 100, f2: 5000, T: 6 };
export const ALIAS = { fs: 8000, f1: 200, f2: 7800, T: 6 };
const aliasTrue = (t: number) => ALIAS.f1 + ((ALIAS.f2 - ALIAS.f1) * Math.min(1, t / ALIAS.T));
export function squarePartial(fs: number, N: number, f0 = 200, T = 2) {
  const n = Math.round(fs * T), y = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 1; k <= N; k++) { const m = 2 * k - 1; s += Math.sin((TAU * m * f0 * i) / fs) / m; } y[i] = (4 / Math.PI) * s; }
  return y;
}
const dB = (x: number) => 20 * Math.log10(Math.max(1e-9, x));

export const sounds: AudioRegistry = {
  'snd-clip': {
    label: 'Play 440 Hz into the earbud', note: 'Turn the drive up: the cone runs into its (illustrative ±100 µm) soft limit, the wave flattens and harmonics at 1320 Hz, 2200 Hz… appear. Loudness is held fixed so you hear only the change in tone.',
    controls: [{ key: 'v', label: 'drive', min: 0.1, max: 6, step: 0.1, value: 0.2, fmt: (v) => `${v.toFixed(1)} V` }],
    render: (fs, v) => clipped440(fs, v.v),
    view: { aspect: 2.4, alt: 'One and a half cycles of the 440 Hz cone motion: clean (dashed) and through the soft limit (solid), with the third harmonic level.',
      draw(g, w, h, v) { const ts = linspace(0, 3.4, 241), xl = v.v * UM_PER_V * cabs(Hf(440)), m = Math.max(XMAX_UM, xl) * 1.1, f = fr(g, w, h, [0, 3.4], [-m, m], 't (ms)', 'µm');
        tline(g, f, [0, XMAX_UM], [3.4, XMAX_UM], col.muted(), 1, [2, 3]); tline(g, f, [0, -XMAX_UM], [3.4, -XMAX_UM], col.muted(), 1, [2, 3]);
        curve(g, f, ts, ts.map((t) => xl * Math.sin(TAU * 0.44 * t)), col.muted(), 1.2, [4, 3]); curve(g, f, ts, ts.map((t) => XMAX_UM * Math.tanh((xl * Math.sin(TAU * 0.44 * t)) / XMAX_UM)), col.a(), 2);
        text(g, `3rd harmonic ${harmonicDb(v.v, 3).toFixed(0)} dB`, w - 8, 8, col.b(), 'right', 10); } },
  },
  'snd-ping': {
    label: 'Play the earbud ping', note: `Four clicks; each comes out as the earbud's impulse response h(t), a ring at its damped frequency ${spk().fd.toFixed(1)} Hz that dies within a few milliseconds. Short: it sounds like a tick.`,
    render: (fs) => pings(fs, 1, 4, 0.3),
    view: { aspect: 2.4, alt: 'The earbud impulse response h(t) over the first 5 ms.',
      draw(g, w, h) { const ts = linspace(0, 5, 301), ys = ts.map((t) => hImp(t)), m = Math.max(...ys.map(Math.abs)) * 1.1, f = fr(g, w, h, [0, 5], [-m, m], 't (ms)', 'h');
        curve(g, f, ts, ys, col.a(), 2); text(g, `rings at ${spk().fd.toFixed(1)} Hz, τ = ${(1 / spk().sigma).toFixed(2)} ms`, w - 8, 8, col.text(), 'right', 10); } },
  },
  'snd-ping-x': {
    label: 'EXAGGERATED: play a low-damping ping', note: `Not the real earbud: the damping is cut to 3% so the ring lasts long enough to hear as a pitch (${spk(0.03).fd.toFixed(0)} Hz, τ = ${(1 / spk(0.03).sigma).toFixed(0)} ms).`,
    render: (fs) => pings(fs, 0.03, 3, 0.6),
    view: { aspect: 2.4, alt: 'An exaggerated, lightly damped ring over 60 ms.',
      draw(g, w, h) { const ts = linspace(0, 60, 1201), ys = ts.map((t) => hImp(t, 0.03)), m = Math.max(...ys.map(Math.abs)) * 1.1, f = fr(g, w, h, [0, 60], [-m, m], 't (ms)', 'h');
        curve(g, f, ts, ys, col.bad(), 1.4); text(g, 'EXAGGERATED (damping × 0.03)', w - 8, 8, col.bad(), 'right', 10); } },
  },
  'snd-sweep': {
    label: 'Play a sweep through the earbud', note: 'A 6 s sweep from 100 Hz to 5 kHz, filtered by the earbud model (a digital biquad: bilinear transform, prewarped). Listen for the bump near 658 Hz, then the fade above 1 kHz; less damping makes the bump stand out.',
    controls: [{ key: 'd', label: 'damping', min: 0.3, max: 2, step: 0.05, value: 1, fmt: (v) => `× ${v.toFixed(2)}` }],
    render: (fs, v) => biquadRun(earbudBiquad(fs, v.d), logSweep(fs, SWEEP.f1, SWEEP.f2, SWEEP.T)),
    view: { aspect: 2.2, alt: 'The earbud gain against pitch on a log axis, with a cursor at the sweep frequency.',
      draw(g, w, h, v, t) { const c = earbudBiquad(48000, v.d), lf = linspace(Math.log10(100), Math.log10(5000), 240), ys = lf.map((x) => dB(biquadMag(c, 10 ** x, 48000)));
        const top = Math.max(8, Math.ceil(Math.max(...ys) + 2)), xr: [number, number] = [2, Math.log10(5000)];
        g.clearRect(0, 0, w, h); const f = rangeFrame(w, h, xr, [-30, top], 34, 6, 18, 24); graphAxes(g, f, xr, [-30, top], 'pitch (Hz, log scale)', 'dB', 10);
        for (const [hz, lab] of [[100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [5000, '5k']] as [number, string][]) { tline(g, f, [Math.log10(hz), -30], [Math.log10(hz), top], col.grid(), 1); text(g, lab, f.X(Math.log10(hz)), f.box.b + 9, col.muted(), 'center', 10); }
        tline(g, f, [2, 0], [Math.log10(5000), 0], col.muted(), 1, [2, 3]); curve(g, f, lf, ys, col.a(), 2);
        if (t !== null) { const fn = logSweepFreq(t, SWEEP.f1, SWEEP.f2, SWEEP.T), x = Math.log10(fn); tline(g, f, [x, -30], [x, top], col.e(), 1.6); text(g, `${fn.toFixed(0)} Hz, ${dB(biquadMag(c, fn, 48000)).toFixed(1)} dB`, w - 8, 8, col.e(), 'right', 10); }
        else text(g, `peak ${Math.max(...ys).toFixed(1)} dB`, w - 8, 8, col.text(), 'right', 10); } },
  },
  'snd-square': {
    label: 'Play the square-wave build-up', note: 'A 200 Hz square wave built from its odd harmonics, 200, 600, 1000 Hz…, each at 1/k of the first. Add them one at a time: the plot and the sound change together.',
    controls: [{ key: 'n', label: 'odd harmonics', min: 1, max: 15, step: 1, value: 1, fmt: (v) => `${v} (to ${(2 * v - 1) * 200} Hz)` }],
    render: (fs, v) => squarePartial(fs, v.n),
    view: { aspect: 2.4, alt: 'Two periods of the partial sum and the ideal square wave.',
      draw(g, w, h, v) { const ts = linspace(0, 10, 801), f = fr(g, w, h, [0, 10], [-1.5, 1.5], 't (ms)', '');
        curve(g, f, ts, ts.map((t) => (Math.sin(TAU * 0.2 * t) >= 0 ? 1 : -1)), col.muted(), 1, [4, 3]);
        curve(g, f, ts, ts.map((t) => { let s = 0; for (let k = 1; k <= v.n; k++) s += Math.sin(TAU * (2 * k - 1) * 0.2 * t) / (2 * k - 1); return (4 / Math.PI) * s; }), col.a(), 1.8); } },
  },
  'snd-alias': {
    label: 'Play a tone sampled at 8 kHz', note: 'The tone rises from 200 Hz to 7.8 kHz, but it is sampled at 8 kHz: above 4 kHz (fs/2) what comes back out is the folded pitch fs − f, which falls again. This is what an ideal 8 kHz converter would play back.',
    render: (fs) => chirp(fs, ALIAS.T, (t) => foldFreq(aliasTrue(t), ALIAS.fs)),
    view: { aspect: 2.2, alt: 'True frequency rising in a straight line and the apparent frequency folding back at 4 kHz, with a cursor.',
      draw(g, w, h, _v, t) { const ts = linspace(0, ALIAS.T, 241), f = fr(g, w, h, [0, ALIAS.T], [0, 8], 't (s)', 'kHz', 26);
        tline(g, f, [0, 4], [ALIAS.T, 4], col.muted(), 1, [2, 3]); text(g, 'fs/2', f.X(0.1), f.Y(4.35), col.muted(), 'left', 9);
        curve(g, f, ts, ts.map((x) => aliasTrue(x) / 1000), col.muted(), 1.4, [4, 3]); curve(g, f, ts, ts.map((x) => foldFreq(aliasTrue(x), ALIAS.fs) / 1000), col.a(), 2);
        if (t !== null) { const ft = aliasTrue(t), fa = foldFreq(ft, ALIAS.fs); tline(g, f, [t, 0], [t, 8], col.e(), 1.4); text(g, `true ${ft.toFixed(0)} Hz → heard ${fa.toFixed(0)} Hz`, w - 8, 8, col.e(), 'right', 10); }
        else text(g, 'dashed: true · solid: heard', w - 8, 8, col.text(), 'right', 10); } },
  },
  'snd-beat': {
    label: 'Play 690 Hz + 700 Hz', note: 'Two tones 10 Hz apart beat ten times a second. A 64-sample block at 8 kHz (8 ms, bins 125 Hz apart) cannot split them: in the windowed spectrum they are one blurred peak.',
    render: (fs) => { const n = Math.round(fs * 3), y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = Math.sin((TAU * 690 * i) / fs) + Math.sin((TAU * 700 * i) / fs); return y; },
    view: { aspect: 2.4, alt: 'The sum of 690 and 700 Hz over 0.3 s, with its 10 Hz beat envelope.',
      draw(g, w, h) { const ts = linspace(0, 300, 3001), f = fr(g, w, h, [0, 300], [-2.2, 2.2], 't (ms)', '');
        curve(g, f, ts, ts.map((t) => Math.sin(TAU * 0.69 * t) + Math.sin(TAU * 0.7 * t)), col.a(), 0.8); curve(g, f, ts, ts.map((t) => 2 * Math.abs(Math.cos(TAU * 0.005 * t))), col.b(), 1.4, [4, 3]); } },
  },
};
