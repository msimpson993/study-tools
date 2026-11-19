/**
 * Drawing for the linear-systems `car` scene: a car on its suspension seen from the side (half car), the running
 * example for the state half of the page. Model (tutor's parameters) in carModel.ts; catalogue in scenedefs.ts.
 * Vertical motion is exaggerated (the gain is printed) so millimetre motions are visible.
 */
import { text, arrow, line, dot, clip, axes, fmt, type Pal, type Rect, type G } from './scenedraw';
import { CAR, CAR_SYM, worn, carA, forceB, roadB, carModes, sim, bumpInput, minEnergy, DEG, type CarP } from './carModel';

const has = (ov: string[], ...ids: string[]) => ids.some((i) => ov.includes(i));
type Scn = { kind: string; p: CarP; T: number; ts: number[]; xs: number[][]; road?: (t: number) => number[]; u?: (t: number) => number[]; push?: number; slow: number; label: string };
const cache = new Map<string, Scn>();
/** what the scene animates, from its overlays */
export function carScenario(ov: string[]): Scn {
  const key = ov.slice().sort().join(',');
  const hit = cache.get(key); if (hit) return hit;
  let s: Scn;
  if (has(ov, 'active')) {
    const x0 = [0, -2 / DEG, 0, 0], r = minEnergy(CAR, [CAR.a, -CAR.b], x0, 0.5);
    const u = (t: number) => (t < 0.5 ? r.u(t) : [0, 0]);
    const out = sim(carA(CAR), forceB(CAR, [CAR.a, -CAR.b]), u, x0, 1.2, 1e-3);
    s = { kind: 'active', p: CAR, T: 1.2, ...out, u, slow: 4, label: 'level and still in 0.5 s, least ∫|u|²dt' };
  } else if (has(ov, 'bump', 'worn')) {
    const p = has(ov, 'worn') ? worn(CAR) : CAR, b = bumpInput(p);
    const out = sim(carA(p), roadB(p), b.u, [0, 0, 0, 0], 4, 2e-3);
    s = { kind: 'bump', p, T: 4, ...out, road: b.u, slow: 1.5, label: has(ov, 'worn') ? '5 cm bump at 15 m/s, worn shocks' : '5 cm bump at 15 m/s' };
  } else if (has(ov, 'centre')) {
    // symmetric car, a short push at the centre of gravity: only bounce can start (the push size is illustrative)
    const u = (t: number) => [t > 0.2 && t < 0.4 ? 1500 * Math.sin((Math.PI * (t - 0.2)) / 0.2) : 0];
    const out = sim(carA(CAR_SYM), forceB(CAR_SYM, [0]), u, [0, 0, 0, 0], 3, 2e-3);
    s = { kind: 'centre', p: CAR_SYM, T: 3, ...out, u, push: 0, slow: 1.5, label: 'symmetric car, push at the centre' };
  } else {
    const which = has(ov, 'pitch') ? 1 : has(ov, 'bounce') ? 0 : -1, md = carModes(CAR);
    let x0: number[];
    if (which === 1) { const th = 2 / DEG; x0 = [-md[1].node * th, th, 0, 0]; } else if (which === 0) { const z = 0.03; x0 = [z, md[0].thPerZ[0] * z, 0, 0]; } else x0 = [0, -2 / DEG, 0, 0];
    const out = sim(carA(CAR), forceB(CAR, [0]), () => [0], x0, 3, 2e-3);
    s = { kind: which === 1 ? 'pitch' : which === 0 ? 'bounce' : 'free', p: CAR, T: 3, ...out, slow: 1.5, label: which === 1 ? 'pitch mode, released' : which === 0 ? 'bounce mode, released' : 'released 2° nose-down' };
  }
  cache.set(key, s); return s;
}
export const carAnimT = (ov: string[]) => { const s = carScenario(ov); return s.T * s.slow; };
export const carRest = (ov: string[]) => { const s = carScenario(ov); return (s.kind === 'bump' ? 0.24 : s.kind === 'active' ? 0.25 : s.kind === 'centre' ? 0.45 : 0.15) * s.slow; };
const at = (s: Scn, t: number) => { const i = Math.max(0, Math.min(s.xs.length - 1, Math.round((t / s.T) * (s.xs.length - 1)))); return { x: s.xs[i], t: s.ts[i] }; };
const zig = (g: G, x: number, y0: number, y1: number, c: string, w = 7) => { const n = 7, pts: [number, number][] = [[x, y0]]; for (let i = 1; i < n; i++) pts.push([x + (i % 2 ? w : -w), y0 + ((y1 - y0) * i) / n]); pts.push([x, y1]); line(g, pts, c, 1.8); };
const damper = (g: G, x: number, y0: number, y1: number, c: string) => { const m = (y0 + y1) / 2; line(g, [[x, y0], [x, m + 5]], c, 1.8); g.strokeStyle = c; g.lineWidth = 1.8; g.strokeRect(x - 5, m - 8, 10, 14); line(g, [[x, m - 3], [x, y1]], c, 1.8); line(g, [[x - 4, m - 3], [x + 4, m - 3]], c, 2.4); };

