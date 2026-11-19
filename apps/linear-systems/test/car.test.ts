/** Every car number the page states, recomputed from the tutor's model (apps/linear-systems/src/figs/car.ts). */
import { describe, it, expect } from 'vitest';
import { CAR, CAR_SYM, worn, carModes, carA, forceB, frontFR, peaks, ctrbM, obsvM, rank, minEnergy, bumpResponse, overshoot, cyclesTo5pct, zPole, cabs, DEG, gramian } from '../src/figs/car';

const close = (x: number, want: number, tol: number) => expect(Math.abs(x - want), `${x} vs ${want}`).toBeLessThanOrEqual(tol);
const dB = (g: number) => 20 * Math.log10(g);
describe('car model (main set)', () => {
  it('damping is proportional, C = 0.08 s · K', () => { expect(CAR.cf).toBeCloseTo(0.08 * CAR.kf, 6); expect(CAR.cr).toBeCloseTo(0.08 * CAR.kr, 6); });
  const [bounce, pitch] = carModes(CAR);
  it('bounce: 1.151 Hz, ζ 0.289, s = −2.092 ± 6.923j, node 1.06 m behind the rear axle', () => {
    close(bounce.fn, 1.151, 0.0005); close(bounce.zeta, 0.289, 0.0005); close(bounce.s[0], -2.092, 0.0005); close(bounce.s[1], 6.923, 0.001); // 6.9225: the tutor rounds up
    close(-bounce.node - CAR.b, 1.06, 0.005); expect(bounce.thPerZ[0]).toBeGreaterThan(0); // slight nose-up with heave
    expect(Math.abs(bounce.thPerZ[0])).toBeLessThan(0.5);
  });
  it('pitch: 1.419 Hz, ζ 0.357, s = −3.178 ± 8.328j, node at x = +0.56 m', () => {
    close(pitch.fn, 1.419, 0.0005); close(pitch.zeta, 0.357, 0.0005); close(pitch.s[0], -3.178, 0.0005); close(pitch.s[1], 8.328, 0.0005); close(pitch.node, 0.56, 0.005);
  });
  it('front-wheel road input: heave peak 1.18× (+1.4 dB) at 1.08 Hz, one hump', () => {
    const pk = peaks((f) => cabs(frontFR(CAR, f).z));
    expect(pk.length).toBe(1); close(pk[0].f, 1.08, 0.005); close(pk[0].g, 1.18, 0.005); close(dB(pk[0].g), 1.4, 0.05);
  });
  it('worn shocks (20%): heave peak +14.6 dB at 1.15 Hz; pitch peaks at 1.14 and 1.43 Hz; ζ 0.058 / 0.071', () => {
    const W = worn(CAR); const hz = peaks((f) => cabs(frontFR(W, f).z)), th = peaks((f) => cabs(frontFR(W, f).th));
    const top = hz.reduce((a, b) => (b.g > a.g ? b : a)); close(top.f, 1.15, 0.005); close(dB(top.g), 14.6, 0.05);
    expect(th.length).toBe(2); close(th[0].f, 1.14, 0.005); close(th[1].f, 1.43, 0.005);
    const [wb, wp] = carModes(W); close(wb.zeta, 0.058, 0.0005); close(wp.zeta, 0.071, 0.0005);
  });
  it('worn shocks: overshoot ~39% → ~83%, ~1.6 → ~8 bounce cycles to settle', () => {
    const [b] = carModes(CAR), [wb] = carModes(worn(CAR));
    close(overshoot(b.zeta), 39, 0.5); close(overshoot(wb.zeta), 83, 0.5); close(cyclesTo5pct(b.zeta), 1.6, 0.05); close(cyclesTo5pct(wb.zeta), 8, 0.3);
  });
  it('road speed = f × spacing: 10 m spacing excites bounce at ~41 km/h, pitch at ~51 km/h', () => { close(bounce.fn * 10 * 3.6, 41, 0.5); close(pitch.fn * 10 * 3.6, 51, 0.5); });
  it('bump: rear 0.18 s after front; peak heave 8.8 mm at 0.24 s; pitch +0.22° then −0.19°; worn stays above 1 mm until 3.9 s (good 1.2 s)', () => {
    const r = bumpResponse(CAR); close(r.Td, 0.18, 0.0005);
    let iz = 0; r.xs.forEach((x, i) => { if (Math.abs(x[0]) > Math.abs(r.xs[iz][0])) iz = i; });
    close(r.xs[iz][0] * 1000, 8.8, 0.05); close(r.ts[iz], 0.24, 0.005);
    const th = r.xs.map((x) => x[1] * DEG); close(Math.max(...th), 0.22, 0.005); close(Math.min(...th), -0.19, 0.005);
    expect(th.indexOf(Math.max(...th))).toBeLessThan(th.indexOf(Math.min(...th)));
    const last = (xs: number[][], ts: number[]) => { let t = 0; xs.forEach((x, i) => { if (Math.abs(x[0]) > 1e-3) t = ts[i]; }); return t; };
    close(last(r.xs, r.ts), 1.2, 0.05); const w = bumpResponse(worn(CAR)); close(last(w.xs, w.ts), 3.9, 0.05);
  });
  it('controllability: a CG force moves both modes on the main car (rank 4)', () => { expect(rank(ctrbM(carA(CAR), forceB(CAR, [0])))).toBe(4); });
  it('the main car is blind at its pitch node: a push or a height sensor there neither moves nor sees pitch (rank 2)', () => {
    const xn = carModes(CAR)[1].node; // proportional damping: real mode shapes, exact node
    const A = carA(CAR); expect(rank(ctrbM(A, forceB(CAR, [xn])))).toBe(2); expect(rank(obsvM(A, [[1, xn, 0, 0]]))).toBe(2);
  });
  it('min-energy active suspension: 2° nose-down to level and still in 0.5 s: 476 N front / 652 N rear peak, E = 96,160 N²·s; front peaks part-way through, rear right at the end', () => {
    const x0 = [0, -2 / DEG, 0, 0]; const r = minEnergy(CAR, [CAR.a, -CAR.b], x0, 0.5);
    const ts = Array.from({ length: 501 }, (_, i) => i * 0.001), U = ts.map((t) => r.u(t));
    close(Math.max(...U.map((u) => Math.abs(u[0]))), 476, 1); close(Math.max(...U.map((u) => Math.abs(u[1]))), 652, 1); close(r.energy, 96160, 100);
    // small at the start (about 100 N combined), largest at the very end (about 736 N). NB the strict minimum is near 0.04 s, not t = 0.
    const mag = U.map((u) => Math.hypot(u[0], u[1])); close(mag[0], 100, 1); expect(mag[0]).toBeLessThan(0.15 * Math.max(...mag));
    expect(mag.indexOf(Math.max(...mag))).toBe(500);
    const fi = U.map((u) => Math.abs(u[0])), ri = U.map((u) => Math.abs(u[1]));
    const tf = ts[fi.indexOf(Math.max(...fi))]; expect(tf).toBeGreaterThan(0.2); expect(tf).toBeLessThan(0.35); // front: part-way (≈ 0.28 s)
    expect(ri.indexOf(Math.max(...ri))).toBe(500); // rear: right at the end
  });
  it('T = 1 s needs only ~120 N; front-only at 0.5 s needs 12.9 kN', () => {
    const x0 = [0, -2 / DEG, 0, 0]; const ts = Array.from({ length: 1001 }, (_, i) => i / 1000);
    const r1 = minEnergy(CAR, [CAR.a, -CAR.b], x0, 1); close(Math.max(...ts.map((t) => Math.max(...r1.u(t).map(Math.abs)))), 120, 10);
    const rf = minEnergy(CAR, [CAR.a], x0, 0.5); close(Math.max(...ts.map((t) => Math.abs(rf.u(t * 0.5)[0]))), 12900, 100);
  });
  it('z-plane at 20 Hz: bounce r 0.901 at 19.8°, pitch r 0.853 at 23.9°', () => {
    const zb = zPole(bounce.s, 20), zp = zPole(pitch.s, 20);
    close(zb.r, 0.901, 0.0005); close(zb.deg, 19.8, 0.05); close(zp.r, 0.853, 0.0005); close(zp.deg, 23.9, 0.05);
  });
});
describe('car model (symmetric set, centre push/sensor story only)', () => {
  it('kf·a = kr·b and cf·a = cr·b', () => { expect(CAR_SYM.kf * CAR_SYM.a).toBeCloseTo(CAR_SYM.kr * CAR_SYM.b, 6); expect(CAR_SYM.cf * CAR_SYM.a).toBeCloseTo(CAR_SYM.cr * CAR_SYM.b, 6); });
  it('pure bounce 1.197 Hz, pure pitch 1.344 Hz (undamped), node exactly at the CG', () => {
    const p = CAR_SYM; close(Math.sqrt((p.kf + p.kr) / p.m) / (2 * Math.PI), 1.197, 0.0005); close(Math.sqrt((p.kf * p.a ** 2 + p.kr * p.b ** 2) / p.J) / (2 * Math.PI), 1.344, 0.0005);
    const [b, pt] = carModes(p); expect(b.thPerZ[0]).toBe(0); expect(pt.node).toBe(0);
  });
  it('a CG force cannot start pitch (rank 2 of 4); a heave sensor at the CG cannot see pitch; a pitch gyro cannot see bounce', () => {
    const A = carA(CAR_SYM); expect(rank(ctrbM(A, forceB(CAR_SYM, [0])))).toBe(2);
    expect(rank(obsvM(A, [[1, 0, 0, 0]]))).toBe(2); expect(rank(obsvM(A, [[0, 0, 0, 1]]))).toBe(2);
  });
  it('a CG force alone cannot level the symmetric car (singular Gramian)', () => {
    const W = gramian(carA(CAR_SYM), forceB(CAR_SYM, [0]), 0.5); expect(rank(W, 1e-9)).toBe(2);
  });
});
