/**
 * Drawing for the linear-systems scenes: `speaker` (the noise-cancelling earbud) and `house` (two rooms and a
 * thermostat). Models in sceneLsModels.ts; catalogue in scenedefs.ts; dispatched from scene.ts.
 */
import { text, arrow, line, dot, clip, axes, fmt, type Pal, type Rect, type G } from './scenedraw';
import { SPK, SPEAKER, simulateSpeaker, clickVelocity, speakerMag, HOUSE, houseOptimalU, simulateHouse, houseGramian, type HouseSim } from './sceneLsModels';

const has = (ov: string[], ...ids: string[]) => ids.some((i) => ov.includes(i));
const mix = (g: G, r: Rect, color: string, alpha: number) => { g.save(); g.globalAlpha = Math.max(0, Math.min(1, alpha)); g.fillStyle = color; g.fillRect(r.x, r.y, r.w, r.h); g.restore(); };
const cross = (g: G, x: number, y: number, c: string, s = 5) => { line(g, [[x - s, y - s], [x + s, y + s]], c, 2.6); line(g, [[x - s, y + s], [x + s, y - s]], c, 2.6); };

/* ════════════════════════════ speaker ════════════════════════════ */

const PULSE = 20e-6, Q = 1e-4; // a click: a 20 µs voltage pulse of area 0.1 mV·s
const pulse = (t: number, at: number, q = Q) => (t >= at && t < at + PULSE ? q / PULSE : 0);
const tone = (t: number, f = 500, a = 0.25) => a * Math.sin(2 * Math.PI * f * t);
const CONV = [{ at: 0.5e-3, w: 1 }, { at: 2.2e-3, w: -0.7 }, { at: 3.9e-3, w: 0.55 }];
export const SPK_SIM_T = (ov: string[]) => (ov.includes('anc') ? 0.04 : 0.008);
export const SPK_ANIM_T = (ov: string[]) => (ov.includes('anc') ? 8 : 6);
export const speakerRest = (ov: string[]) => (ov.includes('anc') ? 5.5 : ov.includes('tone') ? 5.6 : ov.includes('conv') ? 4.2 : ov.includes('split') ? 4 : 1.6);

type SpkSim = ReturnType<typeof simulateSpeaker> & { parts?: Float64Array[]; kind: string; crit: boolean };
const spkMemo = new Map<string, SpkSim>();
function spkSim(ov: string[]): SpkSim {
  const kind = ov.includes('anc') ? 'anc' : ov.includes('conv') ? 'conv' : ov.includes('split') ? 'split' : ov.includes('tone') ? 'tone' : 'click', crit = ov.includes('critical');
  const key = kind + (crit ? '|c' : ''); let s = spkMemo.get(key); if (s) return s;
  const T = SPK_SIM_T(ov), R = crit ? SPK.crit : SPK.Rtot;
  let V: (t: number) => number = (t) => pulse(t, 0.3e-3), parts: Float64Array[] | undefined;
  if (kind === 'tone') V = (t) => tone(t);
  if (kind === 'split') { V = (t) => tone(t) + pulse(t, 2e-3); parts = [simulateSpeaker((t) => tone(t), T, { Rtot: R }).x, simulateSpeaker((t) => pulse(t, 2e-3), T, { Rtot: R }).x]; }
  if (kind === 'conv') { V = (t) => CONV.reduce((a, c) => a + c.w * pulse(t, c.at), 0); parts = CONV.map((c) => simulateSpeaker((t) => c.w * pulse(t, c.at), T, { Rtot: R }).x); }
  if (kind === 'anc') V = () => 0;
  s = { ...simulateSpeaker(V, T, { Rtot: R, dt: kind === 'anc' ? 1e-5 : 2e-6 }), parts, kind, crit }; spkMemo.set(key, s); return s;
}
const spkAt = (S: SpkSim, ts: number) => { const i = Math.max(0, Math.min(S.n - 1, Math.round(ts / S.dt))); return { x: S.x[i], v: S.v[i], u: S.u[i], i }; };
const peak = (a: ArrayLike<number>) => { let m = 1e-9; for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.abs(a[i])); return m; };
/** ANC (schematic): noise at the ear and the residual as the adaptive filter converges. */
const ancD = (t: number) => Math.sin(2 * Math.PI * 120 * t) + 0.6 * Math.sin(2 * Math.PI * 260 * t + 0.8);
const ancE = (t: number) => ancD(t) * Math.exp(-t / 0.008);

