/**
 * Every number the page quotes is recomputed by src/model and checked here against the tutor's numbers.py output
 * (test/fixtures/numbers_output.txt, copied verbatim from the tutor's batch 3). If the corner parameters change
 * (src/model/params.ts), regenerate the fixture with the tutor's script and update the page text with it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tf, polyMul } from '@study/core/dsp';
import { HOUSE } from '@study/core/models';
import * as M from '../src/model/plants';
import { HOUSE_WALLS, CORNER, DISH, DISH_TUNED, DISH_LAG_RETUNE } from '../src/model/params';

const OUT = fs.readFileSync(path.join(__dirname, 'fixtures/numbers_output.txt'), 'utf8');
/** The numbers on the first output line matching `re` (minus signs kept). */
const nums = (re: RegExp): number[] => { const line = OUT.split('\n').find((l) => re.test(l)); if (!line) throw new Error(`no line ${re}`); return (line.replace(re, '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number); };
const grab = (re: RegExp): number => { const m = OUT.match(re); if (!m) throw new Error(`no match ${re}`); return Number(m[1]); };
const near = (a: number, b: number, tol = 0.005) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(Math.max(Math.abs(b) * tol, 1e-9));
const nearAbs = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

describe('house (core HOUSE, unchanged)', () => {
  it('walls and A reproduce the core model', () => {
    expect(M.houseA()).toEqual(HOUSE.A.map((r) => [...r]));
    nearAbs(HOUSE_WALLS.Gin, grab(/between-room conductance = C_th\*1\/h = ([\d.]+)/), 0.05);
    nearAbs(HOUSE_WALLS.Gout, grab(/leak to outdoors = C_th\*0\.2\/h = ([\d.]+)/), 0.05);
  });
  it('[H1] G(s), DC gains, steady state, power to hold', () => {
    near(M.dc(M.houseG2()) * 1000, grab(/= ([\d.]+) K per kW/));
    near(M.dc(M.houseG1()), grab(/zero at -1\.2 between the poles; DC ([\d.]+)/));
    const [x1, x2] = M.houseSteadyAt(2500);
    nearAbs(x1, grab(/room 1 ([\d.]+) K, room 2/), 0.006); nearAbs(x2, grab(/room 2 ([\d.]+) K above outdoor/), 0.006);
    nearAbs(15 / M.dc(M.houseG2()), grab(/\(20 C\): (\d+) W/), 0.5); nearAbs(13 / M.dc(M.houseG2()), grab(/\(18 C\): (\d+) W/), 0.5);
    expect(M.roots(M.housePoly()).map((p) => +p.re.toFixed(6))).toEqual([-0.2, -2.2]);
    expect(M.houseGd().num.map((v) => +v.toFixed(6))).toEqual([0.2, 0.44]);
  });
  it('[H2] step residues, x2 at 1/5/10 h, metrics, stand-in gap', () => {
    const r = M.houseStepResidues(); const pf = nums(/^partial fractions: x2\(t\) = /); // [r0, r1, -0.2, r2, -2.2, …]
    nearAbs(r.r0, pf[0], 1e-4); nearAbs(r.r1, pf[1], 1e-4); nearAbs(r.r2, pf[3], 1e-4);
    nearAbs(r.x2(1), grab(/x2\(1 h\) = ([\d.]+)/), 6e-4); nearAbs(r.x2(5), grab(/x2\(5 h\) = ([\d.]+)/), 6e-4); nearAbs(r.x2(10), grab(/x2\(10 h\) = ([\d.]+)/), 6e-4);
    const m = M.stepMetrics(tf([9], M.housePoly()), 60, 60001);
    nearAbs(m.Ts, 20.04, 0.01); nearAbs(m.Tr1090, 11.06, 0.01);
    let gap = 0; for (let t = 0; t <= 40; t += 0.001) gap = Math.max(gap, Math.abs(r.x2(t) - r.r0 * (1 - Math.exp(-t / 5))));
    nearAbs(gap, grab(/max gap ([\d.]+) K; its Ts/), 6e-4);
  });
  it('[H3] frequency-matched first-order model', () => {
    const asc = [1, 2.4 / 0.44, 1 / 0.44]; const D2 = M.deltaQ(asc, 1);
    nearAbs(D2, grab(/Delta2 = ([\d.]+) -> d1/), 1e-4); nearAbs(Math.sqrt(D2), grab(/-> d1 = ([\d.]+) h/), 1e-4);
  });
  it('[H4] thermostat P / PI and the cold front', () => {
    const p1100 = M.stepMetrics(M.thermostatTF(1100), 20, 20001); nearAbs(p1100.OS, 11.18, 0.02); nearAbs(p1100.Ts, 2.805, 0.005);
    const p500 = M.stepMetrics(M.thermostatTF(500), 20, 20001); nearAbs(p500.OS, 1.477, 0.01); nearAbs(p500.Ts, 2.519, 0.005);
    const pi = M.stepMetrics(M.thermostatTF(1100, 200), 40, 40001); nearAbs(pi.OS, 11.37, 0.02); nearAbs(pi.Ts, 3.907, 0.005);
    const P = M.houseColdFront(1100, 0), PI = M.houseColdFront(1100, 200), OL = M.houseColdFront(0, 0);
    nearAbs(OL.final, -4.959, 0.001); nearAbs(P.final, -0.5, 0.001); nearAbs(P.worst, -0.605, 0.001); nearAbs(PI.final, -0.007, 0.001); nearAbs(PI.worst, -0.581, 0.001);
    nearAbs(P.uFinal, 550, 1); nearAbs(P.peakU, 666, 1); nearAbs(PI.uFinal, 611, 1); nearAbs(PI.peakU, 737, 1);
    nearAbs((2.4 * (0.44 + M.b * 1100)) / M.b, 2933.33, 0.01);
  });
  it('[H5]/[H6] sensitivity, |S| and |C| peaks, sensor error', () => {
    const leaky = M.houseA(HOUSE_WALLS.Gin, HOUSE_WALLS.Gout * 1.2); const g0 = M.dc(M.houseG2()), g1 = M.dc(M.houseG2(leaky));
    nearAbs(100 * (g1 / g0 - 1), -18.15, 0.01);
    const T = (g: number) => (1100 * g) / (1 + 1100 * g); nearAbs(100 * (T(g1) / T(g0) - 1), -2.17, 0.01);
    let sPk = 0, sW = 0, cPk = 0, cW = 0; for (let i = 0; i < 20000; i++) { const w = 10 ** (-3 + (5 * i) / 19999), r = M.houseSC(1100, w); if (r.S > sPk) { sPk = r.S; sW = w; } if (r.C > cPk) { cPk = r.C; cW = w; } }
    nearAbs(sPk, 1.331, 0.001); nearAbs(sW, 2.577, 0.01); nearAbs(cPk, 0.959, 0.001); nearAbs(cW, 1.233, 0.01);
    nearAbs(T(g0), 0.9, 1e-4);
    nearAbs(M.houseG2mag((2 * Math.PI) / 24) * 1000, 4.932, 0.001);
  });
});

describe('corner (quarter car)', () => {
  it('[S1] ωn, ζ, specs, sag, load and road steps', () => {
    const n = M.cornerNumbers(); expect(CORNER).toEqual({ m: 400, k: 25600, c: 1600 });
    near(n.wn, 8); near(n.zeta, 0.25); nearAbs(n.fn, 1.273, 5e-4); nearAbs(n.wd, 7.746, 5e-4); nearAbs(n.OS, 44.43, 0.005); nearAbs(n.Tp, 0.4056, 1e-4);
    nearAbs(n.sag * 100, 15.33, 0.005); near(n.cCrit, 6400);
    const load = M.stepMetrics(tf([1000 / 400], [1, 4, 64]), 6, 60001); nearAbs(load.final * 100, 3.906, 0.001); nearAbs(load.peak * 100, 5.642, 0.001); nearAbs(load.Ts, 1.765, 0.002);
    const road = M.stepMetrics(tf([0.2, 3.2], [1, 4, 64]), 6, 60001); nearAbs(road.OS, 50.63, 0.01); nearAbs(road.Tp, 0.3403, 5e-4); nearAbs(road.Ts, 1.711, 0.002);
    for (const [z, os, ros] of [[0.4, 25.38, 36.35], [0.7, 4.599, 21.03]]) { const c = 2 * z * Math.sqrt(25600 * 400); nearAbs(M.stepMetrics(tf([2.5], [1, c / 400, 64]), 6, 60001).OS, os, 0.01); nearAbs(M.stepMetrics(tf([(c / 400) * 0.05, 3.2], [1, c / 400, 64]), 6, 60001).OS, ros, 0.01); }
  });
  it('[S2] wheel poles and the 2-DOF load step', () => {
    const p = M.wheelPoles(); nearAbs(p[0].re, -1.5985, 1e-3); nearAbs(Math.abs(p[0].im), 7.4473, 1e-3); nearAbs(p[2].re, -20.4015, 1e-3); nearAbs(Math.abs(p[2].im), 71.4095, 1e-3);
    const r = M.wheelLoadStep(); const m = M.metricsOf(r.t, r.y, 1000 / 25600); nearAbs(m.OS, 50.83, 0.02); nearAbs(m.Ts, 2.251, 0.003);
  });
  it('[S4]/[S5] state space, release, Pc/Po', () => {
    expect(M.cornerA()).toEqual([[0, 1], [-64, -4]]);
    const z = M.cornerRelease(0.05); let mn = Infinity, tm = 0; for (let t = 0; t <= 3; t += 0.01) if (z(t) < mn) { mn = z(t); tm = t; }
    nearAbs(mn * 100, -2.22, 0.005); nearAbs(tm, 0.41, 0.006); nearAbs(z(0.4) * 100, -2.219, 0.001);
  });
  it('[S6]–[S8] state feedback, bump, observer, separation, N̄', () => {
    const K = M.cornerK(); nearAbs(K[0], 14400, 1e-6 * 14400); nearAbs(K[1], 4800, 1e-6 * 4800);
    const sfm = M.stepMetrics(tf([2.5], [1, 16, 100]), 3, 30001); nearAbs(sfm.final * 100, 2.5, 1e-6); nearAbs(sfm.OS, 1.516, 0.002); nearAbs(sfm.Ts, 0.3756, 5e-4);
    const pas = M.cornerBump(null), act = M.cornerBump(K);
    const pk = (a: number[]) => Math.max(...a), mn = (a: number[]) => Math.min(...a), late = (a: number[]) => Math.max(...a.slice(10000).map(Math.abs));
    nearAbs(pk(pas.y) * 100, 3.89, 0.006); nearAbs(mn(pas.y) * 100, -1.73, 0.006); nearAbs(pk(pas.acc.map(Math.abs)), 5.71, 0.006); nearAbs(late(pas.y) * 100, 0.77, 0.001);
    nearAbs(pk(act.y) * 100, 1.93, 0.006); nearAbs(pk(act.acc.map(Math.abs)), 3.51, 0.006); nearAbs(pk(act.u.map(Math.abs)), 987, 1); expect(late(act.y) * 100).toBeLessThanOrEqual(0.0015);
    for (const [s, l1, l2] of [[5, 76, 2132], [2, 28, 224], [10, 156, 9312]]) { const L = M.cornerL(s); nearAbs(L[0], l1, 1e-6 * l2); nearAbs(L[1], l2, 1e-6 * l2); }
    nearAbs(M.cornerNbar(), 40000, 1e-3);
    const sep = M.cornerSep(0.01); nearAbs(sep.dmax * 100, 0.441, 0.001); nearAbs(sep.tmax, 0.144, 0.001); nearAbs(sep.d05 * 100, 0.0144, 1e-4); nearAbs(sep.zEnd * 100, 2.0, 0.001);
    nearAbs(100 * (1 - 40000 / (1.1 * 25600 + 14400)), 6.0, 0.05);
    // check-yourself extras [C]
    const K2 = M.cornerK([{ re: -10, im: 10 }, { re: -10, im: -10 }]); nearAbs(K2[0], 54400, 1e-3); nearAbs(K2[1], 6400, 1e-3);
  });
});

describe('dish (antenna positioner)', () => {
  it('[P1] P table', () => {
    for (const [Kp, z, os, ts] of [[10, 1, 0, 5.834], [40, 0.5, 16.3, 4.038], [250, 0.2, 52.66, 3.92], [1000, 0.1, 72.92, 3.838]]) {
      const r = M.dishP(Kp); near(r.zeta, z); nearAbs(r.m.OS, os, 0.02); nearAbs(r.m.Ts, ts, 0.003);
    }
  });
  it('[P2]/[P3] wind and ramp error, beam, speed loop', () => {
    nearAbs(M.deg(DISH.wind / 1000), 1.146, 5e-4); nearAbs(70 * 0.025 / 1.2, 1.46, 0.005); nearAbs(12 * (M.deg(0.02) / (70 * 0.025 / 1.2)) ** 2, 7.4, 0.05);
    nearAbs(DISH.wind / ((0.1 * Math.PI) / 180), 11459, 0.5); nearAbs(M.deg((DISH.B * (Math.PI / 180)) / 1000), 0.02, 5e-4);
    for (const [Kw, tau] of [[0, 0.5], [80, 0.1], [180, 0.05]]) near(DISH.J / (DISH.B + Kw), tau);
  });
  it('[P4] PI on the dish and the gust under PI', () => {
    for (const [Ki, os, ts] of [[200, 75.87, 4.184], [500, 80.19, 5.106], [1000, 87.11, 7.918]]) { const m = M.stepMetrics(M.dishPid(1000, Ki, 0), 20, 20001); nearAbs(m.OS, os, 0.05); nearAbs(m.Ts, ts, 0.005); }
    const w = M.dishWind(1000, 500, 0, 20, 20, 20001); nearAbs(w.peakDeg, 1.911, 0.002); nearAbs(w.tPeak, 0.31, 0.006); nearAbs(w.finalDeg, 0, 1e-3);
    const wp = M.dishWind(1000, 0, 0); nearAbs(wp.peakDeg, 1.982, 0.002); nearAbs(wp.finalDeg, 1.146, 0.002);
  });
  it('[P5]/[P6]/[P10] PD and PID, D on error vs measurement; wind recovery', () => {
    for (const [Kd, eOS, mOS] of [[120, 15.6, 4.599], [140, 12.63, 1.516]]) { nearAbs(M.stepMetrics(M.dishPid(1000, 0, Kd, true), 5, 20001).OS, eOS, 0.02); nearAbs(M.stepMetrics(M.dishPid(1000, 0, Kd), 5, 20001).OS, mOS, 0.01); }
    const cases: [number, number, number, number, number, number][] = [[2000, 0, 200, 2.049, 0.585, 30], [2000, 500, 200, 4.759, 0.569, 9.70], [2000, 1000, 200, 7.365, 0.556, 4.82], [2000, 2000, 200, 12.25, 0.535, 2.38], [4000, 1000, 200, 14.34, 0.319, 7.0], [2000, 3000, 200, 16.75, 0.518, 1.56], [2000, 1000, 400, 7.619, 0.488, 4.77]];
    for (const [Kp, Ki, Kd, os, wpk, rec] of cases) { nearAbs(M.stepMetrics(M.dishPid(Kp, Ki, Kd), 12, 24001).OS, os, 0.02); const w = M.dishWind(Kp, Ki, Kd); nearAbs(w.peakDeg, wpk, 0.002); if (Ki) nearAbs(w.recover, rec, 0.02); }
    nearAbs(M.stepMetrics(M.dishPid(2000, 1000, 200, true), 12, 24001).OS, 15.81, 0.02);
    const p = M.roots([1, 22, 200, 100]); nearAbs(p[0].re, -0.53, 0.005); nearAbs(p[1].re, -10.735, 0.002);
    nearAbs(DISH_TUNED.Kp * DISH.step, 200, 1e-9);
  });
  it('[P7] windup on a 2 rad re-point', () => {
    for (const [r, um, aw, os, ts] of [[0.2, null, false, 7.4, 2.2], [0.2, 200, false, 7.9, 2.39], [0.2, 200, true, 5.9, 1.62], [2, null, false, 7.4, 2.2], [2, 200, false, 21.6, 4.64], [2, 200, true, 3.8, 0.79]] as [number, number | null, boolean, number, number][]) {
      const s = M.dishSat(2000, 1000, 200, r, um, aw); nearAbs(s.OS, os, 0.06); nearAbs(s.Ts, ts, 0.006);
    }
    nearAbs(M.dishSat(2000, 1000, 200, 2, null, false).peakU, 4000, 1);
  });
  it('[P8] Ziegler–Nichols with the amplifier lag', () => {
    const z = M.dishZN(); near(z.Ku, 440); nearAbs(z.Tu, 0.9935, 1e-4); near(z.Kp, 264); nearAbs(z.Ki, 531.5, 0.06); nearAbs(z.Kd, 32.78, 0.006);
    nearAbs(M.stepMetrics(M.dishZNClosed(true), 15, 30001).OS, 63.8, 0.06); nearAbs(M.stepMetrics(M.dishZNClosed(false), 15, 30001).OS, 77.56, 0.02);
    // no ultimate gain on the ideal dish: s² + 2s + 0.1K is Hurwitz for every K > 0
    for (const K of [1, 100, 1e4]) expect(M.roots([1, 2, 0.1 * K]).every((p) => p.re < 0)).toBe(true);
  });
  it('[P9] one-number indices on the dish rate gain', () => {
    const ise = M.dishIndexOptimum('ISE'); nearAbs(ise.Kr, 80, 1e-9); near(ise.zeta, 0.5); nearAbs(M.iseClosed(10, 100), 0.1, 1e-12);
    nearAbs(M.dishIndexOptimum('IAE').Kr, 112.5, 0.15); nearAbs(M.dishIndexOptimum('ITAE').Kr, 130.5, 0.15);
    nearAbs(M.dishIndexOptimum('ISE', 2000).Kr, 121.4, 0.05); nearAbs(M.dishIndexOptimum('IAE', 2000).Kr, 167.4, 0.3); nearAbs(M.dishIndexOptimum('ITAE', 2000).Kr, 192.8, 0.2);
  });
});

describe('exam examples and legacy claims', () => {
  it('[X2]–[X5]', () => {
    for (const [K, os] of [[100, 22.03], [50, 12.89], [20, 3.861]]) nearAbs(M.stepMetrics(tf([11, K], [1, 12, K]), 20, 40001).OS, os, 0.02);
    nearAbs(M.telescopeISE(4), 0.65, 1e-9); nearAbs(M.telescopeISE(Math.sqrt(10)), 0.6325, 1e-4);
    nearAbs(M.argmin(M.telescopeIAE, 2, 6, 1e-3), 4.189, 0.005);
    const asc = [1, 11 / 6, 1, 1 / 6], d4 = M.deltaQ(asc, 2), d2 = Math.sqrt(d4), d1 = Math.sqrt(M.deltaQ(asc, 1) + 2 * d2);
    nearAbs(M.deltaQ(asc, 1), 49 / 36, 1e-9); nearAbs(d4, 7 / 18, 1e-9); nearAbs(d1, 1.615, 1e-4); nearAbs(d2, 0.6236, 1e-4);
    expect(polyMul([1, 9.6, 36], [1, 4.8]).map((v) => +v.toFixed(6))).toEqual([1, 14.4, 82.08, 172.8]);
  });
  it('[L1] the old pid-tuning claims the fix list corrects', () => {
    nearAbs(M.stepMetrics(tf([0.5 * 2, 3 * 2, 2 * 2], polyMul([1, 0], [1, 3, 2]).map((v, i) => v + [0, 1, 6, 4][i])), 20, 40001).OS, 1.937, 0.01);
  });
});

describe('[F] failure cards on the dish (build 1 answers)', () => {
  const line = (re: RegExp) => { const l = OUT.split('\n').find((x) => re.test(x)); if (!l) throw new Error(`no line ${re}`); return l; };
  const metOf = (l: string) => { const m = l.match(/OS (-?[\d.]+) %, Ts ([\d.]+) s, Tr ([\d.]+) s/)!; return { OS: +m[1], Ts: +m[2], Tr: +m[3] }; };
  const windOf = (l: string) => { const m = l.match(/wind peak ([\d.]+) deg, final (-?[\d.]+) deg, inside 0\.05 deg after ([\d.]+) s/)!; return { peak: +m[1], final: +m[2], recover: +m[3] }; };
  const checkMet = (a: ReturnType<typeof M.cardMet>, l: string) => { const b = metOf(l); nearAbs(a.OS, b.OS, 0.051); nearAbs(a.Ts, b.Ts, 0.0051); nearAbs(a.Tr, b.Tr, 0.00051); };
  const checkWind = (a: ReturnType<typeof M.cardWind>, l: string) => { const b = windOf(l); nearAbs(a.peak, b.peak, 0.00051); nearAbs(a.final, b.final, 0.00051); nearAbs(a.recover, b.recover, 0.0051); };
  const run = (o: M.CardOpts) => M.dishCard(o);
  const met = (o: M.CardOpts, r = 0.1, upto?: number) => { const s = run(o); return M.cardMet(s.t, s.y, r, upto); };
  it('slow, overshoot, oscillation (0.1 rad step, 20 s)', () => {
    checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200 }), line(/^check tuned:/));
    checkMet(met({ Kp: 400, Ki: 100, Kd: 80, T: 20 }), line(/^slow \(400,100,80\)/));
    checkMet(met({ Kp: 1000, Ki: 500, Kd: 0, T: 20 }), line(/^overshoot \(1000,500,0\)/));
    checkMet(met({ Kp: 1000, Ki: 1900, Kd: 0, T: 20 }), line(/^oscillation \(1000,1900,0\)/));
    checkMet(met({ Kp: 1000, Ki: 500, Kd: 120, T: 20 }), line(/^oscillation fix/));
    const s = run({ Kp: 400, Ki: 100, Kd: 80, T: 20 }); nearAbs(Array.from(s.u).reduce((a, x) => Math.max(a, Math.abs(x)), 0), +line(/^slow \(400/).match(/peak\|u\| (\d+)/)![1], 0.5);
  });
  it('offset and disturbance (20 N·m wind at 10 s)', () => {
    const w = (Kp: number, Ki: number, Kd: number) => { const s = run({ Kp, Ki, Kd, T: 40, wind: 20, twind: 10 }); return M.cardWind(s.t, s.y, 10); };
    checkWind(w(1000, 0, 120), line(/^offset PD/)); checkWind(w(1000, 500, 120), line(/^offset fix/));
    checkWind(w(500, 250, 100), line(/^dist \(500,250,100\)/)); checkWind(w(2000, 1000, 200), line(/^dist fix tuned/));
  });
  it('derivative kick (N_f = 200) with and without the 200 N·m limit', () => {
    for (const dm of [false, true]) {
      const ls = OUT.split('\n'), i = ls.findIndex((l) => l.startsWith(`kick dm ${dm ? 'True' : 'False'}`));
      const s = run({ Kp: 2000, Ki: 1000, Kd: 200, dm, Nf: 200, T: 5 });
      nearAbs(Array.from(s.u).reduce((a, x) => Math.max(a, Math.abs(x)), 0), +ls[i].match(/unlimited (\d+)/)![1], 0.5);
      checkMet(M.cardMet(s.t, s.y, 0.1), ls[i]); checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, dm, Nf: 200, T: 5, umax: 200 }), ls[i + 1]);
    }
  });
  it('torque limits: 2 rad slew with clamping at 200, 400, 1000 N·m', () => {
    for (const um of [200, 400, 1000]) checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, r: 2, T: 12, umax: um, aw: true }, 2), line(new RegExp(`^limits 2 rad clamp umax ${um} `)));
  });
  it('delay (20, 50 ms; 80 ms unstable) and its fixes; sensor lag', () => {
    checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, T: 15, delay: 0.02 }), line(/^delay 0\.02 /));
    checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, T: 15, delay: 0.05 }), line(/^delay 0\.05 /));
    expect(met({ Kp: 2000, Ki: 1000, Kd: 200, T: 15, delay: 0.08 }).unstable).toBe(true);
    checkMet(met({ Kp: 1000, Ki: 250, Kd: 120, T: 15, delay: 0.05 }), line(/^ {2}delay fix \(1000, 250, 120\)/));
    checkMet(met({ Kp: 800, Ki: 200, Kd: 110, T: 15, delay: 0.05 }), line(/^ {2}delay fix \(800, 200, 110\)/));
    checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, T: 15, lag: 0.02 }), line(/^sensorlag 0\.02 /));
    checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, T: 15, lag: 0.05 }), line(/^sensorlag 0\.05 /));
    checkMet(met({ Kp: 1000, Ki: 500, Kd: 120, T: 15, lag: 0.05 }), line(/^ {2}lag fix \(1000,500,120\)/));
  });
  it('A11 sensor-lag retune (build 2): slower gains with relatively more damping help, plain scaling hurts; the dive quotes them', () => {
    const R = DISH_LAG_RETUNE, at = (g: { Kp: number; Ki: number; Kd: number }) => met({ ...g, T: 30, lag: DISH.lag });
    const a = at(R.retune), b = at(R.slower), h = at(R.half);
    checkMet(a, line(/^lag retune \(600, 150, 90\)/)); checkMet(b, line(/^lag retune \(600, 150, 120\)/)); checkMet(h, line(/^lag scaled \(1000, 500, 100\)/));
    checkMet(at({ Kp: 400, Ki: 200, Kd: 40 }), line(/^lag scaled \(400, 200, 40\)/));
    const tuned = met({ ...DISH_TUNED, T: 20 }), lagged = met({ ...DISH_TUNED, T: 15, lag: DISH.lag });
    expect(a.OS).toBeLessThan(lagged.OS); expect(b.OS).toBeLessThan(a.OS); expect(h.OS).toBeGreaterThan(lagged.OS); expect(b.Ts).toBeGreaterThan(a.Ts);
    const dive = fs.readFileSync(path.join(__dirname, '../content/dives/failures.md'), 'utf8'), a11 = dive.split('#### A11')[1].split('####')[0];
    for (const s of [`(600, 150, 90) gives ${a.OS.toFixed(1)} % but settles in ${a.Ts.toFixed(2)} s instead of ${tuned.Ts.toFixed(2)} s`, `(600, 150, 120) gives ${b.OS.toFixed(1)} % but settles in ${b.Ts.toFixed(2)} s`, `half gains: ${h.OS.toFixed(1)} %`, `${lagged.OS.toFixed(1)} % overshoot with the tuned gains`]) expect(a11).toContain(s);
  });
  it('set-point weight b: 1 and 0.5 (with the wind at 20 s), 0.9 (the fix)', () => {
    for (const bw of [1, 0.5]) {
      const s = run({ Kp: 2000, Ki: 1000, Kd: 200, T: 40, b: bw, wind: 20, twind: 20 }), l = line(new RegExp(`^twodof b ${bw === 1 ? '1\\.0' : '0\\.5'} OS`));
      checkMet(M.cardMet(s.t, s.y, 0.1, 20), l); checkWind(M.cardWind(s.t, s.y, 20), l);
    }
    checkMet(met({ Kp: 2000, Ki: 1000, Kd: 200, T: 20, b: 0.9 }), line(/^twodof b 0\.9 /));
  });
  it('REF with N̄ off stops at k₁/(k + k₁) = 0.36 of the command', () => {
    nearAbs(M.cornerNbarOffRatio(), grab(/Nbar off: z\/r = ([\d.]+)/), 0.005);
  });
});

