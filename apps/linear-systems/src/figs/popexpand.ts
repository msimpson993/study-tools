/** Pop-up pictures for the expanded Full-detail boxes (Nov 19, Linear Systems Tutor's specs): ROC, ORTHO, SAMP, DTFT, WIN, FB.
 * Every number is computed here from the models (ex.ts for the earbud, carModel for the car); test/expand.test.ts pins them. */
import { rangeFrame, graphAxes, curve, tline, text, dot, cross, col, linspace, fillBetween, arrow, withLabelRole, type QuizFigureDef, type Frame } from '@study/core';
import { spk, hImp, cabs, TAU, ringDigital, ringDTFT, ringSample, humDFT, dB, aliasOf, squareCoef } from './ex';
import { CAR, carModes, skyGains, withSky, bumpResponse, skyBump } from './car';

type R4 = { x: number; y: number; w: number; h: number };
type Line = [string, string];
/** n panels side by side on a wide canvas, stacked when it is narrow (phones) */
const panels = (w: number, h: number, n: number, wide = 1.5): R4[] => (w / h >= wide
  ? Array.from({ length: n }, (_, i) => ({ x: (i * w) / n, y: 0, w: w / n, h }))
  : Array.from({ length: n }, (_, i) => ({ x: 0, y: (i * h) / n, w, h: h / n })));
/** coloured key lines across the top of a panel (notes never sit inside the plot) */
function header(g: CanvasRenderingContext2D, r: R4, lines: Line[]) {
  withLabelRole('axis', () => lines.forEach(([s, c], i) => text(g, s, r.x + 6, r.y + 9 + 12.5 * i, c, 'left', 10)));
  return lines.length * 12.5 + 6;
}
/** a frame filling panel r below its header */
const frameIn = (w: number, h: number, r: R4, top: number, xr: [number, number], yr: [number, number], L = 36, B = 28): Frame =>
  rangeFrame(w, h, xr, yr, r.x + L, w - (r.x + r.w) + 10, r.y + top + 4, h - (r.y + r.h) + B);
/** graphAxes, but with the axis titles placed against this frame (graphAxes puts them at the canvas edge, which
 *  collides when panels sit side by side or stack) */
function axes(g: CanvasRenderingContext2D, f: Frame, xr: [number, number], yr: [number, number], xl: string, yl: string, sx: number, sy: number, fmt?: (x: number) => string) {
  // a frame on the canvas floor keeps graphAxes' own x title (an empty one there would still push the middle tick aside)
  const floor = f.h - f.box.b <= 38;
  graphAxes(g, f, xr, yr, floor ? xl : '', '', sx, sy, fmt);
  withLabelRole('axis', () => { if (xl && !floor) text(g, xl, (f.box.l + f.box.r) / 2, f.box.b + 24, col.text(), 'center', 11);
    if (yl) { g.save(); g.translate(f.box.l - 28, (f.box.t + f.box.b) / 2); g.rotate(-Math.PI / 2); text(g, yl, 0, 0, col.text(), 'center', 11); g.restore(); } });
}
const shadeX = (g: CanvasRenderingContext2D, f: Frame, x0: number, x1: number, c: string) => { g.save(); g.fillStyle = c; const a = Math.max(f.box.l, Math.min(f.X(x0), f.X(x1))), b = Math.min(f.box.r, Math.max(f.X(x0), f.X(x1))); g.fillRect(a, f.box.t, b - a, f.box.b - f.box.t); g.restore(); };