export function drawCarMain(g: G, r: Rect, P: Pal, ov: string[], tAnim: number, small: boolean) {
  const S = carScenario(ov), tt = Math.min(S.T, tAnim / S.slow), st = at(S, tt), px = small ? 9.5 : 10.5;
  const p = S.p, span = p.a + p.b + 1.9, sx = (r.w - 24) / span, cgX = r.x + 12 + (p.b + 0.95) * sx; // metres → px
  const X = (xm: number) => cgX + xm * sx;
  // exaggeration: biggest body-point excursion maps to ~16 px
  let peak = 1e-6; for (let i = 0; i < S.xs.length; i += 4) { const x = S.xs[i]; peak = Math.max(peak, Math.abs(x[0] + p.a * x[1]), Math.abs(x[0] - p.b * x[1])); }
  const gain = Math.min(2000, 16 / peak / sx) * sx, ground = r.y + r.h - 18, wr = Math.max(9, Math.min(15, sx * 0.33));
  const road = S.road ? S.road(st.t) : [0, 0, 0, 0], gR = 9 / 0.05; // the 5 cm bump drawn 9 px high
  const yBody0 = ground - 2 * wr - Math.max(26, r.h * 0.2);
  const yAt = (xm: number) => yBody0 - (st.x[0] + xm * st.x[1]) * gain;
  // road and bump
  line(g, [[r.x, ground], [r.x + r.w, ground]], P.strong, 1.6);
  if (S.kind === 'bump') {
    const v = 15, bx = p.a - v * st.t; // bump position in the car's frame (m)
    if (bx > -p.b - 1.5 && bx < p.a + 1.2) { const pts: [number, number][] = []; for (let k = 0; k <= 16; k++) { const xm = bx - 0.5 + k / 16; pts.push([X(xm), ground - 0.05 * gR * 0.5 * (1 - Math.cos((2 * Math.PI * k) / 16))]); } line(g, pts, P.warn, 2.4); }
    text(g, `rear wheel ${fmt((p.a + p.b) / v, 2)} s after the front`, r.x + r.w - 4, r.y + 26, P.warn, { align: 'right', px: px - 0.5, wt: 700, optional: true });
  }
  // wheels (rigid tyres follow the road) and suspension
  const wheels: [number, number][] = [[p.a, road[0]], [-p.b, road[1]]];
  for (const [xm, u] of wheels) {
    const cy = ground - wr - u * gR; g.beginPath(); g.arc(X(xm), cy, wr, 0, 7); g.fillStyle = P.elev; g.fill(); g.strokeStyle = P.strong; g.lineWidth = 2; g.stroke(); dot(g, X(xm), cy, 2.5, P.strong);
    const top = yAt(xm) + 2; zig(g, X(xm) - 8, cy - 3, top, P.s1); damper(g, X(xm) + 8, cy - 3, top, P.s3);
  }
  // body: a side-view outline rotated by the (exaggerated) pitch
  const bl = -p.b - 0.75, br = p.a + 0.75, hgt = Math.max(18, r.h * 0.17), cab0 = -p.b + 0.1, cab1 = p.a - 0.55;
  const pt = (xm: number, up: number): [number, number] => [X(xm), yAt(xm) - up];
  const outline: [number, number][] = [pt(bl, 0), pt(br, 0), pt(br, hgt * 0.75), pt(cab1, hgt * 0.85), pt(cab1 - 0.4, hgt * 1.7), pt(cab0 + 0.5, hgt * 1.7), pt(cab0, hgt * 0.9), pt(bl, hgt * 0.8), pt(bl, 0)];
  g.save(); g.globalAlpha = 0.18; g.fillStyle = P.s0; g.beginPath(); outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill(); g.restore();
  line(g, outline, P.text, 2);
  // rest outline (dashed) for reference
  line(g, [[X(bl), yBody0], [X(br), yBody0]], P.muted, 1, [4, 4], 0.7);
  // CG marker
  const cg = pt(0, hgt * 0.45); line(g, [[cg[0] - 5, cg[1]], [cg[0] + 5, cg[1]]], P.text, 1.6); line(g, [[cg[0], cg[1] - 5], [cg[0], cg[1] + 5]], P.text, 1.6);
  text(g, 'CG', cg[0] + 6, cg[1] - 4, P.muted, { px: px - 1, wt: 700, optional: true });
  // labels: a, b, z, θ
  if (!small || has(ov, 'springs', 'state')) {
    text(g, `a = ${p.a} m`, (X(0) + X(p.a)) / 2, ground + 13, P.muted, { align: 'center', px: px - 1, optional: true });
    text(g, `b = ${p.b} m`, (X(0) + X(-p.b)) / 2, ground + 13, P.muted, { align: 'center', px: px - 1, optional: true });
    text(g, 'front', X(p.a), r.y + 12, P.muted, { align: 'center', px: px - 1, wt: 700, optional: true });
  }
  // node marker (the body point that does not move in this mode)
  if (S.kind === 'pitch' || S.kind === 'bounce') {
    const md = carModes(p)[S.kind === 'pitch' ? 1 : 0], xn = md.node, vis = xn > bl - 0.9;
    const xd = Math.max(bl - 0.9, xn); dot(g, X(xd), yBody0, 4, P.warn);
    line(g, [pt(Math.min(xd, bl), 0), pt(br, 0)], P.warn, 1.2, [5, 3], 0.9);
    text(g, vis ? `node x = ${fmt(xn, 2)} m` : `node ${fmt(-xn - p.b, 2)} m behind rear axle`, X(xd) + (vis ? 0 : 6), yBody0 + 14, P.warn, { align: vis ? 'center' : 'left', px: px - 0.5, wt: 700 });
  }
  if (S.kind === 'centre') {
    const u = S.u!(st.t)[0]; if (Math.abs(u) > 30) arrow(g, X(0), yAt(0) + 26, X(0), yAt(0) + 4, P.bad, 2.6);
    text(g, 'push and sensor at the centre: pitch never starts', r.x + 4, r.y + 26, P.bad, { px: px - 0.5, wt: 700, optional: true });
  }
  if (S.kind === 'active' && S.u) {
    const u = S.u(st.t); for (const [xm, f] of [[p.a, u[0]], [-p.b, u[1]]] as [number, number][]) if (Math.abs(f) > 20) { const L = Math.max(-24, Math.min(24, f / 30)); arrow(g, X(xm) + 18, yAt(xm) + 2 + L, X(xm) + 18, yAt(xm) + 2, P.bad, 2.4); }
  }
  text(g, S.label, r.x + 4, r.y + 12, P.text, { px, wt: 700 });
  text(g, `t = ${fmt(st.t, 2)} s · motion ×${Math.round(gain / sx)}`, r.x + r.w - 4, r.y + 12, P.muted, { align: 'right', px: px - 0.5, wt: 600, optional: true });
}

