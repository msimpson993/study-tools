import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { simulatePid } from '@study/core/dsp';

const S = createRequire(import.meta.url)('./legacy-pidsim.cjs');
// the four quiz scopes that moved from inline SVG to `figure: pid-step` (the params must match quiz.yaml)
const CASES: [string, any][] = [
  ['pid-29 slow', { plant: 'p2', Kp: 0.3, Ki: 0.2, T: 30 }],
  ['pid-31 overshoot', { plant: 'p2', Kp: 2, Ki: 3.5, T: 15 }],
  ['pid-33 oscillation', { plant: 'p3', Kp: 8, T: 20 }],
  ['pid-43 two-degree-of-freedom', { plant: 'p2', Kp: 1.5, Ki: 4, T: 30, dist: { t: 15, amp: -1 } }],
];
describe('quiz scopes: core simulator reproduces the legacy page', () => {
  for (const [name, o] of CASES) it(name, () => {
    const core = simulatePid({ N: 20, dt: 0.01, ...o }), old = S.simulate({ N: 20, dt: 0.01, ...o });
    const n = Math.min(core.y.length, old.y.length); expect(n).toBeGreaterThan(1000);
    let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(core.y[i] - old.y[i]));
    expect(m).toBeLessThan(1e-5);
  });
  it('the overshoot scope peaks near 1.38 as its alt text says', () => {
    const y = simulatePid({ plant: 'p2', Kp: 2, Ki: 3.5, T: 15, N: 20, dt: 0.01 }).y;
    expect(Math.max(...y)).toBeGreaterThan(1.37); expect(Math.max(...y)).toBeLessThan(1.39);
  });
});
