import { describe, it, expect } from 'vitest';
import { cartStepInfo, polesAt, pOnly, closedLoop } from '../src/cart';
import { dcGain } from '@study/core/dsp';

describe('control-systems running example (cart under P control)', () => {
  it('K = 7 gives the numbers quoted on the map: poles −1.5 ± j2.598, ζ = 0.5, ωn = 3', () => {
    const p = polesAt(7, 0).sort((a, b) => a.im - b.im);
    expect(p[1].re).toBeCloseTo(-1.5, 6); expect(p[1].im).toBeCloseTo(Math.sqrt(6.75), 6);
    const q = pOnly(7); expect(q.zeta).toBeCloseTo(0.5, 12); expect(q.wn).toBeCloseTo(3, 12); expect(q.ess).toBeCloseTo(2 / 9, 12);
  });
  it('K = 7 step: %OS ≈ 16.3 %, Ts ≈ 2.7 s, final value 7/9 (e_ss 22 %)', () => {
    const s = cartStepInfo(7);
    expect(s.overshootPct).toBeGreaterThan(16.2); expect(s.overshootPct).toBeLessThan(16.4);
    expect(s.settlingTime).toBeGreaterThan(2.6); expect(s.settlingTime).toBeLessThan(2.8);
    expect(s.yFinal).toBeCloseTo(7 / 9, 4);
    expect(dcGain(closedLoop(7, 0))).toBeCloseTo(7 / 9, 12);
  });
  it('open loop (K → 0): poles −1, −2; breakaway at −1.5 for K = 0.25', () => {
    const p = polesAt(1e-9, 0).map((c) => c.re).sort((a, b) => a - b);
    expect(p[0]).toBeCloseTo(-2, 6); expect(p[1]).toBeCloseTo(-1, 6);
    const crit = polesAt(0.25, 0); expect(crit[0].re).toBeCloseTo(-1.5, 5); expect(Math.abs(crit[0].im)).toBeLessThan(1e-4);
  });
  it('a controller zero at −1.5 stays stable and removes the overshoot at K = 7', () => {
    expect(cartStepInfo(7, 1.5).overshootPct).toBeLessThan(cartStepInfo(7).overshootPct);
  });
});