/* ---------- ROC: same poles, two regions, two signals ---------- */
export const rocFig = () => { const p = spk(); return { sigma: p.sigma, wd: p.wd, fd: p.fd }; };
/** the left-sided signal with the same poles: the ring formula negated, for t < 0 (envelope e^(σ|t|) grows into the past) */
export const rocLeft = (t: number) => { const p = spk(); return t < 0 ? -(p.a0 / p.wd) * Math.exp(-p.sigma * t) * Math.sin(p.wd * t) : 0; };
/** where |rocLeft| is largest on the drawn window [−3, 1] ms, and the envelope growth at −3 and −6 ms */
export const rocLeftPeak = () => { const ts = linspace(-3, 1, 4001); let tm = 0, m = 0; for (const t of ts) { const v = Math.abs(rocLeft(t)); if (v > m) { m = v; tm = t; } } const p = spk(); return { t: tm, env3: Math.exp(3 * p.sigma), env6: Math.exp(6 * p.sigma) }; };
const roc: QuizFigureDef = { aspect: 2.0, phoneAspect: 0.75, maxWidth: 560, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = spk(), P = panels(w, h, 2);
  [0, 1].forEach((i) => {
    const r = P[i], right = i === 0;
    const top = header(g, r, right ? [['(a) ROC σ > −1.27 /ms: right-sided, causal', col.c()], ['contains the jω axis: stable', col.muted()]] : [['(b) ROC σ < −1.27 /ms: left-sided', col.b()], ['runs backward in time, growing into the past: not stable', col.muted()]]);
    const ph = (r.h - top) * 0.58, rp = { ...r, h: top + ph };
    const f = frameIn(w, h, rp, top, [-3, 1], [-6, 6], 36, 28);
    axes(g, f, [-3, 1], [-6, 6], 'σ (1/ms)', 'ω (rad/ms)', 1, 3);
    shadeX(g, f, right ? -p.sigma : -3, right ? 1 : -p.sigma, right ? 'rgba(110,226,110,.16)' : 'rgba(120,170,255,.16)');
    tline(g, f, [0, -6], [0, 6], col.strong(), 2.4); tline(g, f, [-p.sigma, -6], [-p.sigma, 6], col.muted(), 1, [4, 3]);
    withLabelRole('axis', () => text(g, '← jω axis', f.X(0) + 4, f.box.t + 9, col.text(), 'left', 10));
    for (const q of p.poles) cross(g, f, q as [number, number], col.bad(), 5);
    const ri = { x: r.x, y: r.y + top + ph, w: r.w, h: r.h - top - ph };
    const tw: [number, number] = right ? [-6, 6] : [-3, 1], ts = linspace(tw[0], tw[1], 481), y0 = ts.map((t) => (right ? (t >= 0 ? hImp(t) : 0) : rocLeft(t))), pk = Math.max(...y0.map(Math.abs)), ys = y0.map((y) => y / pk), m = 1.15;
    const fi = rangeFrame(w, h, tw, [-m, m], ri.x + 34, w - (ri.x + ri.w) + 10, ri.y + 8, h - (ri.y + ri.h) + 30);
    axes(g, fi, tw, [-m, m], right ? 't (ms), peak = 1' : `t (ms), deepest trough = −1 (at ${rocLeftPeak().t.toFixed(2).replace('-', '−')} ms)`, right ? 'h(t), scaled' : 'x(t), scaled', right ? 3 : 1, 1); curve(g, fi, ts, ys, right ? col.c() : col.b(), 1.8);
  });
} };

/* ---------- ORTHO: a harmonic is measured by multiplying and averaging ---------- */
const sq = (t: number) => (Math.sin(TAU * t / 5) >= 0 ? 1 : -1);
const s200 = (t: number) => Math.sin(TAU * t / 5), s600 = (t: number) => Math.sin(3 * TAU * t / 5);
const mean = (fn: (t: number) => number, n = 20000) => { let s = 0; for (let i = 0; i < n; i++) s += fn(((i + 0.5) * 5) / n); return s / n; };
export const orthoAverages = () => ({ a: mean((t) => sq(t) * s200(t)), b: mean((t) => sq(t) * s600(t)), c: mean((t) => s200(t) * s600(t)), b1: squareCoef(1), b3: squareCoef(3) });
const ortho: QuizFigureDef = { aspect: 1.25, phoneAspect: 0.8, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const P = panels(w, h, 3, 99), av = orthoAverages(), ts = linspace(0, 5, 401);
  const rows: [string, (t: number) => number, (t: number) => number, number, string][] = [
    ['(a) square × 200 Hz sine', sq, s200, av.a, `average ${av.a.toFixed(3)} → 2 × ${av.a.toFixed(3)} = ${(2 * av.a).toFixed(2)} V`],
    ['(b) square × 600 Hz sine', sq, s600, av.b, `average ${av.b.toFixed(3)} → 2 × ${av.b.toFixed(3)} = ${(2 * av.b).toFixed(2)} V`],
    ['(c) 200 Hz sine × 600 Hz sine', s200, s600, av.c, 'average 0: orthogonal'],
  ];
  // the key, on the figure: which line is which in each panel, and what the shading means
  const keys = ['thin: square wave · dashed: 200 Hz sine · thick: their product', 'thin: square wave · dashed: 600 Hz sine · thick: product', 'thin: 200 Hz sine · dashed: 600 Hz sine · thick: product'];
  rows.forEach(([name, u, v, , note], i) => {
    const r = P[i], top = header(g, r, [[`${name}: ${note}`, col.text()], [i === 0 ? `${keys[0]}; blue = above 0, red = below` : keys[i], col.muted()]]);
    const f = frameIn(w, h, r, top, [0, 5], [-1.3, 1.3], 30, i === 2 ? 31 : 16);
    axes(g, f, [0, 5], [-1.3, 1.3], i === 2 ? 't (ms), one 200 Hz period' : '', '', 1, 1);
    const pr = ts.map((t) => u(t) * v(t));
    fillBetween(g, f, ts, pr.map((y) => Math.max(0, y)), 'rgba(90,160,255,.35)'); fillBetween(g, f, ts, pr.map((y) => Math.min(0, y)), 'rgba(255,100,100,.35)');
    curve(g, f, ts, ts.map(u), col.muted(), 1); curve(g, f, ts, ts.map(v), col.muted(), 1, [3, 3]); curve(g, f, ts, pr, col.text(), 2);
  });
} };

