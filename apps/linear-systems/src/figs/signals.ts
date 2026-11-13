import { figureOf, planeFrame, rangeFrame, spanLine, arrow, dot, polyline, fillPoly, text, tline, axes2, wipe, curve, graphAxes, fillBetween, heat, cross, col, linspace, clipBox, type V2 } from '@study/core';
import { eig2, companion2 } from '@study/core/dsp';
import { fmt, num } from './common';

const TAU = 2 * Math.PI;
/** Impulse response of the running cart, and an underdamped variant. */
const hCart = (t: number) => (t < 0 ? 0 : Math.exp(-t) - Math.exp(-2 * t));
const hRing = (t: number) => { const w = Math.sqrt(4 - 0.09); return t < 0 ? 0 : (Math.exp(-0.3 * t) * Math.sin(w * t)) / w; };

/* ───────────── tf: poles and zeros are distances ───────────── */
export const tfFigure = figureOf((c) => {
  const model = () => {
    const a1 = num(c.values, 'a1'), a0 = num(c.values, 'a0'), ev = eig2(companion2(a1, a0));
    const poles: V2[] = ev[0][1] === 0 ? [[ev[0][0], 0], [ev[1][0], 0]] : [[ev[0][0], ev[0][1]], [ev[1][0], ev[1][1]]];
    const hz = !!c.values.hasZero, z = num(c.values, 'zr');
    const K = hz ? a0 / Math.max(0.15, Math.abs(z)) : a0;
    const mag = (om: number) => { let m = K; if (hz) m *= Math.hypot(z, om); for (const p of poles) m /= Math.hypot(om - p[1], p[0]); return m; };
    return { poles, hz, z, mag };
  };
  return [
    {
      id: 'splane', title: 'Distances from the poles to the point jω', x: 'Re s', y: 'Im s',
      draw(g, w, h) {
        wipe(g, w, h);
        const { poles, hz, z, mag } = model(), om = num(c.values, 'w'), f = planeFrame(w, h, 5);
        g.fillStyle = 'rgba(110,226,110,.10)'; g.fillRect(f.box.l, f.box.t, f.X(0) - f.box.l, f.box.b - f.box.t);
        axes2(g, f, 'Re s', 'Im s');
        const P: V2 = [0, om];
        tline(g, f, [0, -5], [0, 5], col.accent(), 2, []);
        for (const p of poles) for (const sg of [1, -1]) if (sg === 1 || p[1] !== 0) {
          const q: V2 = [p[0], sg * p[1]];
          if (sg === 1) { g.setLineDash([5, 3]); polyline(g, f, [q, P], col.b(), 2, [5, 3]); const mx = (q[0] + P[0]) / 2, my = (q[1] + P[1]) / 2; text(g, fmt(Math.hypot(om - q[1], q[0])), f.X(mx) + 4, f.Y(my) - 8, col.b(), 'left', 11); }
        }
        if (hz) { polyline(g, f, [[z, 0], P], col.c(), 2, [5, 3]); text(g, fmt(Math.hypot(z, om)), f.X(z / 2) + 4, f.Y(om / 2) - 8, col.c(), 'left', 11); }
        for (const p of poles) { cross(g, f, p, col.bad(), 6); if (p[1] !== 0) cross(g, f, [p[0], -p[1]], col.bad(), 6); }
        if (hz) dot(g, f, [z, 0], col.c(), 6, true);
        dot(g, f, P, col.e(), 6);
        text(g, `|G(jω)| = ${hz ? 'K·(zero distance) ÷ ' : 'K ÷ '}(product of pole distances) = ${fmt(mag(om))}`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
        void spanLine; void fillPoly;
      },
    },
    {
      id: 'mag', title: 'Frequency response |G(jω)|', x: 'ω (rad/s)', y: '|G(jω)|',
      draw(g, w, h) {
        wipe(g, w, h);
        const { mag } = model(), om = num(c.values, 'w'), xs = linspace(0, 5, 300), ys = xs.map(mag), top = Math.min(12, Math.max(1.2, ...ys) * 1.1);
        const f = rangeFrame(w, h, [0, 5], [0, top], 40, 10, 8, 30);
        graphAxes(g, f, [0, 5], [0, top], 'ω (rad/s)', '|G(jω)|');
        curve(g, f, xs, ys, col.a(), 2.5);
        tline(g, f, [om, 0], [om, mag(om)], col.muted(), 1, [4, 3]);
        dot(g, f, [om, mag(om)], col.e(), 5);
      },
    },
  ];
});

/* ───────────── lti: convolution as flip and slide ───────────── */
export const ltiFigure = figureOf((c) => {
  const tmax = 9, dt = 0.02;
  const hf = () => (c.values.sys === 'ring' ? hRing : hCart);
  const xin = (tau: number) => {
    if (tau < 0) return 0;
    switch (String(c.values.input)) { case 'step': return 1; case 'sine': return Math.sin(TAU * 0.35 * tau); case 'two': return (tau < 1 ? 1 : 0) + (tau >= 3 && tau < 4 ? -1 : 0); default: return tau < 1.5 ? 1 : 0; }
  };
  const yAt = (t: number) => { let s = 0; const h = hf(); for (let tau = 0; tau <= t; tau += dt) s += xin(tau) * h(t - tau) * dt; return s; };
  return [
    {
      id: 'slide', title: 'Flip h, slide it to t, multiply, add up the area', x: 'τ (s)', y: 'x(τ), h(t − τ), product',
      draw(g, w, h) {
        wipe(g, w, h);
        const t = num(c.values, 't'), hh = hf(), f = rangeFrame(w, h, [-1, tmax], [-0.7, 1.15], 40, 10, 8, 30);
        graphAxes(g, f, [-1, tmax], [-0.7, 1.15], 'τ (s)', 'amplitude', 1, 0.5);
        const xs = linspace(-1, tmax, 500), prod = xs.map((tau) => xin(tau) * hh(t - tau));
        fillBetween(g, f, xs, prod.map((v) => v * 1), 'rgba(110,226,110,.4)');
        curve(g, f, xs, xs.map(xin), col.a(), 2.2);
        curve(g, f, xs, xs.map((tau) => (tau <= t ? hh(t - tau) * 2 : 0)), col.b(), 2.2);
        curve(g, f, xs, prod, col.c(), 2);
        tline(g, f, [t, -0.7], [t, 1.15], col.muted(), 1, [4, 3]);
        text(g, 'h is drawn ×2 for visibility', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
        text(g, `y(${fmt(t, 1)}) = area = ${fmt(yAt(t), 3)}`, f.box.l + 6, f.box.t + 10, col.c(), 'left', 12);
      },
    },
    {
      id: 'out', title: 'The output y(t) builds up as the area under the product', x: 'time t (s)', y: 'y(t)',
      draw(g, w, h) {
        wipe(g, w, h);
        const t = num(c.values, 't'), ts = linspace(0, tmax, 120), ys = ts.map(yAt);
        const hi = Math.max(0.3, ...ys) * 1.15, lo = Math.min(0, ...ys) * 1.15, f = rangeFrame(w, h, [0, tmax], [lo, hi], 40, 10, 8, 30);
        graphAxes(g, f, [0, tmax], [lo, hi], 'time t (s)', 'y(t) = (h ∗ x)(t)');
        curve(g, f, ts, ys.map((v, i) => v), col.muted(), 1.5, [4, 3]);
        const n = ts.findIndex((q) => q > t); const upto = n < 0 ? ts.length : n;
        curve(g, f, ts.slice(0, upto), ys.slice(0, upto), col.c(), 3);
        dot(g, f, [t, yAt(t)], col.e(), 5);
        curve(g, f, ts, ts.map((q) => xin(q) * 0.3 * hi), col.a(), 1, [2, 3]);
      },
    },
  ];
});

/* ───────────── ft: the Fourier transform as winding a signal around a circle ───────────── */
export const ftFigure = figureOf((c) => {
  const T = 8, dt = 0.01;
  const sig = (t: number) => (c.values.sig === 'cart' ? 4 * hCart(t) : t < 0 || t > T ? 0 : (Math.cos(TAU * 1 * t) + 0.6 * Math.cos(TAU * 2.5 * t)) * Math.exp(-((t - 4) ** 2) / 6));
  const X = (fq: number): V2 => { let re = 0, im = 0; for (let t = 0; t <= T; t += dt) { const x = sig(t), a = -TAU * fq * t; re += x * Math.cos(a) * dt; im += x * Math.sin(a) * dt; } return [re, im]; };
  const cache = { key: '', fs: [] as number[], mag: [] as number[] };
  const spectrum = () => { const key = String(c.values.sig); if (cache.key !== key) { cache.key = key; cache.fs = linspace(0, 4, 161); cache.mag = cache.fs.map((q) => Math.hypot(...X(q))); } return cache; };
  return [
    {
      id: 'wind', title: 'The signal wound around the origin at winding frequency f', x: 'Re[x(t) e^{−j2πft}]', y: 'Im[x(t) e^{−j2πft}]',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), peak = c.values.sig === 'cart' ? 1 : 1.7, f = planeFrame(w, h, peak * 1.15);
        axes2(g, f);
        const pts: V2[] = []; for (let t = 0; t <= T; t += 0.01) { const x = sig(t), a = -TAU * fq * t; pts.push([x * Math.cos(a), x * Math.sin(a)]); }
        polyline(g, f, pts, col.accent(), 1.6);
        const Xv = X(fq), cm: V2 = [Xv[0] / T, Xv[1] / T];
        arrow(g, f, [0, 0], [cm[0] * 4, cm[1] * 4], col.e(), 3, '');
        dot(g, f, [cm[0] * 4, cm[1] * 4], col.e(), 5);
        text(g, `centre of mass ×4 (yellow) ∝ X(f);  |X(${fmt(fq, 2)})| = ${fmt(Math.hypot(...Xv), 3)}`, f.box.l + 4, f.box.t + 8, col.text(), 'left', 11);
      },
    },
    {
      id: 'spec', title: 'Spectrum |X(f)|: how far the centre of mass sits from the origin', x: 'frequency f (Hz)', y: '|X(f)|',
      draw(g, w, h) {
        wipe(g, w, h);
        const { fs, mag } = spectrum(), fq = num(c.values, 'f'), top = Math.max(...mag) * 1.15, f = rangeFrame(w, h, [0, 4], [0, top], 40, 10, 8, 30);
        graphAxes(g, f, [0, 4], [0, top], 'frequency f (Hz)', '|X(f)|');
        g.globalAlpha = 0.3; curve(g, f, fs, mag, col.accent(), 2); g.globalAlpha = 1;
        const n = fs.findIndex((q) => q > fq); const upto = n < 0 ? fs.length : n;
        curve(g, f, fs.slice(0, upto), mag.slice(0, upto), col.accent(), 3);
        dot(g, f, [fq, Math.hypot(...X(fq))], col.e(), 5);
      },
    },
  ];
});

