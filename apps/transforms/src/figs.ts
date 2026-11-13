import { figureOf, planeFrame, rangeFrame, axes2, wipe, curve, graphAxes, polyline, dot, cross, text, tline, col, linspace, clipBox, type V2 } from '@study/core';
import { C, cabs, cexpj, TAU, dft, windowSamples, type Cx } from '@study/core/dsp';
import { derive, xt, Xjw, type ModelParams } from './model';

type Vals = Record<string, number | string | boolean>;
const n = (v: Vals, k: string) => v[k] as number;
const params = (v: Vals): ModelParams => ({ A: 1, wave: 'free', mode: v.mode as ModelParams['mode'], sig: n(v, 'sig'), f0: n(v, 'f0'), dl: n(v, 'dl'), fs: n(v, 'fs'), M: 32, N: 64 });
const model = (v: Vals) => { const S = params(v); return { S, d: derive(S) }; };
const fmt = (x: number, d = 2) => (Math.abs(x) < 5e-3 ? '0' : x.toFixed(d)).replace('-', '−');

function timePanel(v: Vals, g: CanvasRenderingContext2D, w: number, h: number, stems = false) {
  const { S, d } = model(v), tm = 8, ts = linspace(0, tm, 600), xs = ts.map((t) => xt(t, d, S));
  const f = rangeFrame(w, h, [0, tm], [-1.15, 1.15], 40, 10, 8, 30);
  graphAxes(g, f, [0, tm], [-1.15, 1.15], 'time t (s)', 'x(t)', 1, 0.5);
  const env = ts.map((t) => Math.exp(-S.sig * t));
  curve(g, f, ts, env, col.muted(), 1.2, [5, 4]); curve(g, f, ts, env.map((e) => -e), col.muted(), 1.2, [5, 4]);
  curve(g, f, ts, xs, col.a(), stems ? 1.5 : 2.8);
  if (stems) for (let k = 0; k / S.fs <= tm; k++) { const t = k / S.fs, y = xt(t, d, S); tline(g, f, [t, 0], [t, y], col.e(), 1.2); dot(g, f, [t, y], col.e(), 3); }
  return { S, d, f };
}

