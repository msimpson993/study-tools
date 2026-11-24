/**
 * In-plot label placement. Every label drawn through `text()` is recorded per canvas (in device pixels) for the current draw, so later
 * labels can keep clear of earlier ones:
 * - `tick`: an axis number; skipped when it would sit on a label already drawn (dense ticks thin themselves out);
 * - `axis`: an axis name or a legend row; drawn exactly where asked (it marks a place), but recorded so notes avoid it;
 * - `note` (the default): any other in-plot text; slid up or down by whole lines to the nearest free spot inside the canvas.
 * The record is cleared when a canvas is sized for a new draw (fitCanvas), when it is wiped, and after the current task.
 */
export type LabelRole = 'note' | 'tick' | 'axis';
export interface LabelRect { x0: number; x1: number; y0: number; y1: number; role: LabelRole }
const placed = new WeakMap<object, LabelRect[]>();
let role: LabelRole = 'note';

/** draw fn with every label in it given this role (nests; restores the previous role) */
export function withLabelRole<T>(r: LabelRole, fn: () => T): T { const old = role; role = r; try { return fn(); } finally { role = old; } }
export const labelRole = (): LabelRole => role;
/** forget the labels recorded on this canvas (a new draw starts) */
export function resetLabels(cv: object | null | undefined) { if (cv) { placed.delete(cv); gens.set(cv, (gens.get(cv) ?? 0) + 1); } }
const gens = new WeakMap<object, number>();
/** how many draws this canvas has started (test hook: group logged labels by draw) */
export const labelGen = (cv: object) => gens.get(cv) ?? 0;
export function labelsOn(cv: object): LabelRect[] {
  let a = placed.get(cv);
  if (!a) { a = []; placed.set(cv, a); const mine = a; queueMicrotask(() => { if (placed.get(cv) === mine) placed.delete(cv); }); }
  return a;
}
const hit = (a: LabelRect, b: LabelRect, pad: number) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > pad && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > pad;
/** first vertical shift (device px) from `dys` that clears every recorded label, or null */
export function freeShift(list: LabelRect[], r: LabelRect, dys: number[], ymax: number, pad = 0.5): number | null {
  const s = freeSpot(list, r, dys, ymax, Infinity, pad, false); return s ? s[1] : null;
}
/** first [dx, dy] (device px) that clears every recorded label: each vertical shift in `dys` as drawn, then (when allowed) nudged right
 * past the labels it would sit on at its left end (the tick numbers down a plot's left edge); null if nothing fits inside the canvas */
export function freeSpot(list: LabelRect[], r: LabelRect, dys: number[], ymax: number, xmax: number, pad = 0.5, sideways = true, ymin = 0, xmin = 0): [number, number] | null {
  for (const dy of dys) {
    const c = { ...r, y0: r.y0 + dy, y1: r.y1 + dy };
    if (dy !== 0 && (c.y0 < ymin || c.y1 > ymax)) continue;
    const on = list.filter((o) => hit(o, c, pad));
    if (!on.length) return [0, dy];
    if (!sideways) continue;
    const left = on.filter((o) => o.x0 <= c.x0 + 4); if (left.length !== on.length) continue;
    const dx = Math.max(...left.map((o) => o.x1)) - c.x0 + 3, d = { ...c, x0: c.x0 + dx, x1: c.x1 + dx };
    if (d.x0 >= xmin && d.x1 <= xmax && !list.some((o) => hit(o, d, pad))) return [dx, dy];
  }
  return null;
}
export const labelOverlaps = (list: LabelRect[], r: LabelRect, pad = 0.5) => list.some((o) => hit(o, r, pad));
/** For a block of labels drawn together (a legend: swatches and rows that must stay aligned): the vertical shift, in the canvas's
 * user units, that moves the block's box [x0, x1] × [y0, y1] clear of the labels already drawn; 0 when it is already clear or nothing fits.
 * Draw the block's rows with role 'axis' afterwards so they stay where the block put them. */
export function freeBlockShift(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, step = 13, tries = 6): number {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null, cv = g.canvas as HTMLCanvasElement | undefined;
  if (!m || !cv || Math.abs(m.b) > 1e-9 || Math.abs(m.c) > 1e-9 || !(m.d > 0)) return 0;
  const r: LabelRect = { x0: m.a * x0 + m.e, x1: m.a * x1 + m.e, y0: m.d * y0 + m.f, y1: m.d * y1 + m.f, role: 'axis' }, dys = [0];
  for (let k = 1; k <= tries; k++) dys.push(k * step * m.d, -k * step * m.d);
  return (freeShift(labelsOn(cv), r, dys, cv.height || Infinity) ?? 0) / m.d;
}