/* ───────────── fs: a periodic signal as rotating phasors ───────────── */
const waveB = (kind: string, k: number): number => {
  if (kind === 'square') return k % 2 ? 4 / (Math.PI * k) : 0;
  if (kind === 'saw') return ((2 / Math.PI) * (k % 2 ? 1 : -1)) / k;
  return k % 2 ? ((8 / (Math.PI * Math.PI)) * (((k - 1) / 2) % 2 ? -1 : 1)) / (k * k) : 0;
};
const waveF = (kind: string, th: number) => { const u = ((th % TAU) + TAU) % TAU; if (kind === 'square') return u < Math.PI ? 1 : -1; if (kind === 'saw') return (u <= Math.PI ? u : u - TAU) / Math.PI; return (2 / Math.PI) * Math.asin(Math.sin(u)); };
export const fsFigure = figureOf((c) => {
  return [
    {
      id: 'phasors', title: 'Rotating phasors, one per harmonic', x: 'Re (unit: amplitude)', y: 'Im = the partial sum',
      draw(g, w, h) {
        wipe(g, w, h);
        const kind = String(c.values.wave), N = num(c.values, 'N'), th = num(c.values, 'th'), f = planeFrame(w, h, 2.4, 0.2, 0);
        axes2(g, f);
        let cx = 0, cy = 0;
        for (let k = 1; k <= N; k++) {
          const b = waveB(kind, k); if (!b) continue;
          g.strokeStyle = col.muted(); g.globalAlpha = 0.5; g.lineWidth = 1; g.beginPath(); g.arc(f.X(cx), f.Y(cy), Math.abs(b) * f.sx, 0, TAU); g.stroke(); g.globalAlpha = 1;
          const nx = cx + b * Math.cos(k * th), ny = cy + b * Math.sin(k * th);
          arrow(g, f, [cx, cy], [nx, ny], k === 1 ? col.a() : k === 3 || (k === 2) ? col.b() : col.c(), k === 1 ? 2.5 : 1.8);
          cx = nx; cy = ny;
        }
        tline(g, f, [f.ix(f.box.l), cy], [cx, cy], col.e(), 1, [3, 3]); dot(g, f, [cx, cy], col.e(), 5);
        text(g, `${N} harmonic${N > 1 ? 's' : ''}: the height of the last tip is the partial sum`, f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
      },
    },
    {
      id: 'wave', title: 'The waveform they draw', x: 'phase θ = ω₀t (rad)', y: 'x(θ)',
      draw(g, w, h) {
        wipe(g, w, h);
        const kind = String(c.values.wave), N = num(c.values, 'N'), th = num(c.values, 'th'), ths = linspace(0, TAU, 500);
        const part = (t: number) => { let s = 0; for (let k = 1; k <= N; k++) s += waveB(kind, k) * Math.sin(k * t); return s; };
        const f = rangeFrame(w, h, [0, TAU], [-1.5, 1.5], 40, 10, 8, 30);
        graphAxes(g, f, [0, TAU], [-1.5, 1.5], 'phase θ = ω₀t (rad)', 'x(θ)', Math.PI / 2, 0.5);
        curve(g, f, ths, ths.map((t) => waveF(kind, t)), col.muted(), 1.5, [5, 4]);
        curve(g, f, ths, ths.map(part), col.e(), 2.8);
        const t = ((th % TAU) + TAU) % TAU; dot(g, f, [t, part(t)], col.e(), 5);
      },
    },
  ];
});

/* ───────────── dtft: the spectrum of samples is periodic ───────────── */
export const dtftFigure = figureOf((c) => {
  const G = (om: number): V2 => { const a: V2 = [1, om], b: V2 = [2, om]; const dr = a[0] * b[0] - a[1] * b[1], di = a[0] * b[1] + a[1] * b[0], n = dr * dr + di * di; return [dr / n, -di / n]; };
  const dtft = (T: number, N: number) => (w: number) => { let re = 0, im = 0; for (let n = 0; n < N; n++) { const v = hCart(n * T); re += v * Math.cos(w * n); im -= v * Math.sin(w * n); } return Math.hypot(re, im); };
  return [
    {
      id: 'seq', title: 'The sampled sequence x[n] = h(nT)', x: 'sample index n', y: 'x[n]',
      draw(g, w, h) {
        wipe(g, w, h);
        const T = num(c.values, 'T'), N = Math.min(40, Math.ceil(8 / T)), f = rangeFrame(w, h, [-0.5, N], [-0.05, 0.3], 40, 10, 8, 30);
        graphAxes(g, f, [-0.5, N], [-0.05, 0.3], 'sample index n', 'x[n]', N > 20 ? 5 : 2, 0.1);
        const tc = linspace(0, N * T, 200); curve(g, f, tc.map((t) => t / T), tc.map(hCart), col.muted(), 1.5, [4, 3]);
        for (let n = 0; n < N; n++) { tline(g, f, [n, 0], [n, hCart(n * T)], col.a(), 2); dot(g, f, [n, hCart(n * T)], col.a(), 3.5); }
        text(g, `T = ${fmt(T, 2)} s: dashed is the continuous h(t) the samples come from`, f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
    {
      id: 'spec', title: 'DTFT |X(e^{jω})|: periodic with period 2π', x: 'ω (rad/sample)', y: '|X(e^{jω})|',
      draw(g, w, h) {
        wipe(g, w, h);
        const T = num(c.values, 'T'), N = Math.ceil(12 / T), ws = linspace(-TAU, TAU, 400), F = dtft(T, N), ys = ws.map(F);
        const hi = Math.max(...ys) * 1.15, f = rangeFrame(w, h, [-TAU, TAU], [0, hi], 40, 10, 8, 30);
        g.fillStyle = 'rgba(138,180,255,.12)'; g.fillRect(f.X(-Math.PI), f.box.t, f.X(Math.PI) - f.X(-Math.PI), f.box.b - f.box.t);
        graphAxes(g, f, [-TAU, TAU], [0, hi], 'ω (rad/sample)', '|X(e^{jω})|', Math.PI);
        curve(g, f, ws, ws.map((q) => Math.hypot(...G(q / T)) / T), col.muted(), 1.5, [5, 4]);
        curve(g, f, ws, ys, col.a(), 3);
        const om = num(c.values, 'w'); tline(g, f, [om, 0], [om, hi], col.muted(), 1, [4, 3]); dot(g, f, [om, F(om)], col.e(), 5);
        text(g, 'shaded: one period [−π, π]', f.box.l + 4, f.box.t + 26, col.accent(), 'left', 10);
        text(g, 'dashed: unsampled |G(jω/T)|/T', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});

/* ───────────── dft: N samples of the unit circle ───────────── */
export const dftFigure = figureOf((c) => {
  const Lr = () => num(c.values, 'L'), Nf = () => Number(c.values.N);
  const X = (w: number): V2 => { const L = Lr(), f0 = num(c.values, 'f0'); let re = 0, im = 0; for (let n = 0; n < L; n++) { const x = Math.cos(TAU * f0 * n); re += x * Math.cos(w * n); im -= x * Math.sin(w * n); } return [re, im]; };
  return [
    {
      id: 'circle', title: 'The unit circle in the z-plane, sampled at N points', x: 'Re z', y: 'Im z',
      draw(g, w, h) {
        wipe(g, w, h);
        const f = planeFrame(w, h, 1.5), N = Nf(), L = Lr(); axes2(g, f);
        const dense = linspace(0, TAU, 300), mags = dense.map((a) => Math.hypot(...X(a))), mx = Math.max(...mags, 1e-9);
        g.lineWidth = 3;
        for (let i = 1; i < dense.length; i++) { g.strokeStyle = col.accent(); g.globalAlpha = 0.15 + 0.6 * (mags[i] / mx); g.beginPath(); g.moveTo(f.X(Math.cos(dense[i - 1])), f.Y(Math.sin(dense[i - 1]))); g.lineTo(f.X(Math.cos(dense[i])), f.Y(Math.sin(dense[i]))); g.stroke(); }
        g.globalAlpha = 1;
        for (let k = 0; k < N; k++) { const a = (TAU * k) / N, m = Math.hypot(...X(a)) / mx; dot(g, f, [Math.cos(a), Math.sin(a)], col.e(), 2.5 + 5 * m); }
        text(g, `N = ${N} points at ω_k = 2πk/N;  record length L = ${L}`, f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
      },
    },
    {
      id: 'spec', title: 'DFT bins X[k] are samples of the DTFT curve', x: 'ω (rad/sample)', y: '|X|',
      draw(g, w, h) {
        wipe(g, w, h);
        const N = Nf(), ws = linspace(0, TAU, 400), ys = ws.map((q) => Math.hypot(...X(q))), hi = Math.max(...ys, 1) * 1.15;
        const f = rangeFrame(w, h, [0, TAU], [0, hi], 40, 10, 8, 30);
        graphAxes(g, f, [0, TAU], [0, hi], 'ω (rad/sample)', '|X|', Math.PI / 2);
        curve(g, f, ws, ys, col.accent(), 2, [4, 3]);
        for (let k = 0; k < N; k++) { const a = (TAU * k) / N, m = Math.hypot(...X(a)); tline(g, f, [a, 0], [a, m], col.e(), 2); dot(g, f, [a, m], col.e(), 3); }
        const f0 = num(c.values, 'f0') * Lr(); text(g, Math.abs(f0 - Math.round(f0)) < 0.02 && Nf() === Lr() ? 'tone sits exactly on a bin: one clean spike' : 'between bins: energy leaks into neighbours', f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
  ];
});

/* ───────────── laplace: weighting by e^{−st} ───────────── */
export const laplaceFigure = figureOf((c) => {
  const kind = () => String(c.values.sig);
  const x = (t: number) => (t < 0 ? 0 : kind() === 'grow' ? Math.exp(0.5 * t) : Math.exp(-t) - Math.exp(-2 * t));
  const sigC = () => (kind() === 'grow' ? 0.5 : -1);
  const Xs = (re: number, im: number): V2 => kind() === 'grow' ? (() => { const dr = re - 0.5, di = im, n = dr * dr + di * di; return [dr / n, -di / n] as V2; })() : (() => { const ar = re + 1, ai = im, br = re + 2, bi = im; const dr = ar * br - ai * bi, di = ar * bi + ai * br, n = dr * dr + di * di; return [dr / n, -di / n] as V2; })();
  const TM = 10;
  return [
    {
      id: 'integrand', title: 'The integrand x(t) e^{−σt} cos ωt', x: 'time t (s)', y: 'x(t) e^{−σt} cos ωt',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'sigma'), om = num(c.values, 'omega'), ts = linspace(0, TM, 600), ok = s > sigC();
        const f = rangeFrame(w, h, [0, TM], [-1.2, 1.2], 40, 10, 8, 30);
        graphAxes(g, f, [0, TM], [-1.2, 1.2], 'time t (s)', 'integrand (clipped)', 2, 0.5);
        curve(g, f, ts, ts.map(x), col.muted(), 1.5, [5, 4]);
        curve(g, f, ts, ts.map((t) => Math.exp(-s * t)), col.b(), 1.2, [2, 3]);
        const ys = ts.map((t) => x(t) * Math.exp(-s * t) * Math.cos(om * t));
        fillBetween(g, f, ts, ys.map((v) => Math.max(-1.2, Math.min(1.2, v))), ok ? 'rgba(110,226,110,.35)' : 'rgba(239,91,91,.30)');
        curve(g, f, ts, ys, ok ? col.c() : col.bad(), 2.5);
        const Xv = Xs(s, om);
        text(g, ok ? `X(s) = ${fmt(Xv[0], 3)} ${Xv[1] < 0 ? '−' : '+'} ${fmt(Math.abs(Xv[1]), 3)}j   (area converges)` : 'outside the ROC: the area diverges', f.box.l + 6, f.box.t + 10, ok ? col.ok() : col.bad(), 'left', 11);
        text(g, 'dashed grey: x(t) · dotted: weight e^{−σt}', f.box.r - 4, f.box.b - 6, col.muted(), 'right', 10);
      },
    },
    {
      id: 'splane', title: '|X(s)| over the s-plane, and the region of convergence', x: 'σ = Re s', y: 'ω = Im s',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'sigma'), om = num(c.values, 'omega'), f = planeFrame(w, h, 4, -0.5, 0, 8, true), sc = sigC();
        heat(g, f, (px, py) => { const v = Xs(px, py), m = Math.log10(Math.max(1e-3, Math.hypot(v[0], v[1]))), u = Math.max(0, Math.min(1, (m + 1.5) / 2.5)); return [Math.round(30 + 200 * u), Math.round(30 + 120 * u * u), Math.round(90 + 80 * (1 - u)), 255]; }, 5);
        g.save(); clipBox(g, f); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(f.box.l, f.box.t, f.X(sc) - f.box.l, f.box.b - f.box.t); g.restore();
        axes2(g, f, 'σ', 'ω');
        tline(g, f, [sc, -8], [sc, 8], col.e(), 2, [6, 4]);
        text(g, 'ROC: σ > ' + fmt(sc, 1), f.X(sc) + 6, f.box.t + 12, col.e(), 'left', 11);
        const poles: V2[] = kind() === 'grow' ? [[0.5, 0]] : [[-1, 0], [-2, 0]];
        for (const p of poles) cross(g, f, p, '#fff', 6);
        dot(g, f, [s, om], col.c(), 6); dot(g, f, [s, -om], col.c(), 3, true);
        text(g, 'brighter = larger |X(s)|; dimmed = outside the ROC', f.box.l + 4, f.box.b - 6, '#ddd', 'left', 10);
      },
    },
  ];
});

/* ───────────── sampling: aliasing as folding ───────────── */
export const samplingFigure = figureOf((c) => {
  return [
    {
      id: 'time', title: 'Two different tones through the same samples', x: 'time t (s)', y: 'amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), fs = num(c.values, 'fs'), fa = Math.abs(fq - Math.round(fq / fs) * fs), tm = 2, ts = linspace(0, tm, 800);
        const f = rangeFrame(w, h, [0, tm], [-1.3, 1.3], 40, 10, 8, 30);
        graphAxes(g, f, [0, tm], [-1.3, 1.3], 'time t (s)', 'amplitude', 0.5, 0.5);
        curve(g, f, ts, ts.map((t) => Math.cos(TAU * fq * t)), col.a(), 2);
        curve(g, f, ts, ts.map((t) => Math.cos(TAU * fa * t)), col.b(), 2, [7, 4]);
        for (let k = 0; k * (1 / fs) <= tm; k++) { const t = k / fs; tline(g, f, [t, 0], [t, Math.cos(TAU * fq * t)], col.e(), 1); dot(g, f, [t, Math.cos(TAU * fq * t)], col.e(), 4); }
        text(g, fa < fq - 1e-6 ? `the samples cannot tell ${fmt(fq, 1)} Hz from ${fmt(fa, 1)} Hz` : 'below Nyquist: the samples pin down the tone', f.box.r - 4, f.box.t + 10, fa < fq - 1e-6 ? col.bad() : col.ok(), 'right', 11);
      },
    },
    {
      id: 'spectrum', title: 'Sampling copies the spectrum at multiples of fs', x: 'frequency (Hz)', y: 'spectral lines',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), fs = num(c.values, 'fs'), R = Math.max(20, fs * 1.6), f = rangeFrame(w, h, [-R, R], [0, 1.25], 40, 10, 8, 30);
        g.fillStyle = 'rgba(110,226,110,.12)'; g.fillRect(f.X(-fs / 2), f.box.t, f.X(fs / 2) - f.X(-fs / 2), f.box.b - f.box.t);
        graphAxes(g, f, [-R, R], [0, 1.25], 'frequency (Hz)', 'amplitude', fs / 2, 1);
        for (let k = -4; k <= 4; k++) for (const sg of [1, -1]) {
          const fx = sg * fq + k * fs; if (Math.abs(fx) > R) continue;
          const base = k === 0, inBand = Math.abs(fx) <= fs / 2 + 1e-9;
          tline(g, f, [fx, 0], [fx, 1], base ? col.a() : inBand ? col.b() : col.muted(), base ? 3 : 2.2);
          dot(g, f, [fx, 1], base ? col.a() : inBand ? col.b() : col.muted(), 3.5);
        }
        text(g, 'green band: ±fs/2 (what the samples can represent)', f.box.l + 4, f.box.t + 12, col.ok(), 'left', 10);
        text(g, 'blue: true tone · orange: copy inside the band', f.box.l + 4, f.box.t + 26, col.muted(), 'left', 10);
      },
    },
  ];
});
