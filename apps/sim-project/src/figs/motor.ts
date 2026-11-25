/** Figure `motor`: load step, open and closed loop. */
import { figureOf, drawStepResponse, col, text, wipe, rangeFrame, graphAxes, curve, tline, clipBox, type FigurePanel } from '@study/core';
import { f, lin, num, str, isThumb, type V } from './util';
import { motorNumbers } from '../model/plants';
import { drawMotor } from './scenes';
import { motorPlotLayout, type LoopView } from './motorScale';

export { motorPlotLayout, paddedRange, spanFraction, seriesSpan } from './motorScale';
export type { LoopView } from './motorScale';

export const motorPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'The motor and its load', x: 'picture', y: '',
    draw(g, w, h, v: V) {
      const axis = str(v, 'axis', '7 s') === '0.02 s' ? 0.02 : 7;
      const tFrac = num(v, 't', 1), t = tFrac * axis;
      const loop = str(v, 'loop', 'both') as LoopView;
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
      const loop = (str(v, 'loop', 'both') as LoopView);
      const n = motorNumbers({ Ka: num(v, 'Ka', 54), Kt: num(v, 'Kt', 1), J: num(v, 'J', 2), b: num(v, 'b', 0.5), Kb: num(v, 'Kb', 0.1) });
      const t = lin(0, axis, 400);
      const openY = t.map(n.wo), closedY = t.map(n.wc);
      const layout = motorPlotLayout(openY, closedY, loop);
      const show = { ess: true };
      const essLabel = Math.abs(Math.abs(n.wcInf) - 0.002) < 3.5e-4 ? "handout’s −0.002" : `final sag ${f(n.wcInf, 5)}`;
      const yLabel = 'ω (rad/s per N·m)';
      const narrow = w < 420;
      const head = isThumb(g) ? 0 : (narrow ? 78 : 44);
      const inner = Math.max(0, h - head);
      let insetH = layout.inset
        ? Math.round(Math.min(inner * 0.55, Math.max(w < 500 ? 80 : 96, inner * (w < 500 ? 0.48 : 0.36))))
        : 0;
      // keep the main pane tall enough for the y-title and the header readout
      const minMain = 130;
      if (insetH && inner - insetH < minMain) insetH = Math.max(0, inner - minMain);
      if (insetH < 64) insetH = 0;
      wipe(g, w, h);
      g.save(); g.translate(0, head);
      const H = h - head - insetH;
      const yr = layout.main;
      if (loop === 'open') {
        drawStepResponse(g, w, H, { t, y: openY, ref: 0, final: n.woInf, tEnd: axis, yRange: yr, color: col.muted(), yLabel, show, essLabel: `final sag ${f(n.woInf, 3)}`, band: 0 });
      } else if (loop === 'closed') {
        drawStepResponse(g, w, H, { t, y: closedY, ref: 0, final: n.wcInf, tEnd: axis, yRange: yr, color: col.a(), show, essLabel, yLabel });
      } else {
        drawStepResponse(g, w, H, {
          t, y: closedY, ghost: { t, y: openY, label: 'open', color: col.muted() },
          ref: 0, final: n.wcInf, tEnd: axis, yRange: yr, color: col.a(), show, yLabel, essLabel,
        });
      }
      if (layout.inset && layout.insetFor && insetH >= 64) {
        drawMotorInset(g, w, H, insetH, {
          t, tEnd: axis, yr: layout.inset, note: layout.note ?? 'y zoomed',
          open: { y: openY, final: n.woInf, color: col.muted() },
          closed: { y: closedY, final: n.wcInf, color: col.a() },
        });
      }
      g.restore();
      const ratio = n.ratio, ok = ratio < 0.02;
      // Look-for quotes the "at 7 s" / "at 0.02 s" values; keep them. On a narrow
      // expand shorten the words and wrap a line rather than drop a quoted value (BUG-75).
      const openFull = `open sag ${f(n.woInf, 4)} rad/s, τ = ${f(n.tauOpen, 3)} s,  at 7 s: ${f(n.wo(7), 4)}`;
      const closedFull = `closed sag ${f(n.wcInf, 6)} rad/s, τ = ${f(n.tauClosed * 1000, 3)} ms,  at 0.02 s: ${f(n.wc(0.02), 6)}`;
      const openShort = `open sag ${f(n.woInf, 4)}, τ = ${f(n.tauOpen, 3)} s, ${f(n.wo(7), 4)} at 7 s`;
      const closedShort = `closed sag ${f(n.wcInf, 6)}, τ = ${f(n.tauClosed * 1000, 3)} ms, ${f(n.wc(0.02), 6)} at 0.02 s`;
      const gain = `loop gain ${f(n.loopFric / n.dOpen, 1)}   ratio ${f(ratio, 5)}  ${ok ? '✓ under 0.02' : '✗ over 0.02'}`;
      const maxW = Math.max(40, w - 16);
      const fit = (s: string, z = 10) => { g.font = `${z}px system-ui,sans-serif`; return g.measureText(s).width <= maxW; };
      const wrap2 = (s: string): string[] => {
        // keep the quoted tail ("… at 7 s" / "… at 0.02 s") on its own line when the full line is wide
        const at = s.lastIndexOf(', ');
        if (at > 0) {
          const a = s.slice(0, at), b = s.slice(at + 2).replace(/^at /, '');
          if (fit(a) && fit(b)) return [a, b];
        }
        return [s];
      };
      const openL = !narrow || fit(openFull) ? [openFull] : fit(openShort) ? [openShort] : wrap2(openShort);
      const closedL = !narrow || fit(closedFull) ? [closedFull] : fit(closedShort) ? [closedShort] : wrap2(closedShort);
      const read = [...openL, ...closedL, gain];
      const lines = read.length, lh = lines > 3 ? 13 : (narrow ? 15 : 12);
      read.forEach((line, i) => text(g, line, 8, 11 + i * lh, i === read.length - 1 ? (ok ? col.ok() : col.bad()) : col.text(), 'left', 10, 'middle', 9));
    },
  },
];