export function drawSpeakerMain(g: G, r: Rect, P: Pal, ov: string[], tAnim: number, small: boolean) {
  const S = spkSim(ov), T = SPK_SIM_T(ov), ts = (tAnim / SPK_ANIM_T(ov)) * T, st = spkAt(S, ts), px = small ? 9.5 : 10.5;
  const w = r.w, hh = r.h, cy = r.y + hh * 0.5, xm = peak(S.x) || 1;
  const disp = S.kind === 'anc' ? -ancD(ts) * 0.6 * (1 - Math.exp(-ts / 0.008)) : st.x / xm, dx = disp * Math.min(10, w * 0.025);
  // voltage source
  const sx = r.x + Math.max(22, w * 0.07), sr = 11;
  g.save(); g.strokeStyle = P.text; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, cy, sr, 0, 7); g.stroke(); g.restore();
  line(g, Array.from({ length: 13 }, (_, i) => [sx - 6 + i, cy - 4 * Math.sin((i / 12) * 2 * Math.PI)] as [number, number]), P.text, 1.3);
  text(g, 'V(t)', sx + sr + 5, cy + 4, P.text, { align: 'left', px, wt: 700 }); // beside the source, clear of the wires above and below
  // magnet + voice coil + cone + suspension
  const mx = r.x + w * 0.27, mw = Math.max(18, w * 0.05), mh = hh * 0.46;
  g.fillStyle = P.strong; g.fillRect(mx - mw, cy - mh / 2, mw, mh); g.fillStyle = P.elev; g.fillRect(mx - mw * 0.55, cy - mh * 0.12, mw * 0.55, mh * 0.24);
  const coilX = mx + 3 + dx, coilH = hh * 0.2;
  g.fillStyle = P.s1; g.fillRect(coilX, cy - coilH / 2, 7, coilH);
  const coneL = w * 0.13, rimX = coilX + 7 + coneL, rimH = hh * 0.36;
  line(g, [[coilX + 7, cy - coilH / 2], [rimX, cy - rimH], [rimX, cy + rimH], [coilX + 7, cy + coilH / 2]], P.s0, 2.6);
  const frameX = rimX - dx + 4;
  for (const sg of [-1, 1]) { const y0 = cy + sg * rimH; const zz: [number, number][] = [[rimX, y0]]; for (let i = 1; i <= 4; i++) zz.push([rimX + ((frameX + 12 - rimX) * i) / 5, y0 + sg * (i % 2 ? 5 : 0)]); zz.push([frameX + 12, y0]); line(g, zz, P.s2, 1.6); line(g, [[frameX + 12, y0 - 9], [frameX + 12, y0 + 9]], P.strong, 3); }
  // wires from the source to the coil
  const wy1 = cy - coilH / 2 - 6, wy2 = cy + coilH / 2 + 6;
  if (ov.includes('coil')) {
    const a = sx + sr + 6, z1 = a + (mx - mw - a) * 0.42;
    line(g, [[sx, cy - sr], [sx, wy1 - 12], [a, wy1 - 12]], P.text, 1.3);
    const zz: [number, number][] = [[a, wy1 - 12]]; for (let i = 1; i <= 6; i++) zz.push([a + ((z1 - a) * i) / 7, wy1 - 12 + (i % 2 ? -4 : 4)]); zz.push([z1, wy1 - 12]); line(g, zz, P.warn, 1.6);
    const z2 = z1 + 6, z3 = mx - mw - 4; g.save(); g.strokeStyle = P.warn; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i < 4; i++) g.arc(z2 + ((z3 - z2) * (i + 0.5)) / 4, wy1 - 12, (z3 - z2) / 8, Math.PI, 0); g.stroke(); g.restore();
    line(g, [[z3, wy1 - 12], [coilX + 3, wy1 - 12], [coilX + 3, cy - coilH / 2]], P.text, 1.3);
    line(g, [[sx, cy + sr], [sx, wy2 + 12], [coilX + 3, wy2 + 12], [coilX + 3, cy + coilH / 2]], P.text, 1.3);
    text(g, 'Re', (a + z1) / 2, wy1 - 20, P.warn, { align: 'center', px, wt: 700 }); text(g, 'Le', (z2 + z3) / 2, wy1 - 20, P.warn, { align: 'center', px, wt: 700 });
    text(g, 'coil pole −Re/Le ≈ −187,000 rad/s', r.x + 4, r.y + hh - 4, P.warn, { px: px - 0.5, wt: 700 });
  } else {
    line(g, [[sx, cy - sr], [sx, wy1 - 12], [coilX + 3, wy1 - 12], [coilX + 3, cy - coilH / 2]], P.text, 1.3);
    line(g, [[sx, cy + sr], [sx, wy2 + 12], [coilX + 3, wy2 + 12], [coilX + 3, cy + coilH / 2]], P.text, 1.3);
  }
  // ear canal + eardrum, pressure shading follows x (sealed volume)
  const ex0 = frameX + 16, ex1 = r.x + w - 14, eh = hh * 0.22;
  const canal: Rect = { x: ex0, y: cy - eh, w: ex1 - ex0, h: 2 * eh };
  mix(g, canal, disp >= 0 ? P.bad : P.s0, Math.abs(disp) * 0.45);
  line(g, [[ex0, cy - eh], [ex1, cy - eh]], P.strong, 1.6); line(g, [[ex0, cy + eh], [ex1, cy + eh]], P.strong, 1.6);
  g.save(); g.strokeStyle = P.muted; g.lineWidth = 2; g.beginPath(); g.ellipse(ex1, cy, 4, eh, 0, 0, 7); g.stroke(); g.restore();
  // labels
  text(g, 'magnet + coil', mx - mw / 2, cy - mh / 2 - 5, P.muted, { align: 'center', px, wt: 600, optional: true });
  text(g, 'diaphragm', rimX, cy + rimH + 14, P.s0, { align: 'center', px, wt: 700, optional: true });
  text(g, 'ear canal: p ∝ x', (ex0 + ex1) / 2, cy - eh - 6, P.muted, { align: 'center', px, wt: 600, optional: true });
  // forces
  if (ov.includes('forces')) {
    const k = SPK.k, R = S.crit ? SPK.crit : SPK.Rtot, xs = st.x * 1e-6, vs = st.v * 1e-3, Fc = (SPEAKER.Bl / SPEAKER.Re) * st.u, Fk = -k * xs, Fr = -R * vs;
    const fm = Math.max(1e-9, Math.abs(Fk), Math.abs(Fr), Math.abs(Fc)), L = Math.min(46, w * 0.12), ay = cy;
    const fx = rimX + 4;
    if (Math.abs(Fk) > fm * 0.04) arrow(g, fx, ay - 8, fx + (Fk / fm) * L, ay - 8, P.s2, 2.4);
    if (Math.abs(Fr) > fm * 0.04) arrow(g, fx, ay + 8, fx + (Fr / fm) * L, ay + 8, P.s3, 2.4);
    if (Math.abs(Fc) > fm * 0.04) arrow(g, coilX + 3, cy, coilX + 3 + Math.sign(Fc) * L, cy, P.s1, 2.4);
    text(g, 'spring −x/Cms', r.x + w * 0.58, r.y + 12, P.s2, { align: 'center', px, wt: 700 });
    text(g, 'damping −R·ẋ', r.x + w * 0.58, r.y + 12 + px + 3, P.s3, { align: 'center', px, wt: 700, optional: true });
    if (S.u.some((v) => v !== 0)) text(g, 'coil force Bl·i', r.x + w * 0.3, r.y + 12, P.s1, { align: 'center', px, wt: 700, optional: true });
  }
  if (ov.includes('anc')) {
    g.save(); g.strokeStyle = P.strong; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.ellipse(mx + 4, cy, w * 0.2, hh * 0.46, 0, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.restore();
    dot(g, mx + 4 - w * 0.2, cy - hh * 0.18, 4.5, P.ok, P.panel); text(g, 'ref mic', mx + 4 - w * 0.2 + 7, cy - hh * 0.18 - 6, P.ok, { px, wt: 700 });
    dot(g, ex0 + 10, cy + eh * 0.5, 4.5, P.warn, P.panel); text(g, 'error mic', ex0 + 18, cy + eh + 13, P.warn, { px, wt: 700 });
    for (let i = 0; i < 3; i++) { const rr = 8 + i * 7 + ((ts * 2000) % 7); g.save(); g.strokeStyle = P.bad; g.globalAlpha = 0.65 - i * 0.18; g.lineWidth = 1.5; g.beginPath(); g.arc(r.x + 8, r.y + 10, rr, 0, Math.PI / 2); g.stroke(); g.restore(); }
    text(g, 'noise', r.x + 22, r.y + 12, P.bad, { px, wt: 700 });
  }
  const clockTxt = S.kind === 'anc' ? `t = ${fmt(ts * 1e3, 1)} ms` : `t = ${fmt(ts * 1e3, 2)} ms (slow motion)`;
  text(g, clockTxt, r.x + w - 6, r.y + hh - 4, P.muted, { align: 'right', px: px - 0.5, wt: 600, optional: true });
}

