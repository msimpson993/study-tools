import { describe, it, expect } from 'vitest';
import { fitText } from '../src/viz';

/** A stand-in 2D context: each character is 0.55 × the font size wide, canvas 300 device px, scale 1. */
function ctx(width = 300, a = 1, e = 0) {
  let px = 11;
  return {
    canvas: { width },
    get font() { return `${px}px x`; },
    set font(f: string) { px = parseFloat(f); },
    measureText: (s: string) => ({ width: s.length * px * 0.55 }),
    getTransform: () => ({ a, b: 0, c: 0, d: a, e, f: 0 }),
  } as unknown as CanvasRenderingContext2D;
}

describe('fitText keeps plot labels inside the canvas (A1)', () => {
  it('leaves a label that fits alone', () => {
    const f = fitText(ctx(), 'short', 10, 'left', 11);
    expect(f).toMatchObject({ size: 11, x: 10, lines: ['short'] });
  });
  it('shrinks, then slides a right-edge label inside', () => {
    const s = '64 bins, 125.0 Hz apart; the ring itself is ≈ 400 Hz wide'; // 57 chars ≈ 345 px at 11 px
    const f = fitText(ctx(), s, 296, 'right', 11);
    expect(f.x0).toBeGreaterThanOrEqual(2 - 1e-9); expect(f.x1).toBeLessThanOrEqual(298 + 1e-9);
    expect(f.size).toBeLessThan(11); expect(f.size).toBeGreaterThanOrEqual(11 * 0.72 - 1e-9);
  });
  it('splits a label wider than the whole canvas over two lines at the middle space', () => {
    const f = fitText(ctx(160), 'harmonics up to k = 5 carry 93.3% of the power (Parseval)', 8, 'left', 11);
    expect(f.lines.length).toBe(2); expect(f.x0).toBeGreaterThanOrEqual(2 - 1e-9);
  });
  it('works in a scaled, translated sub-panel (device pixels)', () => {
    const f = fitText(ctx(600, 2, 100), 'a long label that needs room', 120, 'left', 11); // user x 120 → device 340; canvas in user units [−50, 250]
    expect(2 * f.x1 + 100).toBeLessThanOrEqual(600);
  });
});
