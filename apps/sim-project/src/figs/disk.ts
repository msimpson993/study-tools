/** Figure `disk`: seek, shock, poles, stand-in and the Ka ceiling. */
import { figureOf, drawStepResponse, drawSPlane, col, text, wipe, type FigurePanel } from '@study/core';
import { C } from '@study/core/dsp';
import { f, num, on, str, type V } from './util';
import { diskKaMax, diskOscW, diskPoles, diskSeek, diskShock, diskStand } from '../model/plants';
import { drawDisk } from './scenes';

const KaOf = (v: V) => 10 ** num(v, 'lgKa', 1.903);

export const diskPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'The disk head, from above', x: 'picture', y: '',
    draw(g, w, h, v: V) {
      const Ka = KaOf(v), input = str(v, 'input', 'both'), t = num(v, 't', 2);
      const unstable = Ka >= diskKaMax;
      const resp = input === 'shock' ? diskShock(Math.min(Ka, diskKaMax - 1), 2, 4001) : diskSeek(Math.min(Ka, diskKaMax - 1), 3, 4001);
      const i = Math.max(0, Math.min(resp.t.length - 1, Math.round((t / (input === 'shock' ? 2 : 3)) * (resp.t.length - 1))));
      drawDisk(g, w, h, { y: unstable ? 0 : resp.y[i], input });
    },
  },
  {
    id: 'seek', title: 'Seek (command step)', x: 'time (s)', y: 'y(t)',
    draw(g, w, h, v: V) {
      const Ka = KaOf(v), unstable = Ka >= diskKaMax;
      if (unstable) {
        drawStepResponse(g, w, h, { t: [0, 2], y: [0, 0], tEnd: 2, yRange: [0, 2], color: col.bad() });
        text(g, `UNSTABLE  (Ka = ${f(Ka, 0)} > 4080)`, 56, 20, col.bad(), 'left', 14);
        return;
      }
      const r = diskSeek(Ka, 3, 8001);
      const stand = on(v, 'stand') ? diskStand(Ka, 3, 4001) : undefined;
      const head = 22;
      wipe(g, w, h);
      g.save(); g.translate(0, head);
      const settled = r.m.ts < 2 * 0.98;
      drawStepResponse(g, w, h - head, {
        t: r.t, y: r.y, final: 1, ref: 1, tEnd: 2, show: { overshoot: true, band: true, settling: settled },
        ghost: stand ? { t: stand.t, y: stand.y, label: 'stand-in (coil dropped)', color: col.e() } : undefined,
        color: col.a(),
      });
      g.restore();
      text(g, `Ka = ${f(Ka, 1)}  OS ${f(r.m.os, 2)} %  Ts ${f(r.m.ts, 3)} s` + (stand ? `  stand-in ${f(stand.m.os, 2)} %` : ''), 8, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'shock', title: 'Shock (unit Td)', x: 'time (s)', y: 'y(t)',
    draw(g, w, h, v: V) {
      const Ka = KaOf(v), unstable = Ka >= diskKaMax;
      if (unstable) {
        drawStepResponse(g, w, h, { t: [0, 2], y: [0, 0], tEnd: 2, yRange: [-0.01, 0.002], color: col.bad() });
        text(g, 'UNSTABLE', 56, 20, col.bad(), 'left', 14);
        return;
      }
      const r = diskShock(Ka, 2, 8001), off = -1 / (5 * Ka);
      const head = 22;
      wipe(g, w, h);
      g.save(); g.translate(0, head);
      const settled = r.m.ts < 2 * 0.98;
      drawStepResponse(g, w, h - head, {
        t: r.t, y: r.y, final: off, ref: 0, tEnd: 2, show: { settling: settled, overshoot: false },
        color: col.a(), yLabel: 'y(t)  (offset −1/(5Ka))',
      });
      g.restore();
      text(g, `offset ${f(off, 5)}   dip ${f(r.m.peak, 6)} at ${f(r.m.tp, 3)} s`, 8, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'splane', title: 'Arm poles (coil pole inset)', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v: V) {
      const Ka = KaOf(v), poles = diskPoles(Math.min(Ka, 1e5));
      const coil = poles.reduce((a, p) => (p.re < a.re ? p : a));
      const arm = poles.filter((p) => p !== coil);
      const imMax = Math.max(8, ...arm.map((p) => Math.abs(p.im)));
      const reExt = Math.max(8, ...arm.map((p) => Math.abs(p.re)));
      const range = Math.max(20, imMax * 1.25, reExt * 1.15);
      const zetaOf = (p: { re: number; im: number }) => { const wn = Math.hypot(p.re, p.im); return wn > 1e-9 ? Math.abs(p.re) / wn : 1; };
      const zetas = [...new Set(arm.filter((p) => Math.abs(p.im) > 0.5).map((p) => +zetaOf(p).toFixed(2)))];
      drawSPlane(g, w, h, {
        range, reCenter: -range * 0.4, poles: arm, zeros: [], labels: true, zetaRays: zetas.length ? zetas : undefined,
      });
      text(g, `coil pole at ${f(coil.re, 1)}  (off scale)`, 8, 16, col.muted(), 'left', 10);
      const ceil = diskKaMax, ratio = ceil / Math.max(Ka, 1e-6);
      const msg = Ka >= ceil ? 'UNSTABLE' : `ceiling Ka = 4080  (×${f(ratio, 2)} above you)  ω = ${f(diskOscW, 1)} rad/s`;
      text(g, msg, 8, 30, Ka >= ceil ? col.bad() : col.text(), 'left', 10);
    },
  },
];
export const diskFigure = figureOf(() => diskPanels());
