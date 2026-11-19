/**
 * The PID Lab, dish-native (batch 3 §E): default plant = the positioner 0.1/(s(s + 2)), Kp 1000, Ki 0, Kd 0, 0.1 rad step, 200 N·m limit,
 * D on measurement on, wind 20 N·m at 10 s (off), N_f 200 rad/s, noise 0.01° rms (off). The old lag plants p1, p2, p3 stay as alternates
 * with their old presets, run on the core simulator exactly as before (r = 1, load −0.5 at T/2, limit 1.2).
 */
import { figureOf, drawSPlane, curve, tline, dot, text, col, type FigurePanel } from '@study/core';
import { simulatePid, pidMetrics, pidClosedLoopPoles, PID_PLANTS, type PlantId, type Cx, type AntiWindup } from '@study/core/dsp';
import { DISH } from '../model/params';
import { dishSim, dishMetrics, dishZN, roots, deg } from '../model/plants';
import { type V, num, str, on, f, k3, legend, plotFrame, range, para } from './util';

export type LabPlant = 'dish' | 'lag' | PlantId;
/** The legacy presets per lag plant ([Kp, Ki, Kd], PI used when switching plant). */
export const LEGACY_PI: Record<PlantId, [number, number, number]> = { p1: [2, 4, 0], p2: [2, 2, 0], p3: [1, 0.4, 0] };
const LEG = { dist: -0.5, umax: 1.2, noise: 0.01, seed: 99 };
interface Run { plant: LabPlant; t: number[]; y: number[]; u: number[]; r: number; T: number; windAt: number | null; umax: number | null; OS: number; Ts: number; ess: number; peakU: number; poles: Cx[]; windPeak: number; unstable: boolean }
export function labRun(v: V): Run {
  const plant = str(v, 'plant', 'dish') as LabPlant, Kp = num(v, 'Kp', 1000), Ki = num(v, 'Ki', 0), Kd = num(v, 'Kd', 0), dm = v.dm === undefined ? true : on(v, 'dm'), aw = str(v, 'aw', 'none') as AntiWindup, wind = on(v, 'wind'), noise = on(v, 'noise');
  if (plant === 'dish' || plant === 'lag') {
    const r = num(v, 'step', DISH.step), umax = num(v, 'sat', DISH.Tmax), T = num(v, 'T', 16), Nf = num(v, 'Nf', DISH.Nf), lag = plant === 'lag' ? DISH.lag : 0;
    const s = dishSim({ Kp, Ki, Kd, Nf, dm, aw, umax, lag, r: () => r, d: wind ? (t) => (t >= DISH.windAt ? DISH.wind : 0) : undefined, noise: noise ? DISH.noiseDeg / deg(1) : 0, T, dt: lag ? 1e-4 : 2e-4 });
    const pre = s.t.filter((t) => !wind || t < DISH.windAt).length, m = dishMetrics(s.t.slice(0, pre), s.y.slice(0, pre), r);
    let wp = 0; if (wind) s.t.forEach((t, i) => { if (t >= DISH.windAt) wp = Math.max(wp, Math.abs(deg(s.y[i] - r))); });
    const den = lag ? [DISH.J * lag, DISH.J + DISH.B * lag, DISH.B + Kd, Kp, Ki] : [DISH.J, DISH.B + Kd, Kp, Ki];
    const poles = roots(Ki ? den : den.slice(0, -1)).filter((p) => Number.isFinite(p.re));
    return { plant, t: s.t, y: s.y, u: s.u, r, T, windAt: wind ? DISH.windAt : null, umax, OS: m.OS, Ts: m.Ts, ess: r - s.y[s.y.length - 1], peakU: Math.max(...s.u.map(Math.abs)), poles, windPeak: wp, unstable: s.unstable };
  }
  const T = num(v, 'T', plant === 'p3' ? 30 : 10), sat = num(v, 'sat', DISH.Tmax) < 1000;
  const sim = simulatePid({ plant, Kp, Ki, Kd, N: 20, T, dt: 0.01, dist: wind ? { t: T / 2, amp: LEG.dist } : null, noise: noise ? LEG.noise : 0, umax: sat ? LEG.umax : null, aw, dOnMeasurement: dm, seed: LEG.seed });
  const m = pidMetrics(sim, { tEnd: wind ? T / 2 : undefined }); let poles: Cx[] = []; try { if (Kp || Ki || Kd) poles = pidClosedLoopPoles(plant, { Kp, Ki, Kd, N: 20 }); } catch { poles = []; }
  return { plant, t: sim.t, y: sim.y, u: sim.u, r: 1, T, windAt: wind ? T / 2 : null, umax: sat ? LEG.umax : null, OS: m.overshootPct, Ts: m.settlingTime, ess: m.ess, peakU: m.peakU, poles, windPeak: NaN, unstable: sim.unstable };
}
const isDish = (p: LabPlant) => p === 'dish' || p === 'lag';
export const labFigure = figureOf((c) => {
  let ghost: Run | null = null, cur: Run | null = null, key = '', timer: ReturnType<typeof setTimeout> | undefined, committed: Run | null = null;
  const run = (v: V) => { const k = JSON.stringify(v); if (k !== key) { ghost = committed; key = k; cur = labRun(v); clearTimeout(timer); const mine = cur; timer = setTimeout(() => { committed = mine; }, 450); } return cur!; };
  let busy = false;
  c.onChange((k) => {
    if (k !== 'plant' || busy) return; busy = true; const p = String(c.values.plant) as LabPlant;
    const g = p === 'dish' ? [1000, 0, 0] : p === 'lag' ? [dishZN().Kp, dishZN().Ki, dishZN().Kd].map((x) => Math.round(x * 10) / 10) : LEGACY_PI[p];
    c.set('Kp', g[0]); c.set('Ki', g[1]); c.set('Kd', g[2]); c.set('T', p === 'p3' ? 30 : isDish(p) ? 16 : 10); busy = false;
  });
  const gh = (v: V) => (on(v, 'ghost') && ghost && ghost.plant === run(v).plant ? ghost : null);
  return [
    {
      id: 'out', title: 'Output: dish angle (or y for the lag plants)', x: 'time (s)', y: 'output / target',
      draw(g, w, h, v) {
        const r = run(v), G = gh(v), ys = r.y.map((q) => q / r.r), gy = G ? G.y.map((q) => q / G.r) : [];
        const fr = plotFrame(g, w, h, [0, r.T], [Math.max(-1, Math.min(0, ...ys)), Math.min(3, Math.max(1.3, ...ys, ...gy) * 1.05)], 'time (s)', isDish(r.plant) ? 'θ / target' : 'y (r = 1)');
        tline(g, fr, [0, 1], [r.T, 1], col.muted(), 1, [5, 4]); if (r.windAt !== null) { tline(g, fr, [r.windAt, fr.iy(fr.box.b)], [r.windAt, fr.iy(fr.box.t)], col.d(), 1, [3, 3]); text(g, isDish(r.plant) ? 'wind 20 N·m' : 'load −0.5', fr.X(r.windAt) + 4, fr.box.t + 10, col.d(), 'left', 10); }
        if (G) curve(g, fr, G.t, gy, col.muted(), 1.6, [5, 4]); curve(g, fr, r.t, ys, col.a(), 2.3);
        legend(g, fr, [{ label: r.unstable ? 'diverges' : `%OS ${f(r.OS, 1)} %, Ts ${f(r.Ts, 2)} s${isDish(r.plant) ? `, target ${f(deg(r.r), 1)}°` : ''}`, color: r.unstable ? col.bad() : col.a() }, ...(G ? [{ label: 'previous run', color: col.muted(), dash: true }] : [])], 'br');
      },
    },
    {
      id: 'u', title: 'Control effort: motor torque (or u)', x: 'time (s)', y: 'torque (N·m) or u',
      draw(g, w, h, v) {
        const r = run(v), fr = plotFrame(g, w, h, [0, r.T], range([r.u], 0.08, r.umax ? -r.umax * 0.2 : 0, r.umax ?? 0), 'time (s)', isDish(r.plant) ? 'N·m' : 'u');
        if (r.umax) { tline(g, fr, [0, r.umax], [r.T, r.umax], col.bad(), 1, [4, 3]); text(g, `limit ${f(r.umax, isDish(r.plant) ? 0 : 1)}`, fr.box.r - 4, fr.Y(r.umax) - 8, col.bad(), 'right', 10); }
        curve(g, fr, r.t, r.u, col.b(), 1.6); text(g, `peak |u| ${isDish(r.plant) ? `${k3(r.peakU)} N·m` : f(r.peakU)}`, fr.box.l + 6, fr.box.b - 10, col.b(), 'left', 10);
      },
    },
    {
      id: 'poles', title: 'Closed-loop poles (linear loop, no limit)', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw(g, w, h, v) {
        const r = run(v), mag = r.poles.map((p) => Math.hypot(p.re, p.im)), near = mag.filter((m) => m < 60), R = Math.max(2, Math.ceil(Math.max(1.5, ...near) * 1.3));
        const fr = drawSPlane(g, w, h, { range: R, reCenter: -0.4 * R, poles: r.poles, labels: r.poles.length <= 3, shadeUnstable: true });
        const far = mag.length - near.length; if (far) para(g, `${far} fast pole${far > 1 ? 's' : ''} off to the left (derivative filter or lag)`, fr.box.l + 4, fr.box.t + 10, fr.box.r - fr.box.l - 8, col.muted(), 10);
      },
    },
    {
      id: 'read', title: 'Readouts against the dish specs', x: '', y: '', height: 230,
      draw(g, w, h, v) {
        g.clearRect(0, 0, w, h); const r = run(v), maxRe = r.poles.length ? Math.max(...r.poles.map((p) => p.re)) : -1, rows: [string, string, boolean | null][] = [
          ['Overshoot (spec < 10 %)', r.unstable ? '—' : `${f(r.OS, 1)} %`, isDish(r.plant) ? r.OS < 10 : null],
          ['Settling 2 %', r.unstable || !Number.isFinite(r.Ts) ? 'not settled' : `${f(r.Ts, 2)} s`, null],
          ['Steady error', isDish(r.plant) ? `${f(deg(r.ess), 3)}°` : f(r.ess, 3), Math.abs(r.ess) < 1e-3 * r.r],
          ['Wind peak (spec < 0.6°)', r.windAt !== null && isDish(r.plant) ? `${f(r.windPeak, 3)}°` : 'wind off', r.windAt !== null && isDish(r.plant) ? r.windPeak < 0.6 : null],
          ['Peak torque (limit 200 N·m)', isDish(r.plant) ? `${k3(r.peakU)} N·m` : f(r.peakU), isDish(r.plant) ? r.peakU <= DISH.Tmax + 1e-6 : null],
          ['Stability', maxRe < -1e-3 ? 'all poles left' : maxRe < 1e-3 ? 'on the jω axis' : 'unstable pole', maxRe < -1e-3],
        ];
        let y = 14; for (const [k, val, ok] of rows) { text(g, k, 8, y, col.muted(), 'left', 11); text(g, val, w - 8, y, ok === null ? col.text() : ok ? col.ok() : col.bad(), 'right', 11); y += 17; }
        para(g, isDish(r.plant) ? 'Plant: 0.1/(s(s + 2)), J = 10 kg·m², B = 20 N·m·s/rad' : `Legacy plant ${PID_PLANTS[r.plant as PlantId].name}`, 8, y + 4, w - 16, col.muted(), 10);
      },
    },
  ] as FigurePanel[];
});
void dot;
