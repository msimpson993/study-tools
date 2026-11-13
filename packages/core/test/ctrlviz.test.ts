import { describe, it, expect } from 'vitest';
import { splaneDrag, splaneFrame, locusDrag, wnZeta, poleFromWnZeta, heightColor, suggestKMax } from '../src/ctrlviz';
import { rlocus, tf, polyMul, C, cabs } from '../src/dsp';

describe('wnZeta / poleFromWnZeta', () => {
  it('round-trips underdamped poles and reports ζ < 0 for unstable ones', () => {
    for (const [wn, z] of [[1, 0.5], [3, 0.1], [0.7, 0.99]]) { const q = wnZeta(poleFromWnZeta(wn, z)); expect(q.wn).toBeCloseTo(wn, 12); expect(q.zeta).toBeCloseTo(z, 12); }
    expect(wnZeta(C(0.5, 1)).zeta).toBeLessThan(0); expect(wnZeta(C(0, 0)).zeta).toBe(1);
  });
  it('ζ ≥ 1 gives the slower real pole; the cart is −1', () => { expect(poleFromWnZeta(Math.SQRT2, 3 / (2 * Math.SQRT2)).re).toBeCloseTo(-1, 12); expect(poleFromWnZeta(2, 1)).toEqual({ re: -2, im: 0 }); });
});

describe('splaneDrag (pure pointer logic)', () => {
  const W = 360, H = 220, f = splaneFrame(W, H, 4);
  it('grabs within the radius of a handle or its mirror, ignores far points, and reports hover', () => {
    const got: [string, number, number][] = [];
    const p = splaneDrag({ range: 4, handles: () => [{ id: 'a', s: C(-1, 2) }], upperOnly: true, onDrag: (id, s) => got.push([id, s.re, s.im]) });
    expect(p.down(f.X(-1) + 5, f.Y(2) - 4, W, H)).toBe(true); expect(p.down(f.X(-1), f.Y(-2), W, H)).toBe(true); expect(p.down(f.X(3), f.Y(3), W, H)).toBe(false);
    expect(p.hover!(f.X(-1), f.Y(2), W, H)).toBe(true); expect(p.hover!(f.X(2), f.Y(0), W, H)).toBe(false);
    p.down(f.X(-1), f.Y(2), W, H); p.move(f.X(-2), f.Y(-1.5), W, H); // mirrored into the upper half plane
    expect(got[0][0]).toBe('a'); expect(got[0][1]).toBeCloseTo(-2, 9); expect(got[0][2]).toBeCloseTo(1.5, 9);
    p.up!(); got.length = 0; p.move(f.X(0), f.Y(0), W, H); expect(got).toEqual([]); // after release nothing moves
  });
  it('realOnly pins im = 0 and the view limit clamps wild drags', () => {
    const got: [number, number][] = [];
    const p = splaneDrag({ range: 4, handles: () => [{ id: 'r', s: C(-2, 0) }], realOnly: ['r'], onDrag: (_i, s) => got.push([s.re, s.im]) });
    p.down(f.X(-2), f.Y(0), W, H); p.move(f.X(-1), f.Y(3), W, H); p.move(1e6, 0, W, H);
    expect(got[0][1]).toBe(0); expect(got[0][0]).toBeCloseTo(-1, 9); expect(got[1][0]).toBeLessThanOrEqual(4.6 + 1e-9);
  });
});

describe('locusDrag', () => {
  const rl = rlocus(tf([1], polyMul([1, 0], polyMul([1, 1], [1, 2])))), W = 360, H = 220, f = splaneFrame(W, H, 3.2, -1.1);
  it('slides K along the real branch: at s = −2.5 the gain is |D/N| = 1.875', () => {
    const ks: number[] = [], p = locusDrag({ rl, range: 3.2, reCenter: -1.1, onK: (k) => ks.push(k) });
    expect(p.down(f.X(-2), f.Y(0), W, H)).toBe(true); p.move(f.X(-2.5), f.Y(0), W, H);
    expect(ks[ks.length - 1]).toBeGreaterThan(1.6); expect(ks[ks.length - 1]).toBeLessThan(2.2);
    expect(p.down(f.X(2.5), f.Y(2.5), W, H)).toBe(false);
  });
});

describe('small helpers', () => {
  it('heightColor is monotone in brightness and clamps', () => {
    const lum = (t: number) => { const [r, g, b] = heightColor(t); return r + g + b; };
    let prev = -1; for (let t = 0; t <= 1; t += 0.1) { expect(lum(t)).toBeGreaterThanOrEqual(prev); prev = lum(t); }
    expect(heightColor(-5)).toEqual(heightColor(0)); expect(heightColor(9)).toEqual(heightColor(1));
  });
  it('suggestKMax covers the jω crossing (K = 6 → 15) and the cart breakaway (0.25 → 2.5)', () => {
    expect(suggestKMax(rlocus(tf([1], polyMul([1, 0], polyMul([1, 1], [1, 2])))))).toBe(15);
    expect(suggestKMax(rlocus(tf([1], [1, 3, 2])))).toBe(2.5);
    expect(cabs(C(3, 4))).toBe(5);
  });
});