/* ---------- SAMP: the fold ---------- */
export const foldCases = () => ({ f3: aliasOf(3, 8), f5: aliasOf(5, 8), f11: aliasOf(11, 8), f78: aliasOf(7.8, 8) });
const fold: QuizFigureDef = { aspect: 2.0, phoneAspect: 1.15, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const r = { x: 0, y: 0, w, h }, c = foldCases();
  const top = header(g, r, [['fs = 8 kHz: every true frequency folds into 0–4 kHz', col.text()], ['3, 5 and 11 kHz all read as 3 kHz · 7.8 kHz reads as 200 Hz', col.e()]]);
  // x starts a little left of 0 so the y axis's 0 tick has room beside the x axis's 0
  const f = frameIn(w, h, r, top + 4, [-0.6, 16], [0, 4.6], 36, 31);
  axes(g, f, [-0.6, 16], [0, 4.6], 'true frequency (kHz)', 'reads as (kHz)', 2, 1);
  shadeX(g, f, 0, 4, 'rgba(110,226,110,.18)');
  const xs = linspace(0, 16, 641); curve(g, f, xs, xs.map((x) => aliasOf(x, 8)), col.a(), 2);
  tline(g, f, [3, c.f3], [11, c.f11], col.e(), 1.2, [5, 4]);
  for (const x of [3, 5, 11]) dot(g, f, [x, aliasOf(x, 8)], col.e(), 4.5);
  dot(g, f, [7.8, c.f78], col.bad(), 4.5);
  // the red dot's own label sits in the gap between the fold's two arms, with a leader down to the dot
  tline(g, f, [7.8, 2.0], [7.8, c.f78 + 0.3], col.bad(), 1);
  withLabelRole('axis', () => text(g, `${7.8} kHz → ${Math.round(c.f78 * 1000)} Hz`, f.X(7.8), f.Y(2.3), col.bad(), 'center', 10));
} };

/* ---------- DTFT: walking the unit circle ---------- */
export function dtftPeak() { let best = 0, om = 0; for (let i = 1; i < 20000; i++) { const o = (i * Math.PI) / 20000, m = cabs(ringDTFT(o)); if (m > best) { best = m; om = o; } } const d = ringDigital(8); return { r: d.r, deg: (d.th * 180) / Math.PI, om, hz: (om * 8000) / TAU, gain: best / cabs(ringDTFT(0)) }; }
const dtft: QuizFigureDef = { aspect: 2.1, phoneAspect: 0.8, maxWidth: 560, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const P = panels(w, h, 2), d = ringDigital(8), pk = dtftPeak();
  // (a) the sampled click ring: the numbers the DTFT adds up
  { const r = P[0], top = header(g, r, [[`(a) click ring sampled at 8 kHz: ${(TAU / d.th).toFixed(1)} samples per cycle`, col.b()], [`dashed: envelope ×${d.r.toFixed(4)} per sample`, col.muted()]]);
    const N = 40, ns = Array.from({ length: N + 1 }, (_, n) => n), xs = ns.map((n) => ringSample(n)), m = Math.max(...xs.map(Math.abs)), C = d.b1 / (d.r * Math.sin(d.th)) / m;
    const f = frameIn(w, h, r, top, [0, N], [-1.15, 1.15], 30, 31);
    axes(g, f, [0, N], [-1.15, 1.15], 'n (samples, 0.125 ms each)', '', 8, 1);
    ns.forEach((n, i) => { const y = xs[i] / m; tline(g, f, [n, 0], [n, y], col.b(), 1.4); dot(g, f, [n, y], col.b(), 2.2); });
    const ne = linspace(0, N, 200); curve(g, f, ne, ne.map((n) => C * d.r ** n), col.muted(), 1, [4, 3]); curve(g, f, ne, ne.map((n) => -C * d.r ** n), col.muted(), 1, [4, 3]); }
  // (b) gain against Ω
  { const r = P[1], top = header(g, r, [[`(b) gain, 1 at Ω = 0: peak ×${pk.gain.toFixed(2)} at ${pk.om.toFixed(3)} rad ≈ ${pk.hz.toFixed(0)} Hz`, col.a()], ['dashed: the mirror repeat past π (fs/2)', col.muted()]]);
    const f = frameIn(w, h, r, top, [0, 2 * Math.PI], [0, 2.2], 30, 31), g0 = cabs(ringDTFT(0));
    axes(g, f, [0, 2 * Math.PI], [0, 2.2], 'Ω (rad/sample); π = 4 kHz', '', Math.PI / 2, 1, (x) => ['0', 'π/2', 'π', '3π/2', '2π'][Math.round(x / (Math.PI / 2))] ?? '');
    const a = linspace(0, Math.PI, 300), b = linspace(Math.PI, 2 * Math.PI, 300);
    curve(g, f, a, a.map((o) => cabs(ringDTFT(o)) / g0), col.a(), 2.2); curve(g, f, b, b.map((o) => cabs(ringDTFT(o)) / g0), col.a(), 1.2, [5, 4]);
    dot(g, f, [pk.om, pk.gain], col.e(), 4); }
} };

