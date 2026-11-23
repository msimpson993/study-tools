/** Figure `motor`: load step, open and closed loop. */
import { figureOf, drawStepResponse, col, text, wipe, type FigurePanel } from '@study/core';
import { f, lin, num, str, type V } from './util';
import { motorNumbers } from '../model/plants';
import { drawMotor } from './scenes';

export const motorPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'The motor and its load', x: 'picture', y: '',
    draw(g, w, h, v: V) {
      const axis = str(v, 'axis', '7 s') === '0.02 s' ? 0.02 : 7;
      const tFrac = num(v, 't', 1), t = tFrac * axis;
      const loop = str(v, 'loop', 'both') as 'open' | 'closed' | 'both';
      const n = motorNumbers({ Ka: num(v, 'Ka', 54), Kt: num(v, 'Kt', 1), J: num(v, 'J', 2), b: num(v, 'b', 0.5), Kb: num(v, 'Kb', 0.1) });
      const closed = loop === 'closed' || (loop === 'both' && axis < 1);
      const speed = closed ? n.wc(t) : n.wo(t);
      const ex = closed ? 30000 : 100;
      drawMotor(g, w, h, { loop, speed, exaggerate: ex });
    },
  },
  {
    id: 'plot', title: 'Speed change after a 1 N·m load at t = 0', x: 'time (s)', y: 'ω (rad/s per N·m)',
    draw(g, w, h, v: V) {
      const axis = str(v, 'axis', '7 s') === '0.02 s' ? 0.02 : 7;
      const loop = str(v, 'loop', 'both');
      const n = motorNumbers({ Ka: num(v, 'Ka', 54), Kt: num(v, 'Kt', 1), J: num(v, 'J', 2), b: num(v, 'b', 0.5), Kb: num(v, 'Kb', 0.1) });
      const t = lin(0, axis, 400);
      const show = { ess: true };
      const essLabel = Math.abs(Math.abs(n.wcInf) - 0.002) < 3.5e-4 ? "handout’s −0.002" : `final sag ${n.wcInf.toFixed(5)}`;
      const yr: [number, number] = axis < 1 ? [-0.002, 0] : [-0.7, 0];
      const head = 40;
      wipe(g, w, h);
      g.save(); g.translate(0, head);
      const H = h - head;
      if (loop === 'open' || loop === 'both') {
        drawStepResponse(g, w, H, { t, y: t.map(n.wo), ref: 0, final: n.woInf, tEnd: axis, yRange: yr, color: col.muted(), yLabel: axis < 1 ? 'ω (rad/s)  ×10⁻³ scale' : 'ω (rad/s per N·m)', show, essLabel: `final sag ${n.woInf.toFixed(3)}`, band: 0 });
      }
      if (loop === 'closed' || loop === 'both') {
        if (loop === 'closed') {
          drawStepResponse(g, w, H, { t, y: t.map(n.wc), ref: 0, final: n.wcInf, tEnd: axis, yRange: yr, color: col.a(), show, essLabel, yLabel: axis < 1 ? 'ω (rad/s)' : 'ω (rad/s per N·m)' });
        } else {
          drawStepResponse(g, w, H, {
            t, y: t.map(n.wc), ghost: { t, y: t.map(n.wo), label: 'open' },
            ref: 0, final: n.wcInf, tEnd: axis, yRange: yr, color: col.a(), show,
            yLabel: axis < 1 ? 'ω (rad/s)' : 'ω (rad/s per N·m)', essLabel,
          });
        }
      }
      g.restore();
      const ratio = n.ratio, ok = ratio < 0.02;
      const read = [
        `open sag ${f(n.woInf, 4)} rad/s, τ = ${f(n.tauOpen, 3)} s,  at 7 s: ${f(n.wo(7), 4)}`,
        `closed sag ${f(n.wcInf, 6)} rad/s, τ = ${f(n.tauClosed * 1000, 3)} ms,  at 0.02 s: ${f(n.wc(0.02), 6)}`,
        `loop gain ${f(n.loopFric / n.dOpen, 1)}   ratio ${f(ratio, 5)}  ${ok ? '✓ under 0.02' : '✗ over 0.02'}`,
      ];
      read.forEach((line, i) => text(g, line, 8, 12 + i * 12, i === 2 ? (ok ? col.ok() : col.bad()) : col.text(), 'left', 10));
    },
  },
];

export const motorFigure = figureOf(() => motorPanels());