/** Arrow where a curve leaves the zoomed y-range, so the off-scale loop stays visible. */
function markExit(
  g: CanvasRenderingContext2D,
  fr: { X: (x: number) => number; Y: (y: number) => number; box: { l: number; r: number; t: number; b: number } },
  t: number[], y: number[], yr: [number, number], color: string,
) {
  const lo = Math.min(yr[0], yr[1]), hi = Math.max(yr[0], yr[1]);
  let i = 1;
  for (; i < t.length; i++) if (y[i] < lo || y[i] > hi) break;
  if (i >= t.length) return;
  const yOut = y[i] < lo ? lo : hi;
  // Sit just below the left of the zoomed frame, not on the closed curve that
  // hugs the bottom of the inset, and not on the y-axis where a t≈0 exit vanishes.
  const dir = y[i] < lo ? 1 : -1; // +1 = toward the bottom of the canvas
  const x = fr.box.l + 22;
  const yPix = dir > 0 ? fr.box.b + 6 : fr.box.t - 6;
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, yPix - dir * 12); g.lineTo(x, yPix); g.stroke();
  g.beginPath();
  g.moveTo(x, yPix);
  g.lineTo(x - 5, yPix - dir * 8);
  g.lineTo(x + 5, yPix - dir * 8);
  g.closePath(); g.fill();
}

function drawMotorInset(
  g: CanvasRenderingContext2D, w: number, plotH: number, insetH: number,
  s: {
    t: number[]; tEnd: number; yr: [number, number]; note: string;
    open: { y: number[]; final: number; color: string };
    closed: { y: number[]; final: number; color: string };
  },
) {
  g.save();
  g.translate(0, plotH);
  g.fillStyle = 'rgba(127,127,127,0.08)';
  g.strokeStyle = col.muted();
  g.lineWidth = 1;
  g.beginPath(); g.rect(4, 2, w - 8, insetH - 4); g.fill(); g.stroke();
  text(g, s.note, 12, 13, col.text(), 'left', 10);
  // keep a plot box tall enough for two y-tick numbers on a short phone inset
  const minBox = 56;
  let T = 24, B = 32;
  if (insetH - T - B < minBox) {
    const room = Math.max(20, insetH - minBox);
    T = Math.max(12, Math.round(room * 0.4));
    B = Math.max(14, room - T);
  }
  let yr: [number, number] = [s.yr[0], s.yr[1]];
  const span = yr[1] - yr[0];
  if (span > 0 && yr[0] < 0 && yr[1] >= 0 && (yr[1] - 0) / span < 0.25) {
    yr = [yr[0], yr[1] + span * 0.5];
  } else if (span > 0 && yr[0] <= 0 && yr[1] > 0 && (0 - yr[0]) / span < 0.25) {
    yr = [yr[0] - span * 0.5, yr[1]];
  }
  const fr = rangeFrame(w, insetH, [0, s.tEnd], yr, 70, 12, T, B);

  graphAxes(g, fr, [0, s.tEnd], yr, 'time (s)', insetH < 120 ? 'ω' : 'ω (rad/s)');
  g.save();
  clipBox(g, fr);
  // both loops belong on the zoomed inset; the larger one may leave the frame
  curve(g, fr, s.t, s.open.y, s.open.color, 2);
  tline(g, fr, [0, s.open.final], [s.tEnd, s.open.final], s.open.color, 1, [5, 4]);
  curve(g, fr, s.t, s.closed.y, s.closed.color, 2);
  tline(g, fr, [0, s.closed.final], [s.tEnd, s.closed.final], s.closed.color, 1, [5, 4]);
  g.restore();
  markExit(g, fr, s.t, s.open.y, s.yr, s.open.color);
  const lx = fr.box.r - 6;
  const ly = fr.box.t + 12;
  text(g, 'closed loop', lx, ly, s.closed.color, 'right', 10);
  text(g, 'open loop', lx, ly + 13, s.open.color, 'right', 10);
  g.restore();
}

export const motorFigure = figureOf(() => motorPanels());