/* ---------- WIN: rectangular vs Hann ---------- */
export const windowBins = () => { const r = humDFT(690), hn = humDFT(690, 64, 8000, true); return { rect: [5, 6, 10, 20].map((k) => dB(r[k])), hann: [5, 6, 10, 20].map((k) => dB(hn[k])), r, hn, hum: 690 / 125, floorBin: hn.findIndex((m, b) => b > 6 && b <= 32 && dB(m) < -80) }; };
const windowFig: QuizFigureDef = { aspect: 2.1, phoneAspect: 0.85, maxWidth: 560, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const P = panels(w, h, 2), wb = windowBins();
  [0, 1].forEach((i) => {
    const r = P[i], hann = i === 1, v = hann ? wb.hn : wb.r, k = hann ? wb.hann : wb.rect;
    const top = header(g, r, [[hann ? '(b) Hann taper' : '(a) rectangular block', hann ? col.c() : col.bad()], [`bins 5, 6: ${k[0].toFixed(1)}, ${k[1].toFixed(1)} dB · bin 10: ${k[2].toFixed(0)} dB`, col.muted()]]);
    // headroom above 0 dB for the hum line's label
    const f = frameIn(w, h, r, top, [0, 32], [-80, 12], 40, 31);
    axes(g, f, [0, 32], [-80, 12], 'DFT bin (125 Hz each)', 'dB', 8, 20);
    g.save(); g.fillStyle = hann ? col.c() : col.bad();
    v.forEach((m, b) => { const y = Math.max(-80, dB(m)), x = f.X(b), y0 = f.Y(-80), y1 = f.Y(y), bw = Math.max(1.5, f.sx * 0.55); g.fillRect(x - bw / 2, y1, bw, y0 - y1); });
    g.restore(); tline(g, f, [wb.hum, -80], [wb.hum, 12], col.e(), 1, [3, 3]);
    withLabelRole('axis', () => text(g, `hum: 690 Hz = bin ${wb.hum.toFixed(2)}`, f.X(wb.hum) + 4, f.Y(6), col.e(), 'left', 10));
    if (hann && wb.floorBin > 0) withLabelRole('axis', () => { text(g, `bins ${wb.floorBin}+ are below`, f.X(32) - 2, f.Y(-62), col.muted(), 'right', 9); text(g, '−80 dB: off the scale', f.X(32) - 2, f.Y(-70), col.muted(), 'right', 9); });
    // inset: the 64-sample block and its window, top right inside the plot
    const iw = Math.min(90, (f.box.r - f.box.l) * 0.38), ih = 30, ix = f.box.r - iw - 4, iy = f.Y(0) + 2;
    withLabelRole('axis', () => { text(g, 'inset: the 64 samples', ix + iw, iy + ih + 8, col.muted(), 'right', 9); text(g, hann ? 'yellow: the Hann taper' : 'yellow: the flat window', ix + iw, iy + ih + 18, col.e(), 'right', 9); });
    g.save(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(ix, iy, iw, ih); g.strokeStyle = col.muted(); g.lineWidth = 1; g.beginPath();
    for (let n = 0; n < 64; n++) { const wn = hann ? 0.5 - 0.5 * Math.cos((TAU * n) / 64) : 1, y = Math.cos((TAU * 690 * n) / 8000) * wn, px = ix + (n / 63) * iw, py = iy + ih / 2 - y * (ih / 2 - 2); if (n) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
    g.strokeStyle = col.e(); g.beginPath(); for (let n = 0; n < 64; n++) { const wn = hann ? 0.5 - 0.5 * Math.cos((TAU * n) / 64) : 1, px = ix + (n / 63) * iw, py = iy + ih / 2 - wn * (ih / 2 - 2); if (n) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); g.restore();
  });
} };

/* ---------- FB: skyhook moves the car's poles ---------- */
let fbMemo: ReturnType<typeof fbCompute> | null = null;
export const fbPoles = () => (fbMemo ??= fbCompute());
function fbCompute() {
  const pas = carModes(CAR), gk = skyGains(CAR), sky = carModes(withSky(CAR, gk)), pb = bumpResponse(CAR), sb = skyBump(CAR, gk);
  const peak = (r: { xs: number[][] }) => Math.max(...r.xs.map((x) => Math.abs(x[0]))) * 1000;
  const within = (r: { ts: number[]; xs: number[][] }) => { let t = 0; r.xs.forEach((x, i) => { if (Math.abs(x[0]) > 1e-3) t = r.ts[i]; }); return t; };
  return { pas, sky, gk, pb, sb, peaks: [peak(pb), peak(sb)], settle: [within(pb), within(sb)] };
}
const fbpoles: QuizFigureDef = { aspect: 2.1, phoneAspect: 0.8, maxWidth: 560, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const P = panels(w, h, 2), F = fbPoles();
  { const r = P[0], top = header(g, r, [['○ passive → ● skyhook', col.text()], [`bounce ζ ${F.pas[0].zeta.toFixed(3)} → ${F.sky[0].zeta.toFixed(3)} · pitch ${F.pas[1].zeta.toFixed(3)} → ${F.sky[1].zeta.toFixed(3)}`, col.c()]]);
    const f = frameIn(w, h, r, top, [-9, 0], [0, 12], 38, 31);
    axes(g, f, [-9, 0], [0, 12], 'σ (1/s)', 'ω (rad/s)', 3, 5);
    tline(g, f, [0, 0], [0, 12], col.strong(), 2);
    for (const z of [0.3, 0.5, 0.7]) { const rr = 13, a: [number, number] = [-z * rr, Math.sqrt(1 - z * z) * rr]; g.save(); g.globalAlpha = 0.5; tline(g, f, [0, 0], a, col.muted(), 1, [3, 3]); g.restore();
      const lab: [number, number] = [-z * 11.4, Math.sqrt(1 - z * z) * 11.4]; if (lab[1] <= 11.8 && lab[0] >= -8.8) text(g, `ζ ${z}`, f.X(lab[0]) + 3, f.Y(lab[1]), col.muted(), 'left', 9); }
    F.pas.forEach((m, i) => { const a: [number, number] = [m.s[0], m.s[1]], b: [number, number] = [F.sky[i].s[0], F.sky[i].s[1]]; arrow(g, f, a, b, i ? col.b() : col.a(), 1.4); dot(g, f, a, i ? col.b() : col.a(), 5, true); dot(g, f, b, i ? col.b() : col.a(), 5);
      text(g, i ? 'pitch' : 'bounce', f.X(b[0]), f.Y(b[1]) + 13, i ? col.b() : col.a(), 'center', 9); }); }
  { const r = P[1], top = header(g, r, [[`heave over the 5 cm bump: peak ${F.peaks[0].toFixed(2)} → ${F.peaks[1].toFixed(2)} mm`, col.text()], [`within ±1 mm by ${F.settle[1].toFixed(2)} s (passive ${F.settle[0].toFixed(2)} s)`, col.c()]]);
    const f = frameIn(w, h, r, top, [0, 2], [-6, 10], 38, 31);
    axes(g, f, [0, 2], [-6, 10], 't (s)', 'heave (mm)', 0.5, 5);
    g.save(); g.fillStyle = 'rgba(110,226,110,.14)'; g.fillRect(f.box.l, f.Y(1), f.box.r - f.box.l, f.Y(-1) - f.Y(1)); g.restore();
    curve(g, f, F.pb.ts, F.pb.xs.map((x) => x[0] * 1000), col.muted(), 1.6, [5, 3]); curve(g, f, F.sb.ts, F.sb.xs.map((x) => x[0] * 1000), col.c(), 2.2); }
} };

export const popExpandFigures: Record<string, QuizFigureDef> = { 'pop-roc': roc, 'pop-ortho': ortho, 'pop-fold': fold, 'pop-dtft': dtft, 'pop-window': windowFig, 'pop-fbpoles': fbpoles };