/* the running example: the ring and where its poles are */
export const ringFigure = figureOf((c) => [
  {
    id: 'time', title: 'The signal: a decaying ring', x: 'time t (s)', y: 'x(t)',
    draw(g, w, h) { wipe(g, w, h); const { d, f } = timePanel(c.values, g, w, h); text(g, `damping ratio ζ = ${isFinite(d.zeta) ? fmt(d.zeta) : '–'}`, f.box.r - 4, f.box.t + 10, col.muted(), 'right', 11); },
  },
  {
    id: 'splane', title: 'The same signal in the s-plane: its poles', x: 'σ = Re s (1/s)', y: 'ω = Im s (rad/s)',
    draw(g, w, h) {
      wipe(g, w, h);
      const { d } = model(c.values), f = planeFrame(w, h, 9, -2.5, 0);
      g.save(); clipBox(g, f); const xr = Math.max(d.p1.re, d.p2.re);
      g.fillStyle = 'rgba(110,226,110,.10)'; g.fillRect(f.X(xr), f.box.t, f.box.r - f.X(xr), f.box.b - f.box.t); g.restore();
      axes2(g, f, 'σ', 'jω');
      for (const p of [d.p1, d.p2]) cross(g, f, [p.re, p.im], col.bad(), 6);
      dot(g, f, [d.z0.re, d.z0.im], col.c(), 5, true);
      text(g, 'shaded: region of convergence', f.box.r - 4, f.box.t + 10, col.ok(), 'right', 10);
      text(g, `poles ${fmt(d.p1.re)} ${d.p1.im >= 0 ? '±' : '±'} j${fmt(Math.abs(d.p1.im))}: real part = decay, imaginary part = ringing`, f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
    },
  },
]);

/* the Fourier transform of the ring: peak position and width */
export const spectrumFigure = figureOf((c) => [
  { id: 'time', title: 'Time: decay sets the width', x: 'time t (s)', y: 'x(t)', draw(g, w, h) { wipe(g, w, h); timePanel(c.values, g, w, h); } },
  {
    id: 'spec', title: 'Frequency: |X(jω)|', x: 'frequency f (Hz)', y: '|X(f)|',
    draw(g, w, h) {
      wipe(g, w, h);
      const { S, d } = model(c.values), fs = linspace(0, 4, 400), ys = fs.map((q) => cabs(Xjw(TAU * q, d, S)));
      const top = Math.max(...ys) * 1.15, f = rangeFrame(w, h, [0, 4], [0, top], 40, 10, 8, 30);
      graphAxes(g, f, [0, 4], [0, top], 'frequency f (Hz)', '|X(f)|');
      if (S.mode === 'under') { const lo = Math.max(0, S.f0 - S.sig / TAU), hi = S.f0 + S.sig / TAU; g.fillStyle = 'rgba(138,180,255,.18)'; g.fillRect(f.X(lo), f.box.t, f.X(hi) - f.X(lo), f.box.b - f.box.t); text(g, 'width ≈ σ/π', f.X(S.f0), f.box.t + 12, col.accent(), 'center', 10); }
      curve(g, f, fs, ys, col.a(), 3);
      if (S.mode === 'under') tline(g, f, [S.f0, 0], [S.f0, top], col.muted(), 1, [4, 3]);
    },
  },
]);

/* sampling: the spectrum is copied every fs and the copies add */
export const sampledFigure = figureOf((c) => [
  { id: 'time', title: 'Time: the samples are all we keep', x: 'time t (s)', y: 'x(t), x[n]', draw(g, w, h) { wipe(g, w, h); timePanel(c.values, g, w, h, true); } },
  {
    id: 'copies', title: 'Frequency: copies every fs, added together', x: 'frequency f (Hz)', y: '|X|',
    draw(g, w, h) {
      wipe(g, w, h);
      const { S, d } = model(c.values), R = Math.max(4, S.fs * 1.1), fq = linspace(0, R, 500), T = 1 / S.fs;
      const one = (f0: number, k: number) => Xjw(TAU * (f0 - k * S.fs), d, S);
      const sum = fq.map((q) => { let re = S.A * T / 2, im = 0; for (let k = -8; k <= 8; k++) { const z = one(q, k); re += z.re; im += z.im; } return Math.hypot(re, im) / 1; });
      const base = fq.map((q) => cabs(one(q, 0)));
      const top = Math.max(...sum, ...base) * 1.1, f = rangeFrame(w, h, [0, R], [0, top], 40, 10, 8, 30);
      g.fillStyle = 'rgba(110,226,110,.10)'; g.fillRect(f.X(0), f.box.t, f.X(S.fs / 2) - f.X(0), f.box.b - f.box.t);
      graphAxes(g, f, [0, R], [0, top], 'frequency f (Hz)', 'amplitude');
      for (const k of [-2, -1, 1, 2]) curve(g, f, fq, fq.map((q) => cabs(one(q, k))), col.muted(), 1.2, [4, 3]);
      curve(g, f, fq, base, col.a(), 2);
      curve(g, f, fq, sum, col.e(), 2.8);
      text(g, 'blue: original · yellow: all copies added', f.box.l + 4, f.box.t + 10, col.muted(), 'left', 10);
    },
  },
]);

/* z = e^{sT}: poles move from the s-plane to the z-plane */
export const zmapFigure = figureOf((c) => [
  {
    id: 'splane', title: 's-plane: where the poles are', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h) {
      wipe(g, w, h);
      const { S, d } = model(c.values), f = planeFrame(w, h, Math.max(10, Math.PI * S.fs * 1.2), -2.5, 0);
      g.save(); clipBox(g, f); g.fillStyle = 'rgba(110,226,110,.10)'; g.fillRect(f.box.l, f.Y(Math.PI * S.fs), f.X(0) - f.box.l, f.Y(-Math.PI * S.fs) - f.Y(Math.PI * S.fs)); g.restore();
      axes2(g, f, 'σ', 'jω');
      for (const sg of [1, -1]) tline(g, f, [f.ix(f.box.l), sg * Math.PI * S.fs], [f.ix(f.box.r), sg * Math.PI * S.fs], col.e(), 1.5, [6, 4]);
      for (const p of [d.p1, d.p2]) cross(g, f, [p.re, p.im], col.bad(), 6);
      text(g, '±π fs: the strip of s-plane that z can tell apart', f.box.l + 4, f.box.b - 6, col.e(), 'left', 10);
    },
  },
  {
    id: 'zplane', title: 'z-plane: the poles at z = e^{pT}', x: 'Re z', y: 'Im z',
    draw(g, w, h) {
      wipe(g, w, h);
      const { d } = model(c.values), f = planeFrame(w, h, 1.5);
      g.fillStyle = 'rgba(110,226,110,.12)'; g.beginPath(); g.arc(f.X(0), f.Y(0), f.sx, 0, TAU); g.fill();
      g.strokeStyle = col.ok(); g.lineWidth = 2; g.beginPath(); g.arc(f.X(0), f.Y(0), f.sx, 0, TAU); g.stroke();
      axes2(g, f, 'Re z', 'Im z');
      for (const q of [d.q1, d.q2]) cross(g, f, [q.re, q.im], col.bad(), 6);
      dot(g, f, [d.zz.re, d.zz.im], col.c(), 5, true);
      text(g, `radius r = e^{−σT} = ${fmt(d.r, 3)}   angle Ω = ${fmt((d.Wwrap * 180) / Math.PI, 1)}° (wrapped)`, f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
    },
  },
]);

/* finite records: windows trade resolution for leakage */
export const leakageFigure = figureOf((c) => {
  const build = () => {
    const M = n(c.values, 'M'), kind = c.values.win as 'rect' | 'hann' | 'blackman', b = 8 + n(c.values, 'off');
    const w = windowSamples(kind, M, {}), x = Array.from({ length: M }, (_, i) => Math.cos((TAU * b * i) / M));
    return { M, xw: x.map((v, i) => v * w[i]), x, w, b };
  };
  return [
    {
      id: 'record', title: 'The record, tapered by the window', x: 'sample n', y: 'x[n]·w[n]',
      draw(g, w, h) {
        wipe(g, w, h);
        const { M, xw, w: win } = build(), f = rangeFrame(w, h, [-1, M], [-1.1, 1.1], 40, 10, 8, 30);
        graphAxes(g, f, [-1, M], [-1.1, 1.1], 'sample n', 'x[n]·w[n]', M > 32 ? 16 : 8, 0.5);
        curve(g, f, win.map((_, i) => i), win, col.muted(), 1.5, [4, 3]);
        for (let i = 0; i < M; i++) { tline(g, f, [i, 0], [i, xw[i]], col.a(), 1.6); dot(g, f, [i, xw[i]], col.a(), 2.5); }
      },
    },
    {
      id: 'spectrum', title: 'Spectrum (dB): main lobe and sidelobes', x: 'DFT bin (of M)', y: 'level (dB, rel. to rectangular peak)',
      draw(g, w, h) {
        wipe(g, w, h);
        const { M, xw, b } = build(), Nd = 1024, X = dft(xw, Nd, M), ref = M / 2;
        const db = (z: Cx) => 20 * Math.log10(Math.max(1e-6, cabs(z) / ref));
        const bins = linspace(0, M / 2 + 4, 0 + 1).length; void bins;
        const xs = Array.from({ length: Nd / 2 }, (_, i) => (i * M) / Nd), ys = xs.map((_, i) => db(X[i]));
        const hi = Math.min(M / 2 + 4, 20), f = rangeFrame(w, h, [0, hi], [-100, 5], 40, 10, 8, 30);
        graphAxes(g, f, [0, hi], [-100, 5], 'frequency (bins of the M-point DFT)', 'dB', 4, 20);
        curve(g, f, xs, ys, col.accent(), 2.2, [4, 3]);
        const Xb = dft(xw, M, M);
        for (let k = 0; k <= Math.min(M / 2, hi); k++) { const v = db(Xb[k]); tline(g, f, [k, -100], [k, v], col.e(), 2); dot(g, f, [k, v], col.e(), 3); }
        tline(g, f, [b, -100], [b, 5], col.muted(), 1, [4, 3]);
        text(g, 'stems: the M-point DFT · dashed: the DTFT it samples', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
        void C; void cexpj; void polyline;
      },
    },
  ];
});