export function drawSpeakerTrace(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = spkSim(ov), T = SPK_SIM_T(ov), ts = (tAnim / SPK_ANIM_T(ov)) * T, ms = T * 1e3;
  if (S.kind === 'anc') {
    const { X, Y } = axes(g, r, P, [0, ms], [-1.8, 1.8], 't (ms)', 'pressure at the ear', { pad: [30, 14, 8, 24], xTicks: [0, 10, 20, 30, 40] });
    const path = (f: (t: number) => number, to: number) => { const q: [number, number][] = []; for (let t = 0; t <= to; t += T / 400) q.push([X(t * 1e3), Y(f(t))]); return q; };
    line(g, path(ancD, T), P.bad, 1.4, [4, 3], 0.7); line(g, path(ancE, ts), P.s0, 2.4);
    text(g, 'red: noise alone', r.x + r.w - 8, r.y + 12, P.bad, { align: 'right', px: 10, wt: 700, optional: true });
    text(g, 'blue: what is left (FxLMS adapting)', r.x + r.w - 8, r.y + r.h - 30, P.s0, { align: 'right', px: 10, wt: 700, optional: true });
    return;
  }
  const xm = Math.max(peak(S.x), ...(S.parts ?? []).map(peak)) * 1.2;
  const { X, Y } = axes(g, r, P, [0, ms], [-xm, xm], 't (ms)', 'x (µm)', { pad: [30, 14, 8, 24], xTicks: [0, 2, 4, 6, 8] });
  const path = (a: Float64Array, to: number) => { const q: [number, number][] = []; const step = Math.max(1, Math.floor(S.n / 500)); for (let i = 0; i * S.dt <= to && i < S.n; i += step) q.push([X(i * S.dt * 1e3), Y(a[i])]); return q; };
  g.save(); clip(g, { x: r.x + 28, y: r.y, w: r.w - 34, h: r.h });
  if (S.kind === 'tone') { const q: [number, number][] = []; for (let i = 0; i < S.n; i += 8) q.push([X(i * S.dt * 1e3), Y((S.u[i] / 0.25) * xm * 0.4)]); line(g, q, P.muted, 1.2, [3, 3], 0.8); }
  if (S.parts) S.parts.forEach((p, k) => line(g, path(p, ts), k ? P.s2 : P.s1, 1.4, [4, 3], 0.95));
  if (S.kind === 'conv') for (const c of CONV) { const x0 = X(c.at * 1e3); arrow(g, x0, Y(0), x0, Y(c.w * xm * 0.7), P.warn, 1.8); }
  line(g, path(S.x, T), P.s0, 1.6, [], 0.15); line(g, path(S.x, ts), P.s0, 2.4);
  if (ov.includes('sampler')) { const Ts = 1 / 8000; for (let k = 0; k * Ts <= ts; k++) { const i = Math.round((k * Ts) / S.dt); if (i >= S.n) break; line(g, [[X(k * Ts * 1e3), Y(0)], [X(k * Ts * 1e3), Y(S.x[i])]], P.warn, 1.2); dot(g, X(k * Ts * 1e3), Y(S.x[i]), 2.2, P.warn); } }
  const c = spkAt(S, ts); dot(g, X(ts * 1e3), Y(c.x), 4, P.s0, P.panel);
  g.restore();
  const lab = S.kind === 'tone' ? ['dashed: 500 Hz tone in', 'blue: x(t), same 500 Hz'] : S.kind === 'split' ? ['dashed: tone alone, click alone', 'blue: both together = their sum'] : S.kind === 'conv' ? ['arrows: three clicks', 'blue: sum of three shifted rings'] : ov.includes('sampler') ? ['stems: samples at 8 kHz', S.crit ? 'blue: critically damped h(t)' : 'blue: h(t), the ring'] : [S.crit ? 'critically damped: no ring' : 'h(t): a click rings at ~690 Hz', ''];
  text(g, lab[0], r.x + r.w - 8, r.y + 12, P.muted, { align: 'right', px: 10, wt: 700, optional: true });
  if (lab[1]) text(g, lab[1], r.x + r.w - 8, r.y + r.h - 30, P.s0, { align: 'right', px: 10, wt: 700, optional: true });
}

