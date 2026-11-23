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

export function wrap(g: CanvasRenderingContext2D, s: string, maxW: number, size = 10, family = 'system-ui, sans-serif'): string[] {
  g.font = `${size}px ${family}`;
  const out: string[] = [];
  let line = '';
  const flushChunk = (word: string) => {
    if (g.measureText(word).width <= maxW) { line = word; return; }
    let chunk = '';
    for (const ch of word) {
      const try0 = chunk + ch;
      if (chunk && g.measureText(try0).width > maxW) { out.push(chunk); chunk = ch; } else chunk = try0;
    }
    line = chunk;
  };
  for (const word of s.split(' ')) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > maxW && line) { out.push(line); flushChunk(word); }
    else line = t;
  }
  if (line) out.push(line);
  return out;
}
export function para(g: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, color = col.text(), size = 10, align: CanvasTextAlign = 'left'): number {
  for (const l of wrap(g, s, maxW, size)) { text(g, l, x, y, color, align, size); y += size + 3; } return y;
}

export function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (!(w > 0) || !(h > 0)) return;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
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


/** Format a log₁₀ value as the real quantity (0.01, 0.1, 1, 10, …). */
export function fmtPow10(logv: number): string {
  const v = 10 ** logv;
  if (!Number.isFinite(v) || v <= 0) return '—';
  const exp = Math.round(logv);
  if (Math.abs(logv - exp) < 1e-6) {
    if (exp === 0) return '1';
    if (exp > 0 && exp <= 4) return String(10 ** exp);
    if (exp < 0 && exp >= -4) return (10 ** exp).toFixed(-exp);
  }
  if (v >= 100) return String(+v.toFixed(0));
  if (v >= 1) return String(+v.toPrecision(3));
  return String(+v.toPrecision(2));
}

/** Draw a parameters table. When the canvas is too narrow for one row of columns,
 *  each design is a stacked, labelled block so values never sit under the wrong header. */
export function drawKeyValueTable(
  g: CanvasRenderingContext2D, w: number, h: number, rows: string[][],
  opts?: { footer?: string; key?: string },
): void {
  const footerH = (opts?.footer ? 16 : 0) + (opts?.key ? 16 : 0);
  const cols = rows[0]?.length ?? 0;
  if (!cols) return;
  const headers = rows[0];
  const body = rows.slice(1);
  const footerY0 = h - 6;
  let fy = footerY0;
  if (opts?.footer) { text(g, opts.footer, 6, fy, col.muted(), 'left', 10); fy -= 15; }
  if (opts?.key) text(g, opts.key, 6, fy, col.muted(), 'left', 10);
  const availH = h - footerH - 6;
  const padX = 8;
  const minSize = 11;
  const measure = (sz: number) => {
    g.font = `600 ${sz}px system-ui, sans-serif`;
    return Array.from({ length: cols }, (_, j) => Math.max(12, ...rows.map((r) => g.measureText(r[j] ?? '').width)) + padX);
  };
  let size = 13;
  let widths = measure(size);
  while (size > minSize && widths.reduce((a, b) => a + b, 0) > w - 8) { size -= 1; widths = measure(size); }
  const total = widths.reduce((a, b) => a + b, 0);
  const fits = total <= w - 8;
  if (fits) {
    widths = widths.map((x) => x * ((w - 8) / total));
    const rowH = Math.min(28, Math.max(18, (availH) / Math.max(1, rows.length)));
    const xs: number[] = [];
    let x0 = 4;
    for (const ww of widths) { xs.push(x0); x0 += ww; }
    rows.forEach((row, i) => row.forEach((c, j) => {
      const align: CanvasTextAlign = (j === 0 || i === 0) ? 'left' : 'right';
      const x = align === 'left' ? xs[j] + 4 : xs[j] + widths[j] - 4;
      text(g, c, x, 14 + i * rowH, i === 0 ? col.muted() : col.text(), align, size);
    }));
    return;
  }
  // stacked: one block per design, labels and values on the same line in wraps of 4
  const pairsFor = (row: string[]) => headers.map((h, j) => (j === 0 ? null : [h, row[j]] as [string, string])).filter(Boolean) as [string, string][];
  const lineH = 16, blockPad = 8, titleH = 16;
  let y = 16;
  g.font = '11px system-ui, sans-serif';
  for (const row of body) {
    text(g, row[0] ?? '', 6, y, col.text(), 'left', 12);
    y += titleH;
    const pairs = pairsFor(row);
    let x = 6, rowTop = y;
    for (const [lab, val] of pairs) {
      const chunk = `${lab}  ${val}`;
      const cw = g.measureText(chunk).width + 16;
      if (x > 6 && x + cw > w - 6) { x = 6; y += lineH; }
      text(g, lab, x, y, col.muted(), 'left', 11);
      const lw = g.measureText(lab).width;
      text(g, val, x + lw + 6, y, col.text(), 'left', 11);
      x += cw;
    }
    y = Math.max(y, rowTop) + lineH + blockPad;
  }
}