describe('build 1 figure checks (B8/B27)', () => {
  it('first: the stand-in gap peaks at 1.46 K about 1.2 h after switch-on', () => {
    const r = M.houseStepResidues(); let gap = 0, at = 0;
    for (let t = 0; t <= 40; t += 0.001) { const g = Math.abs(r.x2(t) - r.r0 * (1 - Math.exp(-t / 5))); if (g > gap) { gap = g; at = t; } }
    nearAbs(gap, 1.463, 6e-4); nearAbs(at, 1.2, 0.05);
  });
  it('partial: residues 20.45, −22.5, 2.05 sum to 0; about 0.2 K of the fast term is left after 1 h', () => {
    const r = M.houseStepResidues(); nearAbs(r.r0, 20.45, 0.005); nearAbs(r.r1, -22.5, 0.005); nearAbs(r.r2, 2.045, 0.001); nearAbs(r.r0 + r.r1 + r.r2, 0, 1e-9);
    nearAbs(r.r2 * Math.exp(-2.2), 0.227, 0.001);
  });
  it('specs: Tₛ ≤ 1 s needs c = 2mσ = 3200; %OS ≤ 10 % needs ζ = 0.591, c = 3783', () => {
    nearAbs(2 * CORNER.m * 4, 3200, 1e-9);
    const z = -Math.log(0.1) / Math.sqrt(Math.PI ** 2 + Math.log(0.1) ** 2); nearAbs(z, 0.591, 0.0005); nearAbs(2 * z * Math.sqrt(CORNER.k * CORNER.m), 3783, 1);
  });
});
