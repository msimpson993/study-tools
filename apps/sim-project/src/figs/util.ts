/** Shared drawing helpers for sim-project figures. Theme colours only. */
import { col, text, type V2 } from '@study/core';

export type V = Record<string, number | string | boolean>;
export const num = (v: V, k: string, d = 0) => (typeof v[k] === 'number' ? (v[k] as number) : v[k] === undefined || v[k] === '' ? d : Number(v[k]));
export const str = (v: V, k: string, d = '') => (v[k] === undefined ? d : String(v[k]));
export const on = (v: V, k: string) => v[k] === true || v[k] === 'true' || v[k] === 1;
/** Fixed decimals with a real minus sign; a value that rounds to zero prints as 0. */
export const f = (x: number, d = 2) => (Number.isFinite(x) ? (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace('-', '−') : '—');
export const lin = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Comma-separated figure params (`K: [20, 100]` is joined to "20,100" by the content loader). */
export const numList = (v: unknown): number[] => {
  if (typeof v === 'number' && Number.isFinite(v)) return [v];
  if (typeof v === 'string') return v.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  return [];
};
export const strList = (v: unknown): string[] => {
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

export function wrap(g: CanvasRenderingContext2D, s: string, maxW: number, size = 10): string[] {
  g.font = `${size}px system-ui, sans-serif`; const out: string[] = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? `${line} ${word}` : word; if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}
export function para(g: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, color = col.text(), size = 10, align: CanvasTextAlign = 'left'): number {
  for (const l of wrap(g, s, maxW, size)) { text(g, l, x, y, color, align, size); y += size + 3; } return y;
}

export function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
}

export function arrow(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, w = 1.6) {
  const ang = Math.atan2(y2 - y1, x2 - x1), L = 7;
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - L * Math.cos(ang - 0.4), y2 - L * Math.sin(ang - 0.4));
  g.lineTo(x2 - L * Math.cos(ang + 0.4), y2 - L * Math.sin(ang + 0.4)); g.closePath(); g.fill();
}

export function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, stroke: string, fill?: string, size = 10) {
  if (fill) { g.fillStyle = fill; rounded(g, x, y, w, h, 5); g.fill(); }
  g.strokeStyle = stroke; g.lineWidth = stroke === col.accent() || stroke === (typeof getComputedStyle === 'function' ? '' : '') ? 2.4 : 1.4;
  g.lineWidth = 1.6; rounded(g, x, y, w, h, 5); g.stroke();
  text(g, label, x + w / 2, y + h / 2 + 4, col.text(), 'center', size);
}

export type V2r = V2;
