/** Figure `loop`: a static block diagram per machine, with plain-word / symbol / value labels and box tooltips. */
import { mountFigure, col, text, type FigurePanel, type FigureDef, type FigureMountOpts } from '@study/core';
import type { ControlSet } from '@study/core';
import { drawLabDiagram, type BoxHit, type LabelWords } from './diagrams';

const WORDS: LabelWords[] = ['plain words', 'symbols', 'values'];
const asWords = (v: string): LabelWords => (WORDS as string[]).includes(v) ? (v as LabelWords) : 'plain words';

export function loopFigure(host: HTMLElement, def: FigureDef, controls: ControlSet, opts?: FigureMountOpts): () => void {
  const hits: BoxHit[] = [];
  let tip: BoxHit | null = null;
  let api: { redraw(): void; destroy(): void } | undefined;
  const bump = () => { api?.redraw(); };

  const panels: FigurePanel[] = [{
    id: 'diagram',
    title: 'Block diagram',
    x: '', y: '',
    height: 280,
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
  const MACHINE_LABEL: Record<string, string> = {
    'motor-open': 'motor, no feedback',
    'motor-closed': 'motor with tachometer',
    borer: 'boring machine',
    disk: 'disk head',
    engine: 'engine model',
  };
  /** Presets (and machine-select options) allowed on each problem tab. Overview keeps every machine. */
  const TAB_LOOP_PRESETS: Record<string, string[]> = {
    motor: ['motor-open', 'motor-closed'],
    borer: ['borer'],
    disk: ['disk'],
    engine: ['engine'],
  };
  const tab = host.closest<HTMLElement>('[data-testid="tab-page"]')?.dataset.tab
    ?? /#\/tab\/([^/?]+)/.exec(location.hash ?? '')?.[1];
  const allowed = (tab && TAB_LOOP_PRESETS[tab]) ? TAB_LOOP_PRESETS[tab] : null;
  const sel = host.querySelector('select[aria-label="machine"]') as HTMLSelectElement | null;
  if (sel) {
    [...sel.options].forEach((o) => {
      if (allowed && !allowed.includes(o.value)) o.remove();
      else o.textContent = MACHINE_LABEL[o.value] ?? o.textContent;
    });
  }
  if (allowed) {
    host.querySelectorAll<HTMLButtonElement>('.st-presets [data-preset]').forEach((b) => {
      const id = b.dataset.preset ?? '';
      if (!allowed.includes(id)) b.remove();
    });
  }
  return () => api?.destroy();
}
