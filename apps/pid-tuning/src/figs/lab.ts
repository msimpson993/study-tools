import { figureOf, drawSPlane, rangeFrame, graphAxes, curve, tline, dot, text, wipe, col, type FigurePanel, type V2 } from '@study/core';
import type { Cx } from '@study/core/dsp';
import { PRE, windowFor, runLab, verdict, DIST_AMP, UMAX, type LabValues, type LabRun } from '../lab/model';
import type { PlantId, AntiWindup } from '@study/core/dsp';

type V = Record<string, number | string | boolean>;
const DEF: LabValues = { plant: 'p3', Kp: 2, Ki: 0.8, Kd: 1.6, N: 20, T: 30, dist: false, noise: false, sat: false, aw: 'none', dm: false };
/** The control values with the figure's fixed settings filled in (a focused figure declares only some of the Lab's controls). */
export const labValues = (v: V, fixed: Partial<LabValues> = {}): LabValues => {
  const d = { ...DEF, ...fixed }, pick = <K extends keyof LabValues>(k: K): LabValues[K] => (v[k] === undefined ? d[k] : (v[k] as LabValues[K]));
  return { plant: String(pick('plant')) as PlantId, Kp: +pick('Kp'), Ki: +pick('Ki'), Kd: +pick('Kd'), N: +pick('N'), T: +pick('T'), dist: !!pick('dist'), noise: !!pick('noise'), sat: !!pick('sat'), aw: String(pick('aw')) as AntiWindup, dm: !!pick('dm') };
};
const f2 = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('-', '−') : '—');
const pct = (a: number[], p: number) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.max(0, Math.floor(p * (b.length - 1))))]; };
const levelColor = (l: string) => (l === 'bad' ? col.bad() : l === 'warn' ? col.c() : l === 'ok' ? col.ok() : col.text());

/** Wrap a sentence into lines no wider than `maxW` px (canvas text measurement). */
function wrap(g: CanvasRenderingContext2D, s: string, maxW: number, size: number): string[] {
  g.font = `${size}px system-ui, sans-serif`; const out: string[] = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? `${line} ${word}` : word; if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}