export function drawSpeakerPhase(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = spkSim(ov.filter((o) => o !== 'anc')), T = SPK_SIM_T([]), ts = (tAnim / SPK_ANIM_T([])) * T, xm = peak(S.x) * 1.15, vm = peak(S.v) * 1.15;
  const side = Math.min(r.w - 8, r.h - 8), sq: Rect = { x: r.x + r.w - side - 4, y: r.y + 4, w: side, h: side };
  const X = (x: number) => sq.x + sq.w / 2 + (x / xm) * (sq.w / 2 - 8), Y = (v: number) => sq.y + sq.h / 2 - (v / vm) * (sq.h / 2 - 8);
  line(g, [[sq.x, Y(0)], [sq.x + sq.w, Y(0)]], P.muted, 1, [], 0.7); line(g, [[X(0), sq.y], [X(0), sq.y + sq.h]], P.muted, 1, [], 0.7);
  text(g, 'x (µm)', sq.x + sq.w - 3, Y(0) - 4, P.muted, { align: 'right', px: 9.5, wt: 600 }); text(g, 'ẋ (mm/s)', X(0) + 4, sq.y + 10, P.muted, { px: 9.5, wt: 600 });
  if (S.crit) { const k = -SPK.ws * 1e-3; line(g, [[X(-xm), Y(k * -xm)], [X(xm), Y(k * xm)]], P.s1, 1.6, [5, 4]); text(g, 'the only eigen-direction', sq.x + 4, sq.y + sq.h - 6, P.s1, { px: 9.5, wt: 700, optional: true }); }
  const q: [number, number][] = [], qq: [number, number][] = []; for (let i = 0; i < S.n; i += 4) { const p: [number, number] = [X(S.x[i]), Y(S.v[i])]; qq.push(p); if (i * S.dt <= ts) q.push(p); }
  g.save(); clip(g, sq); line(g, qq, P.s0, 1.4, [], 0.16); line(g, q, P.s0, 2.2); g.restore();
  const c = spkAt(S, ts); dot(g, X(c.x), Y(c.v), 4.5, P.s0, P.panel);
  if (r.w - side > 70) { text(g, 'state', r.x + 4, r.y + 22, P.muted, { px: 10 }); text(g, `x = ${fmt(c.x, 1)} µm`, r.x + 4, r.y + 36, P.s0, { px: 11, wt: 700 }); text(g, `ẋ = ${fmt(c.v, 0)} mm/s`, r.x + 4, r.y + 52, P.s0, { px: 11, wt: 700 }); }
  text(g, S.crit ? 'falls in without circling' : 'spirals in: complex λ', sq.x + 4, sq.y + 12, P.s0, { px: 9.5, wt: 700, optional: true });
}

export function drawSpeakerPoles(g: G, r: Rect, P: Pal, ov: string[]) {
  const crit = ov.includes('critical'), xr: [number, number] = [-6.2, 1], yr: [number, number] = [-5.6, 5.6];
  const { X, Y } = axes(g, r, P, xr, yr, 'Re s (krad/s)', 'Im s', { pad: [28, 14, 8, 14], noYZero: true });
  g.save(); g.globalAlpha = 0.07; g.fillStyle = P.ok; g.fillRect(X(xr[0]), Y(yr[1]), X(0) - X(xr[0]), Y(yr[0]) - Y(yr[1])); g.restore();
  line(g, [[X(0), Y(yr[0])], [X(0), Y(yr[1])]], P.strong, 1.5); line(g, [[X(xr[0]), Y(0)], [X(xr[1]), Y(0)]], P.muted, 1, [], 0.7);
  const ws = SPK.ws / 1000; g.save(); g.strokeStyle = P.muted; g.setLineDash([3, 3]); g.beginPath(); g.ellipse(X(0), Y(0), X(ws) - X(0), Y(0) - Y(ws), 0, Math.PI / 2, Math.PI * 1.5); g.stroke(); g.restore();
  if (crit) { cross(g, X(-ws), Y(0), P.s1); text(g, '−ωs, twice', X(-ws), Y(0) - 12, P.s1, { align: 'center', px: 10, wt: 700 }); }
  else for (const sg of [1, -1]) { cross(g, X(-SPK.sigma / 1000), Y((sg * SPK.wd) / 1000), P.s1); }
  if (!crit) { text(g, '−1.27 ± j4.32', X(-SPK.sigma / 1000) - 9, Y(SPK.wd / 1000) + 4, P.s1, { align: 'right', px: 10, wt: 700 }); text(g, `ζ = ${fmt(SPK.zeta, 2)}`, X(-SPK.sigma / 1000) - 9, Y(-SPK.wd / 1000) + 4, P.s1, { align: 'right', px: 10, wt: 700, optional: true }); }
  arrow(g, X(-3.2), Y(-2.6), X(xr[0]) + 2, Y(-2.6), P.warn, 1.6, [3, 3]); text(g, 'coil pole at −187 →', X(xr[0]) + 4, Y(-2.6) - 6, P.warn, { px: 9.5, wt: 700, optional: true });
  text(g, 'dashed: |s| = ωs = 4.5 krad/s', r.x + r.w - 6, r.y + 10, P.muted, { align: 'right', px: 9.5, optional: true });
}

