/** Numbers the Nov 19 learner-review rewrite states in the boxes, recomputed from the models. */
import { describe, it, expect } from 'vitest';
import { spk, Hf, cabs, peakBand } from '../src/figs/ex';
import { CAR, minEnergy, DEG } from '../src/figs/car';

describe('Box 6 / Box 8: the three earbud frequencies and a₀, a₁', () => {
  const s = spk();
  it('fₙ = 717 Hz (undamped), f_d = 688 Hz (ring), gain peak 658 Hz, in that order', () => {
    expect(s.fn).toBeCloseTo(716.8, 0); expect(Math.round(s.fn)).toBe(717);
    expect(Math.round(s.fd)).toBe(688);
    const fp = peakBand().fPeak; expect(Math.round(fp)).toBe(658);
    expect(fp).toBeLessThan(s.fd); expect(s.fd).toBeLessThan(s.fn);
    // the peak sits at fₙ√(1 − 2ζ²)
    expect(fp).toBeCloseTo(s.fn * Math.sqrt(1 - 2 * s.zeta ** 2), 0);
  });
  it('a₀ = ωₙ² and a₁ = 2ζωₙ, with ζ = 0.281', () => {
    expect(s.a0).toBeCloseTo(s.wn ** 2, 10); expect(s.a1).toBeCloseTo(2 * s.zeta * s.wn, 10);
    expect(s.zeta).toBeCloseTo(0.281, 3);
  });
  it('gains quoted in Box 6: ×1.07 at 200 Hz, ×1.85 at the peak, ×0.06 at 3 kHz', () => {
    expect(cabs(Hf(200))).toBeCloseTo(1.07, 2); expect(cabs(Hf(peakBand().fPeak))).toBeCloseTo(1.85, 2); expect(cabs(Hf(3000))).toBeCloseTo(0.06, 2);
  });
});

describe('Box 14: E is the least total squared force over the move', () => {
  it('∫(u_f² + u_r²) dt over 0.5 s of the least-energy input = 96,160 N²·s; front dips to −476 N at 0.28 s, rear −652 N at the end', () => {
    const r = minEnergy(CAR, [CAR.a, -CAR.b], [0, -2 / DEG, 0, 0], 0.5);
    const n = 20000, dt = 0.5 / n; let E = 0;
    for (let i = 0; i < n; i++) { const u = r.u((i + 0.5) * dt); E += (u[0] ** 2 + u[1] ** 2) * dt; }
    expect(E).toBeGreaterThan(96060); expect(E).toBeLessThan(96260);
    expect(Math.abs(E - r.energy) / r.energy).toBeLessThan(1e-3);
    const ts = Array.from({ length: 5001 }, (_, i) => (0.5 * i) / 5000), U = ts.map((t) => r.u(t));
    const iMin = U.reduce((b, u, i) => (u[0] < U[b][0] ? i : b), 0);
    expect(Math.round(U[iMin][0])).toBe(-476); expect(ts[iMin]).toBeCloseTo(0.28, 2);
    expect(Math.round(U[5000][1])).toBe(-652);
  });
});
