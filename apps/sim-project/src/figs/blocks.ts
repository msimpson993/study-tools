/** Figure `blocks`: step through a handout script, lighting the block each line builds. */
import { figureOf, col, text, wipe, type FigurePanel } from '@study/core';
import { wrap, num, str, type V } from './util';
import { SCRIPTS, drawLabDiagram, labDiagramHeight } from './diagrams';

export const blocksPanels = (/* c, def */): FigurePanel[] => [
  {
    id: 'code', title: 'The handout script, one line at a time', x: '', y: '',
    height: 420,
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      const size = 11, gap = size + 2, pad = 8;
      const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
      const wrapped = steps.map((s) => wrap(g, s.code, w - 24, size, mono));
      const rowHs = wrapped.map((lines, i) => pad + lines.length * gap + (i === line - 1 && steps[i].warn ? 12 : 0));
      const need = 10 + rowHs.reduce((a, b) => a + b, 0);
      if (h + 1 < need) {
        g.canvas.style.height = `${Math.ceil(need)}px`;
        return;
      }
      let y = 14;
      steps.forEach((s, i) => {
        const rh = rowHs[i], on = i === line - 1;
        if (on) { g.fillStyle = col.e(); g.globalAlpha = 0.18; g.fillRect(4, y - 12, w - 8, rh); g.globalAlpha = 1; }
        g.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        g.fillStyle = on ? col.text() : col.muted();
        g.textAlign = 'left';
        wrapped[i].forEach((ln, j) => g.fillText(ln, 10, y + j * gap));
        if (on && s.warn) text(g, '⚠ ' + s.warn, 10, y + wrapped[i].length * gap + 2, col.e(), 'left', 9);
        y += rh;
      });
    },
  },
  {
    id: 'diag', title: 'Block this line builds', x: 'block diagram', y: '',
    draw(g, w, h, v: V) {
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      const hi = steps[line - 1].highlight;
      const built = new Set(steps.slice(0, line).map((s) => s.highlight));
      const sys = id.startsWith('motor-closed') ? 'motor-closed'
        : id.startsWith('motor') ? 'motor-open'
        : id.startsWith('borer') ? 'borer'
        : id.startsWith('disk') ? 'disk'
        : 'engine';
      const need = labDiagramHeight(sys, w);
      if (Math.abs((g.canvas.clientHeight || h) - need) > 8) {
        g.canvas.style.height = `${need}px`;
        return;
      }
      drawLabDiagram(g, w, h, { sys, highlight: hi, built });
      if (hi === 'sign') text(g, 'then flip the sign (load slows the output)', 8, h - 8, col.muted(), 'left', 9);
    },
  },
  {
    id: 'frac', title: 'Fraction so far', x: '', y: '',
    height: 64,
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      text(g, steps[line - 1].frac, w / 2, h / 2 + 4, col.text(), 'center', 14);
    },
  },
];

export const blocksFigure = figureOf(() => blocksPanels());