export function drawSpeakerSpectrum(g: G, r: Rect, P: Pal, ov: string[]) {
  if (ov.includes('dft')) {
    const N = 64, fsmp = 8000, S = simulateSpeaker((t) => pulse(t, 0), N / fsmp, { dt: 1e-6 }), h: number[] = [];
    for (let n = 0; n < N; n++) h.push(S.x[Math.round(n / fsmp / S.dt)] ?? 0);
    const mag = (k: number) => { let re = 0, im = 0; for (let n = 0; n < N; n++) { re += h[n] * Math.cos((2 * Math.PI * k * n) / N); im -= h[n] * Math.sin((2 * Math.PI * k * n) / N); } return Math.hypot(re, im); };
    const ks = Array.from({ length: N / 2 + 1 }, (_, k) => mag(k)), mx = Math.max(...ks) * 1.15;
    const { X, Y } = axes(g, r, P, [0, 4], [0, mx], 'f (kHz)', '|X[k]|', { pad: [30, 14, 8, 24], xTicks: [0, 1, 2, 3] /* no 4: the axis name sits there */ });
    ks.forEach((v, k) => { const f = (k * fsmp) / N / 1000; line(g, [[X(f), Y(0)], [X(f), Y(v)]], P.warn, 1.4); dot(g, X(f), Y(v), 2.2, P.warn); });
    text(g, 'N = 64 at 8 kHz: a bin every 125 Hz', r.x + r.w - 6, r.y + 12, P.warn, { align: 'right', px: 9.5, wt: 700, optional: true });
    return;
  }
  const lx: [number, number] = [2, 4], L10 = (f: number) => Math.log10(f);
  if (ov.includes('series')) {
    const f0 = 200, { X, Y } = axes(g, r, P, lx, [0, 1.6], 'f (Hz, log)', 'amplitude', { pad: [30, 14, 8, 24] });
    for (const f of [100, 1000, 10000]) text(g, f >= 1000 ? `${f / 1000}k` : String(f), X(L10(f)), r.y + r.h - 12, P.muted, { align: 'center', px: 9, bg: P.panel });
    for (let n = 1; n * f0 <= 10000; n += 2) { const a = 4 / (n * Math.PI), o = a * speakerMag(n * f0); line(g, [[X(L10(n * f0)) - 2, Y(0)], [X(L10(n * f0)) - 2, Y(a)]], P.muted, 1.6); line(g, [[X(L10(n * f0)) + 2, Y(0)], [X(L10(n * f0)) + 2, Y(o)]], P.s0, 2); }
    text(g, 'grey: 200 Hz buzz harmonics in', r.x + r.w - 6, r.y + 12, P.muted, { align: 'right', px: 9.5, wt: 700, optional: true });
    text(g, 'blue: each scaled by |H|', r.x + r.w - 6, r.y + 24, P.s0, { align: 'right', px: 9.5, wt: 700, optional: true });
    return;
  }
  const { X, Y } = axes(g, r, P, lx, [-40, 12], 'f (Hz, log)', '|H| (dB re DC)', { pad: [30, 14, 8, 24] });
  for (const f of [100, 1000, 10000]) text(g, f >= 1000 ? `${f / 1000}k` : String(f), X(L10(f)), r.y + r.h - 12, P.muted, { align: 'center', px: 9, bg: P.panel });
  const q: [number, number][] = []; for (let u = 2; u <= 4.0001; u += 0.01) q.push([X(u), Y(20 * Math.log10(speakerMag(10 ** u)))]);
  if (ov.includes('critical')) { const qc: [number, number][] = []; for (let u = 2; u <= 4.0001; u += 0.01) qc.push([X(u), Y(20 * Math.log10(speakerMag(10 ** u, SPK.crit)))]); line(g, qc, P.s1, 1.6, [4, 3]); }
  line(g, q, P.s0, 2.4); line(g, [[X(L10(SPK.fs)), Y(-40)], [X(L10(SPK.fs)), Y(12)]], P.s1, 1, [3, 3], 0.8);
  text(g, 'fs ≈ 717 Hz', X(L10(SPK.fs)) + 4, r.y + 24, P.s1, { px: 10, wt: 700 });
  text(g, '−40 dB/decade', X(3.6), Y(-28), P.muted, { align: 'center', px: 9.5, optional: true, bg: P.panel });
}

export function drawSpeakerZ(g: G, r: Rect, P: Pal) {
  const side = Math.min(r.w - 4, r.h - 4), cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 2, R = side / 2 - 14, T = 1 / 8000;
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.globalAlpha = 0.06; g.fillStyle = P.ok; g.fill(); g.restore();
  line(g, [[cx - R - 8, cy], [cx + R + 8, cy]], P.muted, 1, [], 0.7); line(g, [[cx, cy - R - 8], [cx, cy + R + 8]], P.muted, 1, [], 0.7);
  const rad = Math.exp(-SPK.sigma * T), om = SPK.wd * T;
  for (const sg of [1, -1]) cross(g, cx + R * rad * Math.cos(om), cy - sg * R * rad * Math.sin(om), P.s0);
  text(g, `|z| = e^(−σT) = ${rad.toFixed(2)}, angle ωd·T = ${(om * 180 / Math.PI).toFixed(0)}°`, cx, r.y + r.h - 3, P.s0, { align: 'center', px: 9.5, wt: 700 });
  text(g, 'z = e^(pT), T = 1/8 kHz', cx, r.y + 11, P.muted, { align: 'center', px: 9.5 });
}

