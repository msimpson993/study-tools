/** Motor load-response y-axis: every visible curve fills at least 30 % of its plot (or inset). */
import { describe, it, expect } from 'vitest';
import { motorNumbers } from '../src/model/plants';
import { lin } from '../src/figs/util';
import { motorPlotLayout, spanFraction, type LoopView } from '../src/figs/motorScale';

const AXES = [7, 0.02] as const;
const LOOPS: LoopView[] = ['open', 'closed', 'both'];
const CASES = [
  { name: 'default (Ka = 54, Kt = 1)', n: motorNumbers() },
  { name: 'Kt = 2', n: motorNumbers({ Kt: 2 }) },
  { name: 'just under 0.02 (Ka = 7.5)', n: motorNumbers({ Ka: 7.5 }) },
  { name: 'double inertia (J = 4)', n: motorNumbers({ J: 4 }) },
];

describe('motor plot y-axis autoscale', () => {
  for (const c of CASES) {
    describe(c.name, () => {
      for (const axis of AXES) {
        for (const loop of LOOPS) {
          it(`${loop}, ${axis} s: each visible curve spans ≥ 30 % of its frame`, () => {
            const t = lin(0, axis, 400);
            const openY = t.map(c.n.wo);
            const closedY = t.map(c.n.wc);
            const layout = motorPlotLayout(openY, closedY, loop);
            const checks: { name: string; y: number[]; range: [number, number] }[] = [];
            if (loop === 'open' || loop === 'both') {
              checks.push({ name: 'open', y: openY, range: layout.main });
            }
            if (loop === 'closed') {
              checks.push({ name: 'closed', y: closedY, range: layout.main });
            }
            if (loop === 'both') {
              if (layout.inset && layout.insetFor === 'closed') {
                checks.push({ name: 'closed (inset)', y: closedY, range: layout.inset });
              } else if (layout.inset && layout.insetFor === 'open') {
                // open was checked against main; if it needed an inset, test the inset instead
                checks[0].range = layout.inset;
                checks[0].name = 'open (inset)';
                checks.push({ name: 'closed', y: closedY, range: layout.main });
              } else {
                checks.push({ name: 'closed', y: closedY, range: layout.main });
              }
            }
            for (const ch of checks) {
              const frac = spanFraction(ch.y, ch.range);
              expect(frac, `${ch.name} spans ${frac} of ${ch.range}`).toBeGreaterThanOrEqual(0.30);
            }
            if (loop === 'both' && axis === 7) {
              expect(layout.insetFor, '7 s both should zoom the tiny closed curve').toBe('closed');
              expect(layout.note).toMatch(/y zoomed/i);
              expect(layout.note).toMatch(/closed loop/);
            }
          });
        }
      }
    });
  }
});