export function drawCarTrace(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = carScenario(ov), tt = Math.min(S.T, tAnim / S.slow);
  const half: Rect = { ...r, h: r.h / 2 }, low: Rect = { ...r, y: r.y + r.h / 2, h: r.h / 2 };
  const series = [{ rr: half, k: 0, sc: 1000, name: 'heave z (mm)', c: P.s1 }, { rr: low, k: 1, sc: DEG, name: 'pitch θ (°)', c: P.s2 }];
  for (const { rr, k, sc, name, c } of series) {
    let hi = 1e-6; S.xs.forEach((x) => { hi = Math.max(hi, Math.abs(x[k] * sc)); });
    const { X, Y } = axes(g, rr, P, [0, S.T], [-hi * 1.15, hi * 1.15], k ? 't (s)' : '', name, { pad: [34, 10, 6, k ? 22 : 8], xTicks: Array.from({ length: Math.floor(S.T) + 1 }, (_, i) => i) });
    const path = (to: number) => { const q: [number, number][] = []; for (let i = 0; i < S.ts.length && S.ts[i] <= to; i += 3) q.push([X(S.ts[i]), Y(S.xs[i][k] * sc)]); return q; };
    g.save(); clip(g, rr); line(g, path(S.T), c, 1.3, [], 0.2); line(g, path(tt), c, 2.2); g.restore();
  }
}
export function drawCarPoles(g: G, r: Rect, P: Pal, ov: string[]) {
  const sets: [CarP, string, string][] = [[CAR, 'good shocks', P.s1]]; if (has(ov, 'worn')) sets.push([worn(CAR), 'worn (20%)', P.bad]);
  const { X, Y } = axes(g, r, P, [-4, 0.6], [-10, 10], 'Re s (1/s)', 'Im s', { pad: [30, 12, 8, 24], noYZero: true, xTicks: [-4, -2, 0] });
  line(g, [[X(0), Y(-10)], [X(0), Y(10)]], P.strong, 1.4);
  for (const [p, name, c] of sets) {
    const md = carModes(p);
    md.forEach((m, i) => { for (const sg of [1, -1]) { const x = X(m.s[0]), y = Y(sg * m.s[1]); line(g, [[x - 4, y - 4], [x + 4, y + 4]], c, 2.4); line(g, [[x - 4, y + 4], [x + 4, y - 4]], c, 2.4); } text(g, `${i ? 'pitch' : 'bounce'} ${fmt(m.fn, 2)} Hz, ζ ${fmt(m.zeta, 3)}`, X(m.s[0]) + 7, Y(m.s[1]) - 3 + (i ? -10 : 8), c, { px: 9, wt: 700, optional: true }); });
    void name;
  }
}
export function drawCarCtrl(g: G, r: Rect, P: Pal, ov: string[], tAnim: number) {
  const S = carScenario(ov); if (!S.u) return; const tt = Math.min(S.T, tAnim / S.slow), Tw = 0.5;
  const ts = Array.from({ length: 201 }, (_, i) => (i / 200) * Tw), U = ts.map((t) => S.u!(t));
  const hi = Math.max(...U.map((u) => Math.max(...u.map(Math.abs)))) * 1.15;
  const { X, Y } = axes(g, r, P, [0, Tw], [-hi, hi], 't (s)', 'force (N)', { pad: [40, 10, 8, 24], xTicks: [0, 0.25, 0.5] });
  const path = (k: number, to: number) => ts.filter((t) => t <= to).map((t, i) => [X(t), Y(U[i][k])] as [number, number]);
  line(g, path(0, Tw), P.s1, 1.2, [], 0.25); line(g, path(1, Tw), P.s2, 1.2, [], 0.25); line(g, path(0, tt), P.s1, 2.2); line(g, path(1, tt), P.s2, 2.2);
  text(g, 'front', r.x + r.w - 6, r.y + 12, P.s1, { align: 'right', px: 9.5, wt: 700 }); text(g, 'rear', r.x + r.w - 6, r.y + 24, P.s2, { align: 'right', px: 9.5, wt: 700 });
}