/* ════════════════════════════ house ════════════════════════════ */

const HOUSE_ANIM = 8;
const OPT_TARGET: [number, number] = [10, 7];
export const houseAnimT = () => HOUSE_ANIM;
export const houseRest = (ov: string[]) => (ov.includes('optimal') ? 6 : ov.includes('heat') || ov.includes('both') ? 2.6 : 1.2);
const houseMemo = new Map<string, HouseSim & { kind: string }>();
function houseScenario(ov: string[]) {
  const kind = ov.includes('optimal') ? 'optimal' : ov.includes('both') ? 'both' : ov.includes('heat') ? 'heat' : 'free';
  let s = houseMemo.get(kind); if (s) return s;
  const P = HOUSE.P;
  if (kind === 'optimal') { const u = houseOptimalU([0, 0], OPT_TARGET, HOUSE.Tf); s = { ...simulateHouse([0, 0], (t) => [u(t), 0], HOUSE.Tf, 0.005), kind }; }
  else if (kind === 'both') s = { ...simulateHouse([8, 2], () => [P / 2, P / 2], 12), kind };
  else if (kind === 'heat') s = { ...simulateHouse([0, 0], () => [P, 0], 12), kind };
  else s = { ...simulateHouse([12, 2], () => [0, 0], 12), kind };
  houseMemo.set(kind, s); return s;
}
const hAt = (S: HouseSim, th: number) => { const i = Math.max(0, Math.min(S.n - 1, Math.round(th / S.dt))); return { a: S.x1[i], b: S.x2[i], u1: S.u1[i], u2: S.u2[i], i }; };

export function drawHouseMain(g: G, r: Rect, P: Pal, ov: string[], tAnim: number, small: boolean) {
  const S = houseScenario(ov), th = (tAnim / HOUSE_ANIM) * S.T, st = hAt(S, th), px = small ? 9.5 : 10.5, out = HOUSE.outdoor;
  const w = r.w, hh = r.h, gx0 = r.x + Math.max(30, w * 0.12), gx1 = r.x + w - Math.max(30, w * 0.12), base = r.y + hh - 16, roofH = hh * 0.2, top = r.y + roofH + 10, mid = (gx0 + gx1) / 2;
  const room1: Rect = { x: gx0, y: top, w: mid - gx0, h: base - top }, room2: Rect = { x: mid, y: top, w: gx1 - mid, h: base - top };
  for (const [rm, T] of [[room1, st.a], [room2, st.b]] as [Rect, number][]) { mix(g, rm, P.s0, 0.22 * Math.max(0, 1 - T / 12)); mix(g, rm, P.bad, 0.5 * Math.min(1, Math.max(0, T) / 16)); }
  line(g, [[gx0, base], [gx0, top], [mid, r.y + 8], [gx1, top], [gx1, base], [gx0, base]], P.strong, 2.4);
  line(g, [[gx0, top], [gx1, top]], P.strong, 1.6);
  // shared wall with a door gap
  line(g, [[mid, top], [mid, base - (base - top) * 0.45]], P.strong, 2.4);
  text(g, `T₁ = ${fmt(out + st.a, 1)} °C`, room1.x + room1.w / 2, top + 16, P.text, { align: 'center', px: px + 1, wt: 800 });
  text(g, `T₂ = ${fmt(out + st.b, 1)} °C`, room2.x + room2.w / 2, top + 16, P.text, { align: 'center', px: px + 1, wt: 800 });
  text(g, `outside ${out} °C`, r.x + 4, r.y + 12, P.s0, { px, wt: 700 });
  text(g, `t = ${fmt(th, 1)} h`, r.x + w - 4, r.y + 12, P.muted, { align: 'right', px, wt: 600 });
  // heaters
  const heater = (rm: Rect, pw: number, label: string) => { const hx = rm.x + 10, hy = base - 24, on = pw > 1; g.fillStyle = on ? P.warn : P.elev; g.fillRect(hx, hy, 26, 16); g.strokeStyle = P.strong; g.lineWidth = 1; g.strokeRect(hx, hy, 26, 16); for (let i = 1; i < 4; i++) line(g, [[hx + i * 6.5, hy + 2], [hx + i * 6.5, hy + 14]], P.panel, 1); text(g, label, hx + 30, hy + 12, on ? P.warn : P.muted, { px: px - 0.5, wt: 700, optional: true }); };
  if (S.kind !== 'free') { heater(room1, st.u1, `${fmt(st.u1 / 1000, 2)} kW`); if (S.kind === 'both') heater(room2, st.u2, `${fmt(st.u2 / 1000, 2)} kW`); }
  // thermostat
  if (ov.includes('thermo') || ov.includes('avg')) {
    const avg = ov.includes('avg'), tx = avg ? mid : gx0, ty = top + (base - top) * 0.5;
    g.fillStyle = P.panel; g.strokeStyle = P.ok; g.lineWidth = 2; g.beginPath(); if (typeof g.roundRect === 'function') g.roundRect(tx - 9, ty - 9, 18, 18, 4); else g.rect(tx - 9, ty - 9, 18, 18); g.fill(); g.stroke();
    text(g, avg ? `reads ½(T₁+T₂) = ${fmt(out + (st.a + st.b) / 2, 1)} °C` : `reads T₁ = ${fmt(out + st.a, 1)} °C`, avg ? mid : room1.x + room1.w / 2, ty + 24, P.ok, { align: 'center', px: px - 0.5, wt: 700 });
  }
  // heat flows
  if (ov.includes('flows')) {
    const q = st.a - st.b, L = Math.min(34, w * 0.08), ay = base - (base - top) * 0.25;
    if (Math.abs(q) > 0.05) arrow(g, mid - (Math.sign(q) * L) / 2, ay, mid + (Math.sign(q) * L) / 2 * Math.min(1, Math.abs(q) / 4 + 0.3), ay, P.bad, 2.6);
    for (const [x0, T, sgn] of [[gx0, st.a, -1], [gx1, st.b, 1]] as [number, number, number][]) if (T > 0.3) arrow(g, x0, ay - 16, x0 + sgn * Math.min(26, 6 + T * 1.4), ay - 16, P.s0, 2.2);
    text(g, 'wall: (T₁ − T₂)·1/h', mid, base + 12, P.bad, { align: 'center', px: px - 0.5, wt: 700, optional: true });
  }
}

