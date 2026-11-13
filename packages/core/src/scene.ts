/**
 * Example scenes: an animated, theme-aware drawing of a subject's physical running example, with overlays that each show
 * one thing a node adds. Catalogue + validation in scenedefs.ts (pure); drawing and animation here.
 *
 *   mountScene(host, { scene: 'cart', overlays: ['forces', 'phase'], caption? })   → SceneHandle
 *
 * Scenes: `cart` (the 1 kg cart on a spring k = 2 and damper c = 3, driven by the real simulated x(t)) and
 * `tine` (a plucked tine x(t) = e^(−σt) cos ω_d t with σ = 0.6, f₀ = 1 Hz, sampled at fs = 8 Hz).
 * Motion always carries meaning: the cart's x(t) is an exact zero-order-hold simulation of ẋ = Ax + Bu (dsp/tf.ts c2dZoh).
 *
 * Tests / screenshots: set `window.__sceneFreeze = seconds` before the page loads to draw one fixed frame; the scene also
 * holds a representative frame under prefers-reduced-motion.
 */
import { cssVar, fitCanvas } from './plot';
import { h } from './dom';
import { c2dZoh } from './dsp/tf';
import { SCENES, insetsOf, type InsetKind } from './scenedefs';

/* ───────────────────────────── models (pure, unit-tested) ───────────────────────────── */

export const CART = { m: 1, k: 2, c: 3, cCrit: 2 * Math.SQRT2, hammerAt: 0.5, pushAt: 0.5, shakerW: 1.5, Ts: 0.5 } as const;
export interface CartSim {
  dt: number; T: number; n: number; k: number; c: number; m: number;
  x: Float64Array; v: Float64Array; u: Float64Array;
  /** sample period of the clock overlay, 0 if none */
  Ts: number;
  /** eigenvalues of A (equal when critical) */
  lam: [number, number];
  /** state, input and modal coefficients at time t (linear interpolation) */
  at(t: number): { x: number; v: number; u: number; a: number; b: number };
  /** hammer: time of the strike, else null */
  strike: number | null;
}
export const cartEigs = (m: number, k: number, c: number): [number, number] => {
  const d = c * c - 4 * m * k;
  if (Math.abs(d) < 1e-9) return [-c / (2 * m), -c / (2 * m)];
  const r = Math.sqrt(Math.max(0, d));
  return [(-c + r) / (2 * m), (-c - r) / (2 * m)];
};
/** Exact simulation of the cart for a given overlay set. Hammer > shaker > push > released from x(0) = 1. */
export function simulateCart(overlays: string[]): CartSim {
  const { m, k } = CART, c = overlays.includes('critical') ? CART.cCrit : CART.c;
  const hammer = overlays.includes('hammer'), shaker = overlays.includes('shaker'), push = overlays.includes('push');
  const dt = 1 / 120, T = shaker ? 14 : 8, n = Math.round(T / dt) + 1;
  const { Ad, Bd } = c2dZoh({ A: [[0, 1], [-k / m, -c / m]], B: [0, 1 / m], C: [1, 0], D: 0 }, dt);
  const x = new Float64Array(n), v = new Float64Array(n), u = new Float64Array(n);
  let xs = hammer || shaker || push ? 0 : 1, vs = 0;
  const kStrike = Math.round(CART.hammerAt / dt);
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    if (hammer && i === kStrike) vs += 1 / m; // an impulse of 1 N·s changes the velocity at once
    x[i] = xs; v[i] = vs;
    const ui = shaker ? Math.sin(CART.shakerW * t) : push ? (t >= CART.pushAt - 1e-9 ? 1 : 0) : 0;
    u[i] = ui;
    const nx = Ad[0][0] * xs + Ad[0][1] * vs + Bd[0] * ui, nv = Ad[1][0] * xs + Ad[1][1] * vs + Bd[1] * ui;
    xs = nx; vs = nv;
  }
  const lam = cartEigs(m, k, c), den = lam[0] - lam[1];
  const lerp = (a: Float64Array, f: number) => { const i = Math.min(n - 2, Math.max(0, Math.floor(f))); return a[i] + (a[i + 1] - a[i]) * (f - i); };
  return {
    dt, T, n, k, c, m, x, v, u, Ts: overlays.includes('clock') ? CART.Ts : 0, lam, strike: hammer ? CART.hammerAt : null,
    at(t) {
      const f = Math.min(n - 1.001, Math.max(0, t / dt)), xx = lerp(x, f), vv = lerp(v, f);
      return { x: xx, v: vv, u: u[Math.min(n - 1, Math.round(f))], a: Math.abs(den) > 1e-9 ? (vv - lam[1] * xx) / den : NaN, b: Math.abs(den) > 1e-9 ? (lam[0] * xx - vv) / den : NaN };
    },
  };
}

export const TINE = { sigma: 0.6, f0: 1, fs: 8, T: 4.5, M: 16 } as const;
/** The tine's tip: x(t) = e^(−σt) cos(ω_d t). */
export const tineX = (t: number): number => Math.exp(-TINE.sigma * t) * Math.cos(2 * Math.PI * TINE.f0 * t);
/** Magnitude of the tine's spectrum |X(f)| for X(s) = (s + σ)/((s + σ)² + ω_d²), normalised to its peak. */
export function tineSpectrum(f: number): number {
  const s = TINE.sigma, wd = 2 * Math.PI * TINE.f0;
  const mag = (w: number) => Math.hypot(s, w) / Math.hypot(s * s - w * w + wd * wd, 2 * s * w);
  return mag(2 * Math.PI * f) / mag(wd);
}

/** Total length of one loop (animation time) for a scene + overlays. */
export function sceneDuration(scene: string, overlays: string[]): number { return scene === 'tine' ? TINE.T : simulateCart(overlays).T; }
/** Frame to hold under reduced motion / as the poster: an instant where the overlays have something to show. */
export function sceneRestTime(scene: string, overlays: string[]): number {
  if (scene === 'tine') return 1.6;
  if (overlays.includes('hammer')) return 0.75;
  if (overlays.includes('shaker')) return 9;
  if (overlays.includes('push')) return 1.4;
  return 0.9;
}

/* ───────────────────────────── drawing helpers ───────────────────────────── */

