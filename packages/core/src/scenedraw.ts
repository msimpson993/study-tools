/**
 * Canvas drawing helpers shared by the example scenes (moved out of scene.ts unchanged so other scene modules can use them).
 */
import { cssVar } from './plot';

/* ───────────────────────────── drawing helpers ───────────────────────────── */

export interface Pal { text: string; muted: string; border: string; strong: string; panel: string; elev: string; board: string; s0: string; s1: string; s2: string; s3: string; ok: string; bad: string; warn: string }
export const palette = (): Pal => ({ text: cssVar('--text'), muted: cssVar('--muted'), border: cssVar('--border'), strong: cssVar('--border-strong'), panel: cssVar('--panel'), elev: cssVar('--elev'), board: cssVar('--board'), s0: cssVar('--s0'), s1: cssVar('--s1'), s2: cssVar('--s2'), s3: cssVar('--s3'), ok: cssVar('--ok'), bad: cssVar('--bad'), warn: cssVar('--warn') });
export interface Rect { x: number; y: number; w: number; h: number }
export type G = CanvasRenderingContext2D;
export const font = (px: number, wt = 500) => `${wt} ${px}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
export const fmt = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−');

/** Labels drawn so far in the current panel: later labels dodge them (or are dropped when `optional`), and every label is kept inside the panel. */
let LB: { x0: number; y0: number; x1: number; y1: number }[] = [];
let BND: Rect | null = null;
export const beginPanel = (r: Rect) => { LB = []; BND = r; };
const hits = (a: { x0: number; y0: number; x1: number; y1: number }) => LB.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
export function text(g: G, s: string, x: number, y: number, color: string, o: { align?: CanvasTextAlign; base?: CanvasTextBaseline; px?: number; wt?: number; bg?: string; /** secondary label: dropped instead of moved when it would collide */ optional?: boolean } = {}): boolean {
  let px = o.px ?? 11; g.font = font(px, o.wt ?? 500); let w = g.measureText(s).width;
  if (BND) { const room = BND.w - 4; if (w > room) { px = Math.max(8, (px * room) / w); g.font = font(px, o.wt ?? 500); w = g.measureText(s).width; } }
  let x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (BND) x0 = Math.min(Math.max(x0, BND.x + 2), BND.x + BND.w - 2 - w);
  let yy = y;
  if (BND) yy = Math.min(Math.max(yy, BND.y + px * 0.85 + 0.5), BND.y + BND.h - px * 0.25 - 0.5);
  const box = (yv: number) => ({ x0: x0 - 1, x1: x0 + w + 1, y0: yv - px * 0.85, y1: yv + px * 0.25 });
  if (hits(box(yy))) {
    if (o.optional) return false;
    let placed = false; for (const dy of [-(px + 1), px + 1, -2 * (px + 1), 2 * (px + 1)]) { const yv = yy + dy; const bx = box(yv); if (!hits(bx) && (!BND || (bx.y0 >= BND.y && bx.y1 <= BND.y + BND.h))) { yy = yv; placed = true; break; } }
    void placed; // nowhere clear: stay where it was (already clamped to the panel)
  }
  const bx = box(yy); LB.push(bx);
  g.textAlign = 'left'; g.textBaseline = o.base ?? 'alphabetic';
  if (o.bg) { g.fillStyle = o.bg; g.globalAlpha = 0.82; g.fillRect(x0 - 3, yy - px, w + 6, px + 4); g.globalAlpha = 1; }
  g.fillStyle = color; g.fillText(s, x0, yy);
  return true;
}
/** The first variant of a label that fits `maxW` px at this size (the last if none does): short labels instead of squeezed or overlapping ones. */
export function pick(g: G, px: number, wt: number, maxW: number, ...v: string[]): string {
  g.font = font(px, wt); for (const s of v) if (g.measureText(s).width <= maxW) return s; return v[v.length - 1];
}
export function arrow(g: G, x1: number, y1: number, x2: number, y2: number, color: string, wd = 2, dash: number[] = []) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1.5) return;
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = wd; g.lineCap = 'round'; g.setLineDash(dash);
  const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(8, L * 0.6);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); g.stroke();
  g.setLineDash([]); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4)); g.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4)); g.closePath(); g.fill();
  g.restore();
}
export function line(g: G, pts: [number, number][], color: string, wd = 1.5, dash: number[] = [], alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = wd; g.setLineDash(dash); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
}
export function dot(g: G, x: number, y: number, r: number, fill: string, stroke?: string) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } }
export const clip = (g: G, r: Rect) => { g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip(); };


/** One axis box with ticks; returns data→pixel maps. */
export function axes(g: G, r: Rect, P: Pal, xr: [number, number], yr: [number, number], xl: string, yl: string, o: { pad?: [number, number, number, number]; xTicks?: number[]; noYZero?: boolean } = {}) {
  const [L, T, R, B] = o.pad ?? [30, 14, 8, 24];
  const X = (v: number) => r.x + L + ((v - xr[0]) / (xr[1] - xr[0])) * (r.w - L - R), Y = (v: number) => r.y + T + (1 - (v - yr[0]) / (yr[1] - yr[0])) * (r.h - T - B);
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1; g.beginPath(); g.moveTo(X(xr[0]), Y(yr[1])); g.lineTo(X(xr[0]), Y(yr[0])); g.lineTo(X(xr[1]), Y(yr[0])); g.stroke(); g.restore();
  if (!o.noYZero && yr[0] < 0 && yr[1] > 0) line(g, [[X(xr[0]), Y(0)], [X(xr[1]), Y(0)]], P.muted, 1, [], 0.7);
  if (xr[0] < 0 && xr[1] > 0) line(g, [[X(0), Y(yr[0])], [X(0), Y(yr[1])]], P.muted, 1, [], 0.7);
  for (const v of o.xTicks ?? []) { line(g, [[X(v), Y(yr[0])], [X(v), Y(yr[0]) + 3]], P.muted, 1); text(g, String(v), X(v), Y(yr[0]) + 13, P.muted, { align: 'center', px: 9 }); }
  text(g, xl, r.x + r.w - R, r.y + r.h - 2, P.muted, { align: 'right', px: 10, wt: 600 }); text(g, yl, r.x + 3, r.y + 10, P.muted, { px: 10, wt: 600 });
  return { X, Y };
}

