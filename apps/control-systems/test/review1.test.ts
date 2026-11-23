/** Review 1 (student review at 0048691): the numbers the new text quotes, against numbers.py [H4], [R2]–[R7] in the fixture. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as M from '../src/model/plants';
import { HOUSE_WALLS } from '../src/model/params';

const OUT = fs.readFileSync(path.join(__dirname, 'fixtures/numbers_output.txt'), 'utf8');
const line = (re: RegExp) => { const l = OUT.split('\n').find((x) => re.test(x)); if (!l) throw new Error(`no line ${re}`); return l; };
const nearAbs = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

describe('review 1', () => {
  it('[H4] W1: PI adds 611 W, P 550 W; split by wall', () => {
    const G0 = M.dc(M.houseG2()), L0 = 1100 * G0, P = (5 - 5 / (1 + L0)) / G0, PI = 5 / G0;
    nearAbs(PI, 611, 0.5); nearAbs(P, 550, 0.5);
    const l = line(/PI \(bedroom back on its set point\)/), m = l.match(/= ([\d.]+) W \(living-room wall ([\d.]+) W \+ bedroom wall ([\d.]+) W\)/)!;
    nearAbs(HOUSE_WALLS.Gout * 6, +m[2], 0.5); nearAbs(HOUSE_WALLS.Gout * 5, +m[3], 0.5); nearAbs(PI, +m[1], 0.5);
  });
  it('[R2] PD (1000, 0, 120): ideal and filtered D, on the measurement and on the error', () => {
    for (const dm of [true, false]) for (const Nf of [null, 200]) {
      const s = M.dishCard({ Kp: 1000, Ki: 0, Kd: 120, dm, Nf, T: 10 }), mt = M.cardMet(s.t, s.y, 0.1);
      const l = line(new RegExp(`^R2 PD \\(1000,0,120\\) D on ${dm ? 'measurement' : 'error'}, filter ${Nf ? 'N_f' : 'none'}`));
      nearAbs(mt.OS, +l.match(/OS ([\d.]+) %/)![1], 0.06);
    }
  });
  it('[R4] A12 stiction: PD (2000, 0, 200) stops short on small steps; A14 hunts under PID, a dead band stops it', () => {
    for (const r of [0.02, 0.2]) {
      const s = M.simStick(2000, 0, 200, { r, T: 10 }), l = line(new RegExp(`^R4 A12 PD \\(2000,0,200\\), step ${r} rad, stiction 20/10`));
      nearAbs(((r - s.final) * 180) / Math.PI, +l.match(/stops \+([\d.]+) deg/)![1], 0.0006);
      const f = M.simStick(2000, 0, 200, { r, T: 10, Ts: 0, Tc: 0 }); nearAbs((100 * (Math.max(...f.y) - r)) / r, 2.0, 0.06);
    }
    const a = M.simStick(2000, 1000, 200, { T: 200, every: 100 }), e = Array.from(a.y).map((y, i) => [a.t[i], ((y - 0.1) * 180) / Math.PI]).filter(([t]) => t >= 60).map(([, x]) => x);
    nearAbs(Math.min(...e), -0.145, 0.002); nearAbs(Math.max(...e), 0.147, 0.002);
    const b = M.simStick(2000, 1000, 200, { T: 200, edb: 0.003, every: 100 }); nearAbs(((0.1 - b.final) * 180) / Math.PI, -0.149, 0.0006); // e = θ_r − θ (pass 4c)
  });
  it('[R5] dish loop crossover and phase margin', () => {
    for (const [Kp, Ki, Kd, wc, pm] of [[1000, 0, 0, 9.9, 11.4], [1000, 0, 120, 13.86, 67.2], [2000, 1000, 200, 21.73, 70.3]]) {
      let w = 0.1, best = { w: 0, d: Infinity, ph: 0 };
      for (let i = 0; i <= 200000; i++, w = 0.1 * 10 ** (4 * i / 200000)) {
        // L(jω) = 0.1/(jω(jω + 2)) · (Kp + Ki/(jω) + Kd·jω)
        const re = Kp, im = Kd * w - Ki / w, dr = -w * w, di = 2 * w, nr = 0.1 * re, ni = 0.1 * im;
        const den2 = dr * dr + di * di, Lr = (nr * dr + ni * di) / den2, Li = (ni * dr - nr * di) / den2, mag = Math.hypot(Lr, Li);
        if (Math.abs(mag - 1) < best.d) best = { w, d: Math.abs(mag - 1), ph: (Math.atan2(Li, Lr) * 180) / Math.PI };
      }
      nearAbs(best.w, wc, 0.01); nearAbs(180 + best.ph, pm, 0.06);
    }
  });
});