export function drawHouseTrace(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = houseScenario(ov), th = (tAnim / HOUSE_ANIM) * S.T, out = HOUSE.outdoor;
  let hi = 4; for (let i = 0; i < S.n; i += 5) hi = Math.max(hi, S.x1[i], S.x2[i]);
  const lo = ov.includes('modes') ? -Math.max(2, hi * 0.4) : 0, step = S.T <= 3 ? 1 : 3;
  const { X, Y } = axes(g, r, P, [0, S.T], [out + lo, out + hi * 1.12], 't (h)', '°C', { pad: [30, 14, 8, 24], xTicks: Array.from({ length: Math.floor(S.T / step) + 1 }, (_, i) => i * step) });
  const path = (f: (i: number) => number, to: number) => { const q: [number, number][] = []; for (let i = 0; i * S.dt <= to && i < S.n; i += 3) q.push([X(i * S.dt), Y(out + f(i))]); return q; };
  g.save(); clip(g, { x: r.x + 28, y: r.y, w: r.w - 34, h: r.h });
  line(g, path((i) => S.x1[i], S.T), P.s1, 1.4, [], 0.18); line(g, path((i) => S.x2[i], S.T), P.s2, 1.4, [], 0.18);
  if (ov.includes('modes')) { line(g, path((i) => (S.x1[i] + S.x2[i]) / 2, th), P.s3, 1.6, [5, 3]); line(g, path((i) => (S.x1[i] - S.x2[i]) / 2, th), P.muted, 1.6, [2, 3]); }
  line(g, path((i) => S.x1[i], th), P.s1, 2.4); line(g, path((i) => S.x2[i], th), P.s2, 2.4);
  if (S.kind === 'optimal') for (const [v, c] of [[OPT_TARGET[0], P.s1], [OPT_TARGET[1], P.s2]] as [number, string][]) { g.save(); g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(X(S.T) - 3, Y(out + v), 5, 0, 7); g.stroke(); g.restore(); }
  g.restore();
  // end labels: T₂ goes under its curve unless that runs into the time axis, then it stacks above T₁
  const y1 = Y(out + S.x1[S.n - 1]) - 4; let y2 = Y(out + S.x2[S.n - 1]) + 12; if (y2 > Y(out + lo) - 4) y2 = Math.min(y1, Y(out + S.x2[S.n - 1]) - 4) - 12;
  text(g, 'T₁', r.x + r.w - 10, y1, P.s1, { align: 'right', px: 10, wt: 800 });
  text(g, 'T₂', r.x + r.w - 10, y2, P.s2, { align: 'right', px: 10, wt: 800 });
  if (ov.includes('modes')) text(g, 'dashed: average and half-difference (above 5 °C)', r.x + 34, r.y + 12, P.s3, { px: 9.5, wt: 700, optional: true });
  if (S.kind === 'optimal') text(g, 'circles: illustrative 3 h target', r.x + 34, r.y + 12, P.muted, { px: 9.5, wt: 700, optional: true });
}