/** The PID Lab as a core Figure on simulatePid / pidMetrics: every legacy toggle is a declared control, and the ghost keeps the previous run. */
export interface LabOptions { panels?: ('out' | 'u' | 'poles' | 'read')[]; fixed?: Partial<LabValues>; /** rewrite the values before simulating (e.g. a Ziegler–Nichols switch) */ map?: (lv: LabValues, v: V) => LabValues }
export const makeLab = (opt: LabOptions = {}) => figureOf((c) => {
  let cur: LabRun | null = null, curKey = '', committed: LabRun | null = null, ghost: LabRun | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  const run = (v: V): LabRun => {
    const lv0 = labValues(v, opt.fixed), lv = opt.map ? opt.map(lv0, v) : lv0, key = JSON.stringify(lv);
    if (key !== curKey) {
      ghost = committed; curKey = key; cur = runLab(lv);
      clearTimeout(timer); const mine = cur; timer = setTimeout(() => { committed = mine; }, 450); // a slider drag keeps the ghost = where the drag began
    }
    return cur!;
  };
  // switching plant resets the gains and window to that plant's PI preset, as the original page did
  let busy = false;
  c.onChange((k) => {
    if (k !== 'plant' || busy || !c.defs.some((d) => d.id === 'Kp')) return; busy = true;
    const p = String(c.values.plant) as PlantId, g = PRE[p].PI!;
    c.set('Kp', g[0]); c.set('Ki', g[1]); c.set('Kd', g[2]); c.set('T', windowFor(p, 'PI')); busy = false;
  });
  const showGhost = (v: V) => !!v.ghost && ghost !== null && ghost.v.plant === (run(v).v.plant) ? ghost : null;
  const panels: FigurePanel[] = [
    {
      id: 'out', title: 'Output y(t)', x: 'time (s)', y: 'output y (reference r = 1)',
      draw(g, w, h, v) {
        wipe(g, w, h);
        const r = run(v), s = r.sim, T = r.v.T, gh = showGhost(v);
        const all = [...s.y, ...(gh ? gh.sim.y : [])], lo = Math.max(-2, Math.min(-0.05, ...all)), hi = Math.min(3, Math.max(1.3, Math.max(...all) * 1.06));
        const yr: V2 = [lo, Number.isFinite(hi) ? hi : 3], f = rangeFrame(w, h, [0, T], yr, 46, 14, 10, 32);
        graphAxes(g, f, [0, T], yr, 'time (s)', 'output y');
        const m = r.m, td = r.v.dist ? T / 2 : null;
        if (!m.unstable && m.yFinal > 0) { g.save(); g.fillStyle = col.ok(); g.globalAlpha = 0.14; g.fillRect(f.box.l, f.Y(m.yFinal * 1.02), f.box.r - f.box.l, f.Y(m.yFinal * 0.98) - f.Y(m.yFinal * 1.02)); g.restore(); }
        tline(g, f, [0, 1], [T, 1], col.muted(), 1, [5, 4]); text(g, 'r = 1', f.box.r - 4, f.Y(1) - 8, col.muted(), 'right', 10);
        if (td !== null) { tline(g, f, [td, yr[0]], [td, yr[1]], col.c(), 1, [3, 3]); text(g, `load d = ${f2(DIST_AMP, 1)}`, f.X(td) + 4, f.box.t + 10, col.c(), 'left', 10); }
        if (gh) curve(g, f, gh.sim.t, gh.sim.y, col.muted(), 1.8, [5, 4]);
        curve(g, f, s.t, s.y, col.a(), 2.4);
        if (!m.unstable && m.overshootPct > 0.1 && Number.isFinite(m.peak) && (td === null || m.peakTime < td)) { dot(g, f, [m.peakTime, m.peak], col.b(), 4); text(g, `${f2(m.overshootPct, 1)}% OS`, Math.min(f.X(m.peakTime) + 8, f.box.r - 4), f.Y(m.peak) - 8, col.b(), f.X(m.peakTime) > w * 0.7 ? 'right' : 'left', 10.5); }
        if (gh) text(g, '┄ previous run', f.box.l + 6, f.box.t + 9, col.muted(), 'left', 10);
        if (s.unstable) text(g, 'diverges', f.box.l + 8, f.box.b - 12, col.bad(), 'left', 11);
      },
    },
    {
      id: 'u', title: 'Control u(t)', x: 'time (s)', y: 'applied control u',
      draw(g, w, h, v) {
        wipe(g, w, h);
        const r = run(v), s = r.sim, T = r.v.T, lo = Math.min(-0.2, pct(s.u, 0.01)), hi = Math.max(1.5, pct(s.u, 0.99)), pad = (hi - lo) * 0.08, yr: V2 = [lo - pad, hi + pad];
        const f = rangeFrame(w, h, [0, T], yr, 46, 14, 10, 32);
        graphAxes(g, f, [0, T], yr, 'time (s)', 'u');
        if (r.v.sat) { tline(g, f, [0, UMAX], [T, UMAX], col.bad(), 1, [4, 3]); text(g, `limit ${UMAX}`, f.box.r - 4, f.Y(UMAX) - 8, col.bad(), 'right', 10); }
        curve(g, f, s.t, s.u, col.b(), 1.6);
      },
    },
    {
      id: 'poles', title: 'Closed-loop poles', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw(g, w, h, v) {
        const r = run(v), poles: Cx[] = r.poles, mag = poles.map((p) => Math.hypot(p.re, p.im)), slow = Math.min(...mag.filter((m) => m > 1e-6), 3);
        const near = mag.filter((m) => m <= Math.max(3, 4 * slow)), big = Math.max(1.5, ...near), range = Math.ceil(big * 1.3 * 2) / 2;
        drawSPlane(g, w, h, { range, poles, labels: poles.length <= 3 });
        const far = mag.filter((m) => m > range * 1.05).length;
        if (far) text(g, `${far} faster pole${far > 1 ? 's' : ''} off to the left`, 8, 10, col.muted(), 'left', 10);
      },
    },
    {
      id: 'read', title: 'Readouts', x: '', y: '',
      draw(g, w, h, v) {
        wipe(g, w, h);
        const r = run(v), m = r.m, good = !m.unstable && m.settled, v2 = verdict(r), dom = r.poles.slice().sort((a, b) => b.re - a.re)[0];
        const rows: [string, string, string][] = [
          ['Overshoot', good ? `${f2(m.overshootPct, 1)} %` : '—', good ? (m.overshootPct < 5 ? 'ok' : m.overshootPct < 20 ? 'warn' : 'bad') : ''],
          ['Settling (2 %)', good ? `${f2(m.settlingTime)} s` : 'not settled', good ? (m.settlingTime < 5 ? 'ok' : '') : 'bad'],
          ['Rise 10–90 %', good && Number.isFinite(m.riseTime) ? `${f2(m.riseTime)} s` : '—', ''],
          ['Steady-state error', good ? (Math.abs(m.ess) < 5e-4 ? '0' : f2(m.ess, 3)) : '—', good ? (Math.abs(m.ess) < 5e-3 ? 'ok' : 'warn') : ''],
          ['Peak |u|', m.unstable ? '—' : f2(m.peakU), m.peakU > 10 ? 'warn' : ''],
          ['Crossover ωc', r.mg?.wcp ? `${f2(r.mg.wcp)} rad/s` : '—', ''],
          ['Phase margin', r.mg?.pm != null ? `${f2(r.mg.pm, 0)}°` : '—', r.mg?.pm != null ? (r.mg.pm >= 60 ? 'ok' : r.mg.pm >= 30 ? 'warn' : 'bad') : ''],
          ['Dominant pole', dom ? `${f2(dom.re)}${dom.im ? ` ± ${f2(Math.abs(dom.im))}j` : ''}` : '—', ''],
        ];
        if (dom && dom.im) { const z = -dom.re / Math.hypot(dom.re, dom.im); rows.push(['ζ of dominant pair', f2(Math.abs(z) < 0.005 ? 0 : z), '']); }
        const fs = 11.5, lh = 15; let y = 12;
        for (const [k, val, lv] of rows) { text(g, k, 8, y, col.muted(), 'left', fs); text(g, val, w - 8, y, levelColor(lv), 'right', fs); y += lh; }
        y += 4; for (const line of wrap(g, v2.text, w - 16, 10.5)) { text(g, line, 8, y, levelColor(v2.level), 'left', 10.5); y += 13; }
      },
      height: 270,
    },
  ];
  return opt.panels ? opt.panels.map((id) => panels.find((p) => p.id === id)!) : panels;
});
export const labFigure = makeLab();
