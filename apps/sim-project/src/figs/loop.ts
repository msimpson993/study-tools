/** Figure `loop`: a static block diagram per machine, with plain-word / symbol / value labels and box tooltips. */
import { mountFigure, col, text, type FigurePanel, type FigureDef, type FigureMountOpts } from '@study/core';
import type { ControlSet } from '@study/core';
import { drawLabDiagram, type BoxHit, type LabelWords } from './diagrams';
import { applyTabLocalControls } from './tablocal';

const WORDS: LabelWords[] = ['plain words', 'symbols', 'values'];
const asWords = (v: string): LabelWords => (WORDS as string[]).includes(v) ? (v as LabelWords) : 'plain words';

export function loopFigure(host: HTMLElement, def: FigureDef, controls: ControlSet, opts?: FigureMountOpts): () => void {
  const hits: BoxHit[] = [];
  let tip: BoxHit | null = null;
  let api: { redraw(): void; destroy(): void } | undefined;
  const bump = () => { api?.redraw(); };

  applyTabLocalControls('loop', host, controls);
  const machine = String(controls.values.machine ?? 'motor-open');
  // Engine on a phone is a vertical stack, so the canvas has to be taller than it is wide.
  const heightFor = (m: string, width = 800) => {
    if (m !== 'engine') return 300;
    if (width < 560) return 600;
    return 440;
  };
  const panels: FigurePanel[] = [{
    id: 'diagram',
    title: 'Block diagram',
    x: '', y: '',
    height: heightFor(machine),
    draw(g, w, h, v) {
      hits.length = 0;
      drawLabDiagram(g, w, h, { sys: String(v.machine ?? 'motor-open'), words: asWords(String(v.words ?? 'plain words')), hits });
      if (!tip) return;
      const pad = 8, maxW = Math.min(300, w - 16);
      g.font = '11px system-ui, sans-serif';
      const wrapped: string[] = [];
      for (const line of tip.tip.split(/(?<=\.)\s+/)) {
        let cur = '';
        for (const wd of line.split(' ')) {
          const try0 = cur ? `${cur} ${wd}` : wd;
          if (g.measureText(try0).width > maxW - 16) { if (cur) wrapped.push(cur); cur = wd; } else cur = try0;
        }
        if (cur) wrapped.push(cur);
      }
      const tw = Math.max(...wrapped.map((s) => g.measureText(s).width), 40) + 16;
      const th = 12 + wrapped.length * 14;
      let x = tip.x + tip.w / 2 - tw / 2, y = tip.y + tip.h + 6;
      if (x < pad) x = pad;
      if (x + tw > w - pad) x = w - pad - tw;
      if (y + th > h - 4) y = Math.max(4, tip.y - th - 6);
      const bg = typeof getComputedStyle === 'function' ? getComputedStyle(g.canvas).getPropertyValue('--panel2').trim() : '';
      g.fillStyle = bg || 'rgba(16,18,24,.94)';
      g.strokeStyle = col.accent();
      g.lineWidth = 1;
      g.beginPath(); g.rect(x, y, tw, th); g.fill(); g.stroke();
      wrapped.forEach((ln, i) => text(g, ln, x + 8, y + 14 + i * 14, col.text(), 'left', 11));
    },
    pointer: {
      hover(x, y) {
        const hit = hits.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ?? null;
        if (hit?.id !== tip?.id) { tip = hit; bump(); }
        else if (!hit && tip) { tip = null; bump(); }
        return !!hit;
      },
      down(x, y) {
        const hit = hits.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ?? null;
        tip = hit;
        bump();
        return !!hit;
      },
      move(x, y) {
        const hit = hits.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ?? null;
        if (hit?.id !== tip?.id) { tip = hit; bump(); }
      },
    },
  }];
  api = mountFigure(host, def, panels, controls, opts);
  const layout = host.querySelector('.fig-layout');
  const applySize = () => {
    const m = String(controls.values.machine ?? 'motor-open');
    layout?.classList.toggle('fig-wide', m === 'engine');
    const cv = host.querySelector<HTMLCanvasElement>('canvas[data-fig="diagram"]');
    const width = cv?.clientWidth || host.clientWidth || 800;
    if (cv) cv.style.height = `${heightFor(m, width)}px`;
  };
  applySize();
  const ro = new ResizeObserver(() => { applySize(); requestAnimationFrame(() => api?.redraw()); });
  ro.observe(host);
  requestAnimationFrame(() => { applySize(); api?.redraw(); });
  controls.onChange(() => { applySize(); requestAnimationFrame(() => api?.redraw()); });
  return () => { ro.disconnect(); api?.destroy(); };
}