export function drawHousePhase(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = houseScenario(ov), th = (tAnim / HOUSE_ANIM) * S.T, m = 16;
  const side = Math.min(r.w - 8, r.h - 8), sq: Rect = { x: r.x + r.w - side - 4, y: r.y + 4, w: side, h: side };
  const lo = -4, X = (a: number) => sq.x + 6 + ((a - lo) / (m - lo)) * (sq.w - 12), Y = (b: number) => sq.y + sq.h - 6 - ((b - lo) / (m - lo)) * (sq.h - 12);
  line(g, [[X(lo), Y(0)], [X(m), Y(0)]], P.muted, 1, [], 0.7); line(g, [[X(0), Y(lo)], [X(0), Y(m)]], P.muted, 1, [], 0.7);
  text(g, 'x₁ (K)', sq.x + sq.w - 3, Y(0) + 12, P.muted, { align: 'right', px: 9.5, wt: 600 }); text(g, 'x₂', X(0) + 4, sq.y + 10, P.muted, { px: 9.5, wt: 600 });
  g.save(); clip(g, sq);
  if (ov.includes('flow')) for (let a = lo + 1; a <= m; a += 3) for (let b = lo + 1; b <= m; b += 3) { const da = -1.2 * a + b, db = a - 1.2 * b, n = Math.hypot(da, db) || 1, L = Math.min(9, 2 + n * 0.5); arrow(g, X(a), Y(b), X(a) + (da / n) * L, Y(b) - (db / n) * L, P.muted, 1.1); }
  if (ov.includes('modes') || ov.includes('flow')) { line(g, [[X(lo), Y(lo)], [X(m), Y(m)]], P.s3, 1.8, [5, 4]); line(g, [[X(-4), Y(4)], [X(4), Y(-4)]], P.muted, 1.8, [2, 3]); }
  if (ov.includes('gramian')) { const W = houseGramian(HOUSE.Tf), a = W[0][0], b = W[0][1], d = W[1][1], tr = (a + d) / 2, df = Math.sqrt(((a - d) / 2) ** 2 + b * b), l1 = tr + df, l2 = tr - df, ang = Math.atan2(l1 - a, b), sc = 7 / Math.sqrt(l1); g.save(); g.translate(X(0), Y(0)); g.rotate(-ang); g.beginPath(); g.ellipse(0, 0, Math.sqrt(l1) * sc * (sq.w - 12) / (m - lo), Math.sqrt(Math.max(l2, 0)) * sc * (sq.w - 12) / (m - lo), 0, 0, 7); g.fillStyle = P.s0; g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1; g.strokeStyle = P.s0; g.lineWidth = 2; g.stroke(); g.restore(); }
  if (ov.includes('reach')) { arrow(g, X(0), Y(0), X(6), Y(0), P.s0, 3); arrow(g, X(0), Y(0), X(-6 * 1.2 * 0.5), Y(6 * 0.5), P.s3, 3); }
  const q: [number, number][] = [], qq: [number, number][] = []; for (let i = 0; i < S.n; i += 4) { const p: [number, number] = [X(S.x1[i]), Y(S.x2[i])]; qq.push(p); if (i * S.dt <= th) q.push(p); }
  line(g, qq, P.s1, 1.4, [], 0.18); line(g, q, P.s1, 2.4);
  const c = hAt(S, th); dot(g, X(c.a), Y(c.b), 4.5, P.s1, P.panel);
  g.restore();
  if (ov.includes('modes') || ov.includes('flow')) { text(g, 'average (1, 1): τ = 5 h', sq.x + sq.w - 4, sq.y + 12, P.s3, { align: 'right', px: 9.5, wt: 700, bg: P.panel }); text(g, 'difference (1, −1): τ ≈ 27 min', sq.x + 4, sq.y + sq.h - 4, P.muted, { px: 9.5, wt: 700, optional: true, bg: P.panel }); }
  if (ov.includes('reach')) { text(g, 'B', X(6) + 3, Y(0) - 4, P.s0, { px: 11, wt: 800 }); text(g, 'AB', X(-3.6) - 2, Y(3) - 4, P.s3, { align: 'right', px: 11, wt: 800 }); }
  if (ov.includes('gramian')) text(g, 'same energy, 3 h: thin across the diagonal', sq.x + 4, sq.y + sq.h - 16, P.s0, { px: 9.5, wt: 700, optional: true });
  if (r.w - side > 70) { text(g, 'state', r.x + 4, r.y + 22, P.muted, { px: 10 }); text(g, `x₁ = ${fmt(c.a, 1)} K`, r.x + 4, r.y + 36, P.s1, { px: 11, wt: 700 }); text(g, `x₂ = ${fmt(c.b, 1)} K`, r.x + 4, r.y + 52, P.s2, { px: 11, wt: 700 }); }
}

export function drawHousePoles(g: G, r: Rect, P: Pal) {
  const xr: [number, number] = [-2.6, 0.5], yr: [number, number] = [-1, 1];
  const { X, Y } = axes(g, r, P, xr, yr, 'Re λ (1/h)', 'Im', { pad: [28, 14, 8, 24], noYZero: true, xTicks: [-2, -1, 0] });
  g.save(); g.globalAlpha = 0.07; g.fillStyle = P.ok; g.fillRect(X(xr[0]), Y(yr[1]), X(0) - X(xr[0]), Y(yr[0]) - Y(yr[1])); g.restore();
  line(g, [[X(0), Y(yr[0])], [X(0), Y(yr[1])]], P.strong, 1.5); line(g, [[X(xr[0]), Y(0)], [X(xr[1]), Y(0)]], P.muted, 1, [], 0.7);
  cross(g, X(-0.2), Y(0), P.s3); cross(g, X(-2.2), Y(0), P.muted);
  text(g, 'average −0.2/h', X(-0.2) - 4, Y(0) - 26, P.s3, { align: 'right', px: 10, wt: 700 });
  text(g, 'τ = 5 h', X(-0.2) - 4, Y(0) - 13, P.s3, { align: 'right', px: 10, wt: 700 });
  text(g, 'difference −2.2/h', X(-2.2) - 6, Y(0) + 22, P.muted, { px: 10, wt: 700 });
  text(g, 'τ ≈ 27 min', X(-2.2) - 6, Y(0) + 35, P.muted, { px: 10, wt: 700 });
}

export function drawHouseCtrl(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = houseScenario(ov), th = (tAnim / HOUSE_ANIM) * S.T;
  let hi = 0; for (let i = 0; i < S.n; i += 3) hi = Math.max(hi, S.u1[i] / 1000, S.u2[i] / 1000);
  const { X, Y } = axes(g, r, P, [0, S.T], [0, Math.max(2, hi * 1.2)], 't (h)', 'heater u (kW)', { pad: [30, 14, 8, 24], xTicks: S.T <= 3 ? [0, 1, 2, 3] : [0, 3, 6, 9, 12] });
  const path = (to: number) => { const q: [number, number][] = []; for (let i = 0; i * S.dt <= to && i < S.n; i += 3) q.push([X(i * S.dt), Y(S.u1[i] / 1000)]); return q; };
  line(g, path(S.T), P.warn, 1.4, [], 0.2); line(g, path(th), P.warn, 2.4);
  text(g, S.kind === 'optimal' ? 'least ∫u² dt to reach the target' : 'heater power', r.x + r.w - 6, r.y + 12, P.warn, { align: 'right', px: 9.5, wt: 700, optional: true });
}
