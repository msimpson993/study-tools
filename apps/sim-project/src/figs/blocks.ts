/** Figure `blocks`: step through a handout script, lighting the block each line builds. */
import { figureOf, col, text, wipe, type FigurePanel } from '@study/core';
import { wrap, num, str, type V } from './util';
import { SCRIPTS, drawLabDiagram } from './diagrams';

export const blocksPanels = (/* c, def */): FigurePanel[] => [
  {
    id: 'code', title: 'The handout script, one line at a time', x: '', y: '',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      const rowH = Math.min(26, (h - 8) / steps.length);
      steps.forEach((s, i) => {
        const y = 14 + i * rowH, on = i === line - 1;
        if (on) { g.fillStyle = col.e(); g.globalAlpha = 0.18; g.fillRect(4, y - 12, w - 8, rowH); g.globalAlpha = 1; }
        const size = 11;
        const lines = wrap(g, s.code, w - 20, size);
        g.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        g.fillStyle = on ? col.text() : col.muted();
        g.textAlign = 'left';
        lines.slice(0, 2).forEach((ln, j) => g.fillText(ln, 10, y + j * (size + 1)));
        if (on && s.warn) { text(g, '⚠ ' + s.warn, 10, y + Math.min(lines.length, 2) * (size + 1) + 2, col.e(), 'left', 9); }
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