interface Pal { text: string; muted: string; border: string; strong: string; panel: string; elev: string; board: string; s0: string; s1: string; s2: string; s3: string; ok: string; bad: string; warn: string }
const palette = (): Pal => ({ text: cssVar('--text'), muted: cssVar('--muted'), border: cssVar('--border'), strong: cssVar('--border-strong'), panel: cssVar('--panel'), elev: cssVar('--elev'), board: cssVar('--board'), s0: cssVar('--s0'), s1: cssVar('--s1'), s2: cssVar('--s2'), s3: cssVar('--s3'), ok: cssVar('--ok'), bad: cssVar('--bad'), warn: cssVar('--warn') });
interface Rect { x: number; y: number; w: number; h: number }
type G = CanvasRenderingContext2D;
const font = (px: number, wt = 500) => `${wt} ${px}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
const fmt = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−');

function text(g: G, s: string, x: number, y: number, color: string, o: { align?: CanvasTextAlign; base?: CanvasTextBaseline; px?: number; wt?: number; bg?: string } = {}) {
  g.font = font(o.px ?? 11, o.wt ?? 500); g.textAlign = o.align ?? 'left'; g.textBaseline = o.base ?? 'alphabetic';
  if (o.bg) { const w = g.measureText(s).width + 6, px = o.px ?? 11, x0 = (o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x - 3); g.fillStyle = o.bg; g.globalAlpha = 0.82; g.fillRect(x0, y - px, w, px + 4); g.globalAlpha = 1; }
  g.fillStyle = color; g.fillText(s, x, y);
}
function arrow(g: G, x1: number, y1: number, x2: number, y2: number, color: string, wd = 2, dash: number[] = []) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1.5) return;
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = wd; g.lineCap = 'round'; g.setLineDash(dash);
  const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(8, L * 0.6);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); g.stroke();
  g.setLineDash([]); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4)); g.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4)); g.closePath(); g.fill();
  g.restore();
}
function line(g: G, pts: [number, number][], color: string, wd = 1.5, dash: number[] = [], alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = wd; g.setLineDash(dash); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
}
function dot(g: G, x: number, y: number, r: number, fill: string, stroke?: string) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } }
const clip = (g: G, r: Rect) => { g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip(); };

/* ───────────────────────────── layout ───────────────────────────── */

export interface SceneLayout { w: number; h: number; main: Rect; insets: { kind: InsetKind; rect: Rect }[] }
export function sceneLayout(scene: string, overlays: string[], w: number, compact: boolean): SceneLayout {
  const mainH = Math.round(Math.min(200, Math.max(compact ? 120 : 136, w * (compact ? 0.4 : 0.42))));
  const kinds = compact ? [] : insetsOf(scene, overlays);
  const gap = 8, insetH = Math.round(Math.min(210, Math.max(150, w * (kinds.length === 1 ? 0.5 : 0.52))));
  const insets: SceneLayout['insets'] = kinds.map((kind, i) => {
    const cw = (w - gap * (kinds.length - 1)) / kinds.length;
    return { kind, rect: { x: i * (cw + gap), y: mainH + gap, w: cw, h: insetH } };
  });
  return { w, h: kinds.length ? mainH + gap + insetH : mainH, main: { x: 0, y: 0, w, h: mainH }, insets };
}

/* ───────────────────────────── cart ───────────────────────────── */

const sim = new Map<string, CartSim>();
const simFor = (overlays: string[]): CartSim => {
  const key = ['critical', 'hammer', 'shaker', 'push', 'clock'].filter((o) => overlays.includes(o)).join('|');
  let s = sim.get(key); if (!s) { s = simulateCart(overlays); sim.set(key, s); } return s;
};

function drawCartMain(g: G, r: Rect, P: Pal, S: CartSim, ov: string[], t: number, small: boolean) {
  const px = small ? 9.5 : 10.5, st = S.at(t);
  const w = r.w, yb = r.h - (ov.includes('sensor') ? 40 : ov.includes('forces') ? 44 : 34), xc0 = w * 0.5, scale = Math.min(88, Math.max(38, w * 0.2));
  const cw = 52, chh = 38, cx = xc0 + st.x * scale, cartL = cx - cw / 2, cartT = yb - 12 - chh;
  // ground and wall
  line(g, [[6, yb], [w - 6, yb]], P.strong, 2);
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const yy = yb - 70 + i * 8; g.beginPath(); g.moveTo(8, yy + 8); g.lineTo(18, yy); g.stroke(); }
  g.restore();
  line(g, [[19, yb], [19, yb - 72]], P.strong, 3);
  // spring (k) and damper (c), both tied to the cart
  const yS = yb - 40, yD = yb - 20, x0 = 22;
  const nC = 9, sl = cartL - x0, zig: [number, number][] = [[x0, yS]];
  zig.push([x0 + 8, yS]); for (let i = 0; i < nC; i++) zig.push([x0 + 8 + ((sl - 16) * (i + 0.5)) / nC, yS + (i % 2 ? 6 : -6)]); zig.push([cartL - 8, yS], [cartL, yS]);
  line(g, zig, P.s1, 1.8);
  const dmid = x0 + sl * 0.5;
  line(g, [[x0, yD], [dmid - 8, yD]], P.s3, 1.8); line(g, [[dmid - 8, yD - 6], [dmid - 8, yD + 6]], P.s3, 1.8);
  line(g, [[dmid - 8, yD - 6], [dmid + 8, yD - 6], [dmid + 8, yD + 6], [dmid - 8, yD + 6]], P.s3, 1.8);
  line(g, [[dmid + 2, yD], [cartL, yD]], P.s3, 1.8); line(g, [[dmid + 2, yD - 4], [dmid + 2, yD + 4]], P.s3, 1.8);
  text(g, `spring k = ${CART.k} N/m`, 26, yS - 12, P.s1, { px, wt: 600 });
  text(g, `damper c = ${fmt(S.c, S.c === 3 ? 0 : 2)} N·s/m`, 26, yD + 19, P.s3, { px, wt: 600 });
  // strobe ghosts of the clock
  if (S.Ts) {
    const kk = Math.floor(t / S.Ts + 1e-9);
    for (let i = Math.max(0, kk - 4); i <= kk; i++) {
      const gx = xc0 + S.at(i * S.Ts).x * scale, a = 0.18 + 0.5 * ((i - (kk - 4)) / 4);
      g.save(); g.globalAlpha = a; g.strokeStyle = P.s0; g.lineWidth = 1.4; g.setLineDash([3, 3]); g.strokeRect(gx - cw / 2, cartT, cw, chh); g.restore();
    }
  }
  // rest mark (behind the cart)
  line(g, [[xc0, yb - 4], [xc0, cartT - 4]], P.muted, 1, [3, 3], 0.7);
  // cart
  g.fillStyle = P.elev; g.strokeStyle = P.s0; g.lineWidth = 2; g.beginPath(); g.roundRect(cartL, cartT, cw, chh, 6); g.fill(); g.stroke();
  dot(g, cartL + 12, yb - 6, 6, P.panel, P.strong); dot(g, cartL + cw - 12, yb - 6, 6, P.panel, P.strong);
  text(g, 'm = 1 kg', cx, cartT + chh / 2 + 4, P.text, { align: 'center', px, wt: 700 });
  // displacement (or the sensor ruler)
  if (ov.includes('sensor')) {
    const ry = yb + 14;
    line(g, [[xc0 - scale * 1.1, ry], [xc0 + scale * 1.1, ry]], P.muted, 1.2);
    for (const v of [-1, -0.5, 0, 0.5, 1]) { line(g, [[xc0 + v * scale, ry - 3], [xc0 + v * scale, ry + 3]], P.muted, 1.2); if (!small || v % 1 === 0) text(g, fmt(v, v % 1 ? 1 : 0), xc0 + v * scale, ry + 14, P.muted, { align: 'center', px: 9 }); }
    g.fillStyle = P.ok; g.beginPath(); g.moveTo(cx, ry - 2); g.lineTo(cx - 5, ry - 10); g.lineTo(cx + 5, ry - 10); g.closePath(); g.fill();
    line(g, [[cx, cartT + chh], [cx, ry - 10]], P.ok, 1.2, [2, 3], 0.8);
    text(g, `sensor reads y = x = ${fmt(st.x)} m   (C = (1 0))`, w / 2, 14, P.ok, { align: 'center', px, wt: 700 });
  } else {
    const ry = yb + 18; line(g, [[xc0, ry], [cx, ry]], P.s0, 1.8); if (Math.abs(cx - xc0) > 4) arrow(g, xc0, ry, cx, ry, P.s0, 2);
    dot(g, xc0, ry, 2.5, P.muted);
    text(g, `x = ${fmt(st.x)} m`, Math.max(xc0, cx) + 8, ry + 4, P.s0, { px, wt: 700 });
    text(g, 'x = 0 (spring relaxed)', xc0 - 6, ry + 4, P.muted, { align: 'right', px: 9.5 });
  }
  // forces, one lane each, drawn above the cart
  const lanes: { label: string; val: number; color: string; dash?: number[] }[] = [];
  const hasU = ov.includes('push') || ov.includes('shaker');
  if (ov.includes('forces')) {
    lanes.push({ label: '−kx', val: -S.k * st.x, color: P.s1 }, { label: '−cẋ', val: -S.c * st.v, color: P.s3 });
    if (hasU) lanes.push({ label: 'u', val: st.u, color: P.s0 });
  }
  if (ov.includes('observe')) lanes.push({ label: 'ẋ', val: st.v, color: P.s2, dash: [4, 3] });
  const FS = 26;
  lanes.forEach((ln, i) => {
    const y = cartT - 20 - i * 13, len = Math.max(-w * 0.32, Math.min(w * 0.32, ln.val * FS));
    arrow(g, cx, y, cx + len, y, ln.color, 2.4, ln.dash);
    const tail = len >= 0 ? cx + len + 5 : cx + len - 5, al: CanvasTextAlign = len >= 0 ? 'left' : 'right';
    const lab = ln.label === 'ẋ' ? `ẋ = ${fmt(ln.val)} m/s  (hidden from y)` : `${ln.label} = ${fmt(ln.val)} N`;
    const tw = (g.font = font(px, 700), g.measureText(lab).width);
    let lx = tail; if (al === 'left' && lx + tw > w - 2) { lx = cx + Math.min(len, 0) - 5; text(g, lab, lx, y + 4, ln.color, { align: 'right', px, wt: 700 }); } else if (al === 'right' && lx - tw < 2) text(g, lab, cx + Math.max(len, 0) + 5, y + 4, ln.color, { px, wt: 700 }); else text(g, lab, lx, y + 4, ln.color, { align: al, px, wt: 700 });
  });
  if (ov.includes('forces')) text(g, 'm·ẍ = −kx − cẋ' + (hasU ? ' + u' : '') + '   (net force = mass × acceleration)', w / 2, r.h - 4, P.muted, { align: 'center', px: small ? 9 : 10, wt: 600 });
  // the push itself, when the forces overlay isn't already showing it
  if ((ov.includes('push') || ov.includes('shaker')) && !ov.includes('forces')) {
    const y = cartT + chh / 2, len = st.u * 34;
    line(g, [[cartL + cw, y], [cartL + cw + 6, y]], P.s0, 2);
    if (Math.abs(len) > 1) arrow(g, cartL + cw + 6, y, cartL + cw + 6 + len, y, P.s0, 3);
    text(g, ov.includes('shaker') ? `u = sin(1.5t) = ${fmt(st.u)} N` : `u = ${fmt(st.u, 0)} N`, w - 6, 15, P.s0, { align: 'right', px, wt: 700 });
  }
  // hammer
  if (S.strike !== null) {
    const L = 54, pvx = xc0 - cw / 2 - 8, pvy = yb - 32 - L, ts = S.strike;
    const ang = t < ts ? -1.15 * (1 - t / ts) ** 2 : -0.45 * (1 - Math.exp(-(t - ts) * 7));
    const hx = pvx + Math.sin(ang) * L, hy = pvy + Math.cos(ang) * L;
    line(g, [[pvx, pvy], [hx, hy]], P.muted, 3); dot(g, pvx, pvy, 3, P.muted);
    g.save(); g.translate(hx, hy); g.rotate(ang); g.fillStyle = P.warn; g.fillRect(-5, -9, 10, 18); g.restore();
    if (t >= ts && t < ts + 0.3) { g.save(); g.strokeStyle = P.warn; g.lineWidth = 2; g.globalAlpha = 1 - (t - ts) / 0.3; for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.5, r0 = 8, r1 = 16 + (t - ts) * 30; g.beginPath(); g.moveTo(cartL + Math.cos(a) * r0, yb - 32 + Math.sin(a) * r0); g.lineTo(cartL + Math.cos(a) * r1, yb - 32 + Math.sin(a) * r1); g.stroke(); } g.restore(); }
    text(g, t < ts ? 'hammer: 1 N·s in one instant' : 'then ẋ(0⁺) = 1 m/s and it rings down', w - 6, 15, P.warn, { align: 'right', px, wt: 700 });
  }
  // the clock
  if (S.Ts) {
    const cx2 = w - 22, cy2 = 26, ph = (t % S.Ts) / S.Ts, tick = ph < 0.12;
    g.beginPath(); g.arc(cx2, cy2, 13, 0, 7); g.fillStyle = tick ? P.warn : P.elev; g.fill(); g.strokeStyle = P.strong; g.lineWidth = 1.5; g.stroke();
    line(g, [[cx2, cy2], [cx2 + 10 * Math.sin(ph * 2 * Math.PI), cy2 - 10 * Math.cos(ph * 2 * Math.PI)]], P.text, 1.8);
    text(g, `clock: every T = ${S.Ts} s`, cx2 - 19, cy2 - 4, P.warn, { align: 'right', px, wt: 700 });
    text(g, `reads x(kT), holds it`, cx2 - 19, cy2 + 9, P.muted, { align: 'right', px: 9.5, wt: 600 });
  }
}

/** One axis box with ticks; returns data→pixel maps. */
function axes(g: G, r: Rect, P: Pal, xr: [number, number], yr: [number, number], xl: string, yl: string, o: { pad?: [number, number, number, number]; xTicks?: number[]; noYZero?: boolean } = {}) {
  const [L, T, R, B] = o.pad ?? [30, 14, 8, 24];
  const X = (v: number) => r.x + L + ((v - xr[0]) / (xr[1] - xr[0])) * (r.w - L - R), Y = (v: number) => r.y + T + (1 - (v - yr[0]) / (yr[1] - yr[0])) * (r.h - T - B);
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1; g.beginPath(); g.moveTo(X(xr[0]), Y(yr[1])); g.lineTo(X(xr[0]), Y(yr[0])); g.lineTo(X(xr[1]), Y(yr[0])); g.stroke(); g.restore();
  if (!o.noYZero && yr[0] < 0 && yr[1] > 0) line(g, [[X(xr[0]), Y(0)], [X(xr[1]), Y(0)]], P.muted, 1, [], 0.7);
  if (xr[0] < 0 && xr[1] > 0) line(g, [[X(0), Y(yr[0])], [X(0), Y(yr[1])]], P.muted, 1, [], 0.7);
  for (const v of o.xTicks ?? []) { line(g, [[X(v), Y(yr[0])], [X(v), Y(yr[0]) + 3]], P.muted, 1); text(g, String(v), X(v), Y(yr[0]) + 13, P.muted, { align: 'center', px: 9 }); }
  text(g, xl, r.x + r.w - R, r.y + r.h - 2, P.muted, { align: 'right', px: 10, wt: 600 }); text(g, yl, r.x + 3, r.y + 10, P.muted, { px: 10, wt: 600 });
  return { X, Y };
}

function drawCartTrace(g: G, r: Rect, P: Pal, S: CartSim, ov: string[], t: number) {
  const hasU = ov.includes('push') || ov.includes('shaker') || ov.includes('hammer');
  let lo = 0, hi = 0; for (let i = 0; i < S.n; i += 4) { lo = Math.min(lo, S.x[i]); hi = Math.max(hi, S.x[i]); }
  const pad = 0.12 * Math.max(0.3, hi - lo); lo -= pad; hi += pad;
  const bandH = hasU ? 34 : 0, rx: Rect = { x: r.x, y: r.y, w: r.w, h: r.h - bandH };
  const ticks = S.T > 10 ? [0, 5, 10] : [0, 2, 4, 6];
  const { X, Y } = axes(g, rx, P, [0, S.T], [lo, hi], hasU ? '' : 't (s)', 'x (m)', { pad: [32, 14, 8, hasU ? 6 : 24], xTicks: hasU ? [] : ticks });
  const path = (a: number, b: number) => { const pts: [number, number][] = []; for (let i = Math.floor(a / S.dt); i <= Math.min(S.n - 1, Math.ceil(b / S.dt)); i += 2) pts.push([X(i * S.dt), Y(S.x[i])]); return pts; };
  g.save(); clip(g, { x: rx.x + 30, y: rx.y, w: rx.w - 36, h: rx.h });
  line(g, path(0, S.T), P.s0, 2, [], S.Ts ? 0.2 : 0.22);
  if (S.Ts) {
    // stems and staircase: what the sampler hands on
    const kk = Math.floor(t / S.Ts + 1e-9); const stair: [number, number][] = [];
    for (let i = 0; i <= kk; i++) { const xv = S.at(i * S.Ts).x; stair.push([X(i * S.Ts), Y(xv)], [X(Math.min(t, (i + 1) * S.Ts)), Y(xv)]); line(g, [[X(i * S.Ts), Y(0)], [X(i * S.Ts), Y(xv)]], P.warn, 1.6); dot(g, X(i * S.Ts), Y(xv), 3, P.warn); }
    line(g, stair, P.warn, 2);
    line(g, path(0, t), P.s0, 1.4, [3, 3]);
  } else line(g, path(0, t), P.s0, 2.4);
  if (S.strike !== null) { line(g, [[X(S.strike), Y(lo)], [X(S.strike), Y(hi)]], P.warn, 1, [3, 3], 0.7); }
  const cur = S.at(t); line(g, [[X(t), Y(lo)], [X(t), Y(hi)]], P.muted, 1, [2, 3], 0.6); dot(g, X(t), Y(cur.x), 4, P.s0, P.panel);
  g.restore();
  if (S.Ts) { text(g, 'stems: samples x[k] = x(kT)', rx.x + rx.w - 8, rx.y + 12, P.warn, { align: 'right', px: 10, wt: 700 }); text(g, 'staircase: held value', rx.x + rx.w - 8, rx.y + 24, P.warn, { align: 'right', px: 10 }); }
  if (hasU) {
    const bb: Rect = { x: r.x, y: r.y + r.h - bandH, w: r.w, h: bandH }, ur: [number, number] = ov.includes('shaker') ? [-1.3, 1.3] : [-0.2, 1.3];
    const a = axes(g, bb, P, [0, S.T], ur, 't (s)', S.strike !== null ? 'u' : 'u (N)', { pad: [32, 6, 8, 14], xTicks: [] });
    g.save(); clip(g, { x: bb.x + 30, y: bb.y, w: bb.w - 36, h: bb.h });
    if (S.strike !== null) { const ts = S.strike; if (t >= ts) { arrow(g, a.X(ts), a.Y(0), a.X(ts), a.Y(1.15), P.warn, 2.4); } text(g, '1 N·s', a.X(ts) + 6, a.Y(0.6), P.warn, { px: 10, wt: 700 }); }
    else { const pts: [number, number][] = []; for (let i = 0; i * S.dt <= t; i += 2) pts.push([a.X(i * S.dt), a.Y(S.u[i])]); line(g, pts, P.s1, 2.2); }
    g.restore();
    for (const tv of ticks) text(g, String(tv), a.X(tv), bb.y + bb.h - 1, P.muted, { align: 'center', px: 9 });
  }
}

function drawCartPhase(g: G, r: Rect, P: Pal, S: CartSim, ov: string[], t: number) {
  const side = Math.min(r.w - 4, r.h - 4), sq: Rect = { x: r.x + r.w - side - 2, y: r.y + 2, w: side, h: side };
  let R = 0.4; for (let i = 0; i < S.n; i += 4) R = Math.max(R, Math.abs(S.x[i]), Math.abs(S.v[i])); R = Math.max(1.1, R * 1.15);
  if (ov.includes('reach')) R = Math.max(R, 1.1);
  const { X, Y } = axes(g, sq, P, [-R, R], [-R, R], 'x', 'ẋ', { pad: [4, 12, 4, 12] });
  const cur = S.at(t), pxy = (x: number, v: number): [number, number] => [X(x), Y(v)];
  g.save(); clip(g, { x: sq.x + 1, y: sq.y + 1, w: sq.w - 2, h: sq.h - 2 });
  if (ov.includes('flow')) {
    const N = 5; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const xx = -R + ((i + 0.5) * 2 * R) / N, vv = -R + ((j + 0.5) * 2 * R) / N, dx = vv, dv = (-S.k * xx - S.c * vv) / S.m, m = Math.hypot(dx / R, dv / R) || 1, L = (0.72 * 2 * R) / N / Math.max(1, m * 1.0);
      const sx = (dx / R) / m, sv = (dv / R) / m, [a, b] = pxy(xx - sx * L * 0.5, vv - sv * L * 0.5), [c2, d] = pxy(xx + sx * L * 0.5, vv + sv * L * 0.5); arrow(g, a, b, c2, d, P.muted, 1.4);
    }
  }
  const lam = S.lam, den = lam[0] - lam[1];
  if (ov.includes('modes') && Math.abs(den) > 1e-9) {
    lam.forEach((l, i) => { const col = i ? P.s2 : P.s1; line(g, [pxy(-R, -R * l), pxy(R, R * l)], col, 1.4, [5, 4], 0.9); });
    const a = cur.a, b = cur.b; const p1 = pxy(a, a * lam[0]), p0 = pxy(0, 0), pe = pxy(cur.x, cur.v);
    arrow(g, p0[0], p0[1], p1[0], p1[1], P.s1, 3); arrow(g, p1[0], p1[1], pe[0], pe[1], P.s2, 3);
  }
  if (ov.includes('critical')) line(g, [pxy(-R, -R * lam[0]), pxy(R, R * lam[0])], P.s1, 1.4, [5, 4], 0.9);
  if (ov.includes('reach')) {
    const b = 0.8 * R, ab = (0.8 * R) / 3;
    g.save(); g.globalAlpha = 0.14; g.fillStyle = P.s0; g.beginPath(); const q = [pxy(0, 0), pxy(0, b), pxy(ab, b - 3 * ab), pxy(ab, -3 * ab)]; q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
    arrow(g, ...pxy(0, 0), ...pxy(0, b), P.s0, 3); arrow(g, ...pxy(0, 0), ...pxy(ab, -3 * ab), P.s3, 3);
    text(g, 'B', pxy(0, b)[0] + 6, pxy(0, b)[1] + 10, P.s0, { px: 11, wt: 700 }); text(g, 'AB', pxy(ab, -3 * ab)[0] + 5, pxy(ab, -3 * ab)[1] - 3, P.s3, { px: 11, wt: 700 });
  }
  if (ov.includes('observe')) {
    line(g, [pxy(cur.x, cur.v), pxy(cur.x, 0)], P.ok, 1.6, [3, 3]);
    g.save(); g.fillStyle = P.ok; g.globalAlpha = 0.18; g.fillRect(sq.x, Y(0) - 4, sq.w, 8); g.restore(); dot(g, X(cur.x), Y(0), 4.5, P.ok, P.panel);
  }
  // trail + dot
  const trail: [number, number][] = []; for (let i = 0; i * S.dt <= t; i += 3) trail.push(pxy(S.x[i], S.v[i]));
  const full: [number, number][] = []; for (let i = 0; i < S.n; i += 4) full.push(pxy(S.x[i], S.v[i]));
  line(g, full, P.s0, 1.5, [], 0.16); line(g, trail, P.s0, 2.2, [], 0.95);
  dot(g, X(cur.x), Y(cur.v), 5, P.s0, P.panel);
  g.restore();
  if (ov.includes('modes') && Math.abs(den) > 1e-9) {
    text(g, 'v₁ (λ = −1)', sq.x + sq.w - 4, Y(-R * lam[0]) < sq.y + 14 ? sq.y + 24 : Y(-R * lam[0]) - 4, P.s1, { align: 'right', px: 10, wt: 700 });
    text(g, 'v₂ (λ = −2)', sq.x + sq.w - 4, sq.y + sq.h - 28, P.s2, { align: 'right', px: 10, wt: 700 });
  }
  if (ov.includes('critical')) text(g, 'v (λ = −√2, twice)', sq.x + sq.w - 4, sq.y + 24, P.s1, { align: 'right', px: 10, wt: 700 });
  if (ov.includes('observe')) text(g, 'y = x: only this', X(cur.x) + (cur.x < 0 ? 6 : -6), Y(0) + (cur.v >= 0 ? 15 : -8), P.ok, { align: cur.x < 0 ? 'left' : 'right', px: 10, wt: 700 });
  // readout in the free column
  const lx = r.x + 4, rows: [string, string][] = [['state x', `${fmt(cur.x)} m`], ['state ẋ', `${fmt(cur.v)} m/s`]];
  if (ov.includes('modes') && Math.abs(den) > 1e-9) rows.push(['mode 1', `${fmt(cur.a)} · v₁`], ['mode 2', `${fmt(cur.b)} · v₂`]);
  if (r.w - side > 70) rows.forEach(([k, v], i) => { text(g, k, lx, r.y + 22 + i * 28, P.muted, { px: 10 }); text(g, v, lx, r.y + 36 + i * 28, i < 2 ? P.s0 : i === 2 ? P.s1 : P.s2, { px: 12, wt: 700 }); });
  else text(g, `(x, ẋ) = (${fmt(cur.x)}, ${fmt(cur.v)})`, r.x + 2, r.y + r.h - 1, P.s0, { px: 10, wt: 700 });
}

function drawCartPoles(g: G, r: Rect, P: Pal, S: CartSim, ov: string[], t: number) {
  const xr: [number, number] = [-3.4, 0.9], yr: [number, number] = [-2.1, 2.1];
  const { X, Y } = axes(g, r, P, xr, yr, 'Re s', 'Im s', { pad: [28, 14, 8, 14], noYZero: true });
  g.save(); g.globalAlpha = 0.07; g.fillStyle = P.ok; g.fillRect(X(xr[0]), Y(yr[1]), X(0) - X(xr[0]), Y(yr[0]) - Y(yr[1])); g.restore();
  line(g, [[X(0), Y(yr[0])], [X(0), Y(yr[1])]], P.strong, 1.5); line(g, [[X(xr[0]), Y(0)], [X(xr[1]), Y(0)]], P.muted, 1, [], 0.7);
  text(g, 'decays', X(-1.7), Y(yr[0]) - 5, P.ok, { align: 'center', px: 10 }); text(g, 'grows', X(0.45), Y(yr[0]) - 5, P.bad, { align: 'center', px: 10 });
  const cur = S.at(t), amp = [Math.abs(cur.a), Math.abs(cur.b)], crit = Math.abs(S.lam[0] - S.lam[1]) < 1e-9;
  let mx = 1e-6; for (let i = 0; i < S.n; i += 6) mx = Math.max(mx, Math.abs(S.at(i * S.dt).a) || 0, Math.abs(S.at(i * S.dt).b) || 0);
  S.lam.forEach((l, i) => {
    if (crit && i) return;
    if (!crit) { g.save(); g.globalAlpha = 0.25; g.fillStyle = i ? P.s2 : P.s1; g.beginPath(); g.arc(X(l), Y(0), 5 + 15 * Math.min(1, amp[i] / mx), 0, 7); g.fill(); g.restore(); }
    const c0 = i ? P.s2 : P.s1, xx = X(l), yy = Y(0); line(g, [[xx - 5, yy - 5], [xx + 5, yy + 5]], c0, 2.6); line(g, [[xx - 5, yy + 5], [xx + 5, yy - 5]], c0, 2.6);
    text(g, crit ? `λ = −√2 (twice)` : `λ${i ? '₂' : '₁'} = ${i ? '−2' : '−1'}`, xx, i ? yy - 14 : yy + 24, c0, { align: 'center', px: 10, wt: 700 });
  });
  if (!crit) text(g, 'halo: mode size now', r.x + r.w - 6, r.y + 10, P.muted, { align: 'right', px: 9.5 });
  if (ov.includes('shaker')) { dot(g, X(0), Y(CART.shakerW), 4, P.s0); text(g, 'input jω, ω = 1.5', X(0) - 6, Y(CART.shakerW) + 4, P.s0, { align: 'right', px: 10, wt: 700 }); }
}

/* ───────────────────────────── tine ───────────────────────────── */

function drawTineMain(g: G, r: Rect, P: Pal, ov: string[], t: number, small: boolean) {
  const px = small ? 9.5 : 10.5, w = r.w, cy = r.h * 0.46, amp = r.h * 0.3, bx = 14, tx = Math.min(w * 0.3, 104);
  // clamp + tine (bends like a cantilever; the tip follows x(t))
  g.fillStyle = P.strong; g.fillRect(bx - 8, cy - 26, 8, 52);
  const tip = tineX(t) * amp, pts: [number, number][] = []; for (let i = 0; i <= 20; i++) { const s = i / 20; pts.push([bx + s * (tx - bx), cy - tip * s * s]); }
  line(g, [[bx, cy], [tx, cy]], P.muted, 1, [3, 3], 0.6);
  line(g, pts, P.s0, 5); dot(g, tx, cy - tip, 5, P.s0, P.panel);
  text(g, 'tine', bx + 2, cy + 38, P.muted, { px, wt: 600 }); text(g, 'tip x(t)', tx, cy + 38, P.s0, { align: 'center', px, wt: 700 });
  // strip chart to the right
  const x0 = tx + 26, x1 = w - 8, X = (tt: number) => x0 + (tt / TINE.T) * (x1 - x0), Y = (v: number) => cy - v * amp;
  line(g, [[x0, cy], [x1, cy]], P.muted, 1, [], 0.7);
  const curve = (a: number, b: number) => { const q: [number, number][] = []; for (let tt = a; tt <= b + 1e-9; tt += 0.02) q.push([X(tt), Y(tineX(tt))]); return q; };
  line(g, curve(0, TINE.T), P.s0, 1.5, [], 0.16);
  if (ov.includes('window')) {
    const Mt = TINE.M / TINE.fs; g.save(); g.globalAlpha = 0.1; g.fillStyle = P.s1; g.fillRect(X(0), Y(1.15), X(Mt) - X(0), Y(-1.15) - Y(1.15)); g.restore();
    const win: [number, number][] = []; for (let n = 0; n <= 40; n++) { const tt = (n / 40) * Mt; win.push([X(tt), Y(0.5 - 0.5 * Math.cos((2 * Math.PI * n) / 40) )]); } line(g, win.map(([x, y]) => [x, y - amp * 0.62] as [number, number]), P.s1, 1.6, [4, 3]);
    line(g, [[X(Mt), Y(1.2)], [X(Mt), Y(-1.2)]], P.s1, 1.2, [3, 3]);
    text(g, `record: M = ${TINE.M} samples = ${Mt} s, faded by a window`, X(0) + 3, r.h - 6, P.s1, { px, wt: 700 });
  }
  if (ov.includes('envelope')) { for (const sg of [1, -1]) { const q: [number, number][] = []; for (let tt = 0; tt <= TINE.T + 1e-9; tt += 0.05) q.push([X(tt), Y(sg * Math.exp(-TINE.sigma * tt))]); line(g, q, P.s1, 1.4, [5, 4], 0.95); } text(g, 'e^(−σt), σ = 0.6 s⁻¹', X(0.9), Y(0.45) - 14, P.s1, { px, wt: 700, bg: P.board }); }
  line(g, curve(0, t), P.s0, 2.5);
  line(g, [[tx + 6, cy - tip], [X(t), cy - tip]], P.s0, 1, [2, 3], 0.7); dot(g, X(t), Y(tineX(t)), 4, P.s0, P.panel);
  if (ov.includes('sampler')) {
    const T = 1 / TINE.fs, kk = Math.floor(t / T + 1e-9);
    for (let i = 0; i <= kk; i++) { const tt = i * T; line(g, [[X(tt), cy], [X(tt), Y(tineX(tt))]], P.warn, 1.6); dot(g, X(tt), Y(tineX(tt)), 2.8, P.warn); }
    const ph = (t % T) / T, cxk = w - 20, cyk = 16, tick = ph < 0.2;
    g.beginPath(); g.arc(cxk, cyk, 11, 0, 7); g.fillStyle = tick ? P.warn : P.elev; g.fill(); g.strokeStyle = P.strong; g.lineWidth = 1.5; g.stroke();
    line(g, [[cxk, cyk], [cxk + 8 * Math.sin(ph * 2 * Math.PI), cyk - 8 * Math.cos(ph * 2 * Math.PI)]], P.text, 1.6);
    text(g, 'sampler: fs = 8 Hz, T = 125 ms', cxk - 16, cyk + 4, P.warn, { align: 'right', px, wt: 700 });
  }
  // period bracket
  const yb2 = cy + amp + 8; if (!ov.includes('window')) { line(g, [[X(0), yb2], [X(1 / TINE.f0), yb2]], P.muted, 1.2); line(g, [[X(0), yb2 - 3], [X(0), yb2 + 3]], P.muted, 1.2); line(g, [[X(1), yb2 - 3], [X(1), yb2 + 3]], P.muted, 1.2); text(g, 'one ring = 1/f₀ = 1 s', X(0.5), yb2 + 12, P.muted, { align: 'center', px: 9.5 }); }
  text(g, 'x(t) = e^(−σt) cos(2πf₀t)', x1, r.h - 6, P.muted, { align: 'right', px: 9.5, wt: 600 });
}

function drawTinePoles(g: G, r: Rect, P: Pal, ov: string[], t: number) {
  const s = TINE.sigma, wd = 2 * Math.PI * TINE.f0, xr: [number, number] = [-3.2, 1], yr: [number, number] = [-9, 9];
  const { X, Y } = axes(g, r, P, xr, yr, 'Re s (1/s)', 'jω', { pad: [30, 14, 8, 14], noYZero: true });
  g.save(); g.globalAlpha = 0.07; g.fillStyle = P.ok; g.fillRect(X(xr[0]), Y(yr[1]), X(0) - X(xr[0]), Y(yr[0]) - Y(yr[1])); g.restore();
  line(g, [[X(0), Y(yr[0])], [X(0), Y(yr[1])]], P.strong, 1.5); line(g, [[X(xr[0]), Y(0)], [X(xr[1]), Y(0)]], P.muted, 1, [], 0.7);
  const e = Math.exp(-s * t);
  for (const sg of [1, -1]) { const xx = X(-s), yy = Y(sg * wd); g.save(); g.globalAlpha = 0.25; g.fillStyle = P.s0; g.beginPath(); g.arc(xx, yy, 4 + 11 * e, 0, 7); g.fill(); g.restore(); line(g, [[xx - 5, yy - 5], [xx + 5, yy + 5]], P.s0, 2.6); line(g, [[xx - 5, yy + 5], [xx + 5, yy - 5]], P.s0, 2.6); }
  arrow(g, X(0), Y(wd) - 1, X(-s) + 6, Y(wd) - 1, P.s1, 1.6); text(g, 'σ = 0.6', X(0) - 4, Y(wd) - 8, P.s1, { align: 'right', px: 10, wt: 700 });
  arrow(g, X(-s) - 14, Y(0), X(-s) - 14, Y(wd) - 6, P.s2, 1.6); text(g, `ω_d = 2π f₀ = 6.28`, X(-s) - 18, Y(wd / 2) + 3, P.s2, { align: 'right', px: 10, wt: 700 });
  text(g, 'halo: ring size now', r.x + r.w - 6, r.y + 10, P.muted, { align: 'right', px: 9.5 });
}

function drawTineSpectrum(g: G, r: Rect, P: Pal, ov: string[]) {
  const copies = ov.includes('sampler'), fr: [number, number] = copies ? [-13, 13] : [-3, 3], yr: [number, number] = [0, copies ? 2.2 : 1.15];
  const { X, Y } = axes(g, r, P, fr, yr, 'f (Hz)', copies ? '|X| (copies add)' : '|X(f)|', { pad: [30, 14, 8, 24], xTicks: copies ? [-8, 0, 8] : [-2, -1, 0, 1, 2] });
  const shifts = copies ? [-1, 0, 1] : [0];
  const draw = (sh: number, col: string, wd: number, alpha: number) => { const q: [number, number][] = []; for (let f = fr[0]; f <= fr[1] + 1e-9; f += (fr[1] - fr[0]) / 300) q.push([X(f), Y(tineSpectrum(f - sh * TINE.fs) )]); line(g, q, col, wd, [], alpha); };
  if (copies) { for (const sh of shifts) if (sh) draw(sh, P.warn, 1.6, 0.9); }
  draw(0, P.s0, 2.4, 1);
  // sum when copies add (approximate by magnitude sum, shown as dashed envelope)
  if (copies) { const q: [number, number][] = []; for (let f = fr[0]; f <= fr[1] + 1e-9; f += (fr[1] - fr[0]) / 400) { let s = 0; for (const sh of shifts) s += tineSpectrum(f - sh * TINE.fs); q.push([X(f), Y(s)]); } line(g, q, P.text, 1.2, [3, 3], 0.7); }
  for (const sg of [-1, 1]) line(g, [[X(sg * TINE.f0), Y(0)], [X(sg * TINE.f0), Y(1.05)]], P.s1, 1, [3, 3], 0.8);
  text(g, copies ? 'copies every fs = 8 Hz' : 'peak at ±f₀ = ±1 Hz', X(0), r.y + 24, copies ? P.warn : P.s1, { align: 'center', px: 10, wt: 700 });
  if (!copies) text(g, 'width ≈ σ/π ≈ 0.2 Hz', X(0), r.y + 37, P.muted, { align: 'center', px: 10 });
}

function drawTineZ(g: G, r: Rect, P: Pal) {
  const side = Math.min(r.w - 4, r.h - 4), cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 2, R = side / 2 - 12;
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.restore();
  line(g, [[cx - R - 8, cy], [cx + R + 8, cy]], P.muted, 1, [], 0.7); line(g, [[cx, cy - R - 8], [cx, cy + R + 8]], P.muted, 1, [], 0.7);
  g.save(); g.globalAlpha = 0.06; g.fillStyle = P.ok; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.restore();
  const rad = Math.exp(-TINE.sigma / TINE.fs), om = (2 * Math.PI * TINE.f0) / TINE.fs;
  for (const sg of [1, -1]) {
    const xx = cx + R * rad * Math.cos(om), yy = cy - sg * R * rad * Math.sin(om);
    line(g, [[xx - 5, yy - 5], [xx + 5, yy + 5]], P.s0, 2.6); line(g, [[xx - 5, yy + 5], [xx + 5, yy - 5]], P.s0, 2.6);
  }
  const px0 = cx + R * rad * Math.cos(om), py0 = cy - R * rad * Math.sin(om);
  line(g, [[cx, cy], [px0, py0]], P.s2, 1.4, [3, 3]);
  g.save(); g.strokeStyle = P.s2; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, R * 0.28, -om, 0); g.stroke(); g.restore();
  text(g, 'Ω', cx + R * 0.32, cy - 5, P.s2, { px: 11, wt: 700 });
  line(g, [[cx + R * rad, cy], [cx + R, cy]], P.s1, 3); text(g, '|z|', cx + R * rad - 3, cy + 13, P.s1, { align: 'right', px: 11, wt: 700 });
  text(g, 'angle Ω = 2πf₀/fs = π/4', cx, r.y + 24, P.s2, { align: 'center', px: 9.5, wt: 700 });
  text(g, `radius |z| = e^(−σT) = ${rad.toFixed(2)}`, cx, r.y + r.h - 3, P.s1, { align: 'center', px: 9.5, wt: 700 });
  text(g, 'unit circle', cx, r.y + 11, P.muted, { align: 'center', px: 9.5 }); 
}

/* ───────────────────────────── one frame, and the mounted component ───────────────────────────── */

/** Draw one frame of a scene at animation time t into a canvas of CSS size (w, layout.h). */
export function drawSceneFrame(g: G, L: SceneLayout, scene: string, overlays: string[], t: number): void {
  const P = palette(), small = L.w < 380;
  g.clearRect(0, 0, L.w, L.h);
  if (scene === 'cart') {
    const S = simFor(overlays);
    g.save(); g.beginPath(); g.rect(L.main.x, L.main.y, L.main.w, L.main.h); g.clip(); drawCartMain(g, L.main, P, S, overlays, t, small); g.restore();
    for (const { kind, rect } of L.insets) {
      g.save(); g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip();
      if (kind === 'trace') drawCartTrace(g, rect, P, S, overlays, t); else if (kind === 'phase') drawCartPhase(g, rect, P, S, overlays, t); else if (kind === 'poles') drawCartPoles(g, rect, P, S, overlays, t);
      g.restore();
    }
  } else if (scene === 'tine') {
    g.save(); g.beginPath(); g.rect(L.main.x, L.main.y, L.main.w, L.main.h); g.clip(); drawTineMain(g, L.main, P, overlays, t, small); g.restore();
    for (const { kind, rect } of L.insets) {
      g.save(); g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip();
      if (kind === 'poles') drawTinePoles(g, rect, P, overlays, t); else if (kind === 'spectrum') drawTineSpectrum(g, rect, P, overlays); else if (kind === 'zplane') drawTineZ(g, rect, P);
      g.restore();
    }
  }
}

export interface SceneOptions { scene: string; overlays?: string[]; caption?: string; /** small hero: main picture only */ compact?: boolean }
export interface SceneHandle { el: HTMLElement; canvas: HTMLCanvasElement; setOverlays(o: string[]): void; destroy(): void; /** draw a fixed frame (animation time, s) */ drawAt(t: number): void }
declare global { interface Window { __sceneFreeze?: number } }

/** Plain-language description (alt text and caption) of what a scene shows with these overlays. */
export function sceneAlt(scene: string, overlays: string[]): string {
  const info = SCENES[scene]; if (!info) return '';
  return `${info.physical} Shown: ${overlays.map((id) => info.overlays.find((o) => o.id === id)?.says ?? id).join(' ')}`;
}

export function mountScene(host: HTMLElement, opts: SceneOptions): SceneHandle {
  const info = SCENES[opts.scene];
  let overlays = (opts.overlays?.length ? opts.overlays : info?.defaults) ?? [];
  const canvas = h('canvas', { class: 'scene-cv', role: 'img', dataset: { testid: 'scene-canvas' } }) as HTMLCanvasElement;
  const cap = h('figcaption', { class: 'scene-cap' });
  const el = h('figure', { class: `scene${opts.compact ? ' compact' : ''}`, dataset: { testid: 'example-scene', scene: opts.scene, overlays: overlays.join(',') } }, canvas, cap) as HTMLElement;
  host.append(el);
  if (!info) { el.replaceChildren(h('div', { class: 'scene-miss', dataset: { testid: 'scene-missing' } }, `Scene “${opts.scene}” is not available.`)); return { el, canvas, setOverlays() {}, destroy() { el.remove(); }, drawAt() {} }; }
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, visible = true, t0 = performance.now(), layout: SceneLayout | null = null;
  const frozen = () => (typeof window.__sceneFreeze === 'number' ? window.__sceneFreeze : reduced ? sceneRestTime(opts.scene, overlays) : null);
  const render = (tt: number) => { const w = Math.floor(canvas.getBoundingClientRect().width || el.clientWidth - 12 || 340); layout = sceneLayout(opts.scene, overlays, w, !!opts.compact); canvas.style.height = `${layout.h}px`; const { g } = fitCanvas(canvas); drawSceneFrame(g, layout, opts.scene, overlays, tt); };
  const setCaption = () => {
    cap.replaceChildren(h('b', null, info.title), opts.caption ? ` — ${opts.caption}` : '');
    if (!opts.compact) cap.append(h('span', { class: 'scene-ov' }, ...overlays.map((id) => h('span', { class: 'scene-chip', title: info.overlays.find((o) => o.id === id)?.says ?? '' }, info.overlays.find((o) => o.id === id)?.label ?? id))));
    canvas.setAttribute('aria-label', sceneAlt(opts.scene, overlays)); el.dataset.overlays = overlays.join(',');
  };
  const loop = () => {
    raf = 0; const fz = frozen();
    if (fz !== null) { render(fz); return; }
    const T = sceneDuration(opts.scene, overlays), P = T + 1.4, tt = ((performance.now() - t0) / 1000) % P;
    render(Math.min(tt, T - 0.001));
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) { kick(); } }) : null;
  io?.observe(el);
  const ro = new ResizeObserver(() => { if (frozen() !== null || !raf) { cancelAnimationFrame(raf); raf = 0; kick(); } });
  ro.observe(el);
  const onTheme = () => { cancelAnimationFrame(raf); raf = 0; kick(); };
  window.addEventListener('study-theme', onTheme);
  document.addEventListener('visibilitychange', kick);
  setCaption(); kick();
  return {
    el, canvas,
    setOverlays(o) { overlays = o.length ? o : info.defaults; t0 = performance.now(); setCaption(); cancelAnimationFrame(raf); raf = 0; kick(); },
    drawAt(tt) { render(tt); },
    destroy() { cancelAnimationFrame(raf); io?.disconnect(); ro.disconnect(); window.removeEventListener('study-theme', onTheme); document.removeEventListener('visibilitychange', kick); el.remove(); },
  };
}
