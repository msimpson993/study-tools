import { h, clear } from './dom';
import type { FigureDef } from './types';
import type { ControlSet } from './controls';
import { fitCanvas } from './plot';

export interface FigurePanel {
  id: string;
  title: string;
  /** x / y axis names with units (shown as a caption; the draw callback should also label its axes) */
  x: string; y: string;
  draw(g: CanvasRenderingContext2D, w: number, h: number, v: Record<string, number | string | boolean>): void;
}

/**
 * Figure group: inline plots → expanded view that covers ONLY the plot stage (the controls rail stays live) → pair view
 * (forward + inverse side by side with a strip naming both directions). Legend is expandable; "how to read" shows only expanded.
 */
export function mountFigure(host: HTMLElement, def: FigureDef, panels: FigurePanel[], controls: ControlSet): { redraw(): void; open(ids: string[]): void; close(): void; destroy(): void } {
  const stage = h('div', { class: 'fig-stage', dataset: { testid: 'fig-stage' } });
  const inline = h('div', { class: 'pair2' });
  const overlay = h('div', { class: 'fig-overlay', hidden: true, dataset: { testid: 'fig-overlay' } });
  stage.append(h('h4', { style: 'margin:.1rem .2rem .4rem' }, def.title), inline, overlay);
  const rail = controls.render('Controls');
  host.append(h('div', { class: 'fig-layout' }, stage, rail));

  const canvases = new Map<string, HTMLCanvasElement>();
  const redrawers: (() => void)[] = [];
  let openIds: string[] = [];
  let legendOpen = [false, false];
  const byId = (id: string) => panels.find((p) => p.id === id)!;

  for (const p of panels) {
    const cv = h('canvas', { 'aria-label': `${p.title}. Tap to expand.`, dataset: { fig: p.id } });
    canvases.set(p.id, cv);
    const open = () => api.open([p.id]);
    cv.addEventListener('click', open);
    inline.append(h('div', { class: 'fig' },
      h('h4', null, p.title),
      h('button', { class: 'st-xp', 'aria-label': `Expand ${p.title}`, title: 'Expand', dataset: { expand: p.id }, onclick: open }, '⤢'),
      cv, h('div', { class: 'fig-axes' }, `x: ${p.x} · y: ${p.y}`)));
    redrawers.push(() => { const f = fitCanvas(cv); p.draw(f.g, f.w, f.h, controls.values); });
  }

  const slotCanvases: HTMLCanvasElement[] = [];
  function renderOverlay() {
    clear(overlay); slotCanvases.length = 0;
    if (!openIds.length) { overlay.hidden = true; return; }
    overlay.hidden = false;
    const isPair = openIds.length === 2;
    const box = h('div', { class: 'fig-box', role: 'dialog', 'aria-label': def.title });
    box.append(h('div', { class: 'fig-head' }, h('h4', null, isPair && def.pair ? `${byId(openIds[0]).title} ⇄ ${byId(openIds[1]).title}` : byId(openIds[0]).title),
      def.pair && !isPair ? h('button', { class: 'tbtn', dataset: { testid: 'pair-open' }, onclick: () => api.open([def.pair!.forward, def.pair!.inverse]) }, 'Pair view') : null,
      h('button', { class: 'tbtn', dataset: { testid: 'fig-close' }, 'aria-label': 'Close expanded plot', onclick: () => api.close() }, '✕')));
    if (isPair && def.pair) {
      box.append(h('div', { class: 'fig-strip', dataset: { testid: 'pair-strip' }, html: `<div><b>${def.pair.forwardName}</b> (${byId(def.pair.forward).title} → ${byId(def.pair.inverse).title})</div><div><b>${def.pair.inverseName}</b> (${byId(def.pair.inverse).title} → ${byId(def.pair.forward).title})</div>${def.pair.strip ? `<div>${def.pair.strip}</div>` : ''}` }));
    }
    const grid = h('div', { class: 'fig-grid' });
    openIds.forEach((id, i) => {
      const p = byId(id);
      const cv = h('canvas', { dataset: { big: id }, 'aria-label': p.title });
      slotCanvases.push(cv);
      const lg = h('div', { class: 'st-lgbox', hidden: !legendOpen[i], dataset: { testid: 'legend-box' } }, ...def.legend.map((l) => h('div', { class: 'li' }, h('i', { class: l.dash ? 'dash' : '', style: `--c:${l.color};border-top-color:${l.color}` }), l.label)));
      const chip = h('button', { class: 'chip', 'aria-expanded': String(legendOpen[i]), dataset: { testid: 'legend-chip' }, onclick: () => { legendOpen[i] = !legendOpen[i]; chip.setAttribute('aria-expanded', String(legendOpen[i])); lg.hidden = !legendOpen[i]; } }, 'Legend ▾');
      grid.append(h('div', { class: 'fig-slot' }, h('div', { class: 'sh' }, h('span', null, `${p.title}  ·  x: ${p.x}  ·  y: ${p.y}`), chip), lg, cv));
    });
    box.append(grid, h('div', { class: 'fig-how', dataset: { testid: 'how-to-read' }, html: `<b>How to read this:</b> ${def.howToRead}` }));
    overlay.append(box);
    requestAnimationFrame(redraw);
  }

  function redraw() {
    redrawers.forEach((f) => f());
    slotCanvases.forEach((cv, i) => { const p = byId(openIds[i]); const f = fitCanvas(cv); p.draw(f.g, f.w, f.h, controls.values); });
  }
  controls.onChange(() => redraw());
  const ro = new ResizeObserver(() => redraw());
  ro.observe(stage);
  const onTheme = () => redraw();
  window.addEventListener('study-theme', onTheme);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && openIds.length) { api.close(); e.stopPropagation(); } };
  document.addEventListener('keydown', onKey, true);

  const api = {
    redraw,
    open(ids: string[]) { openIds = ids; legendOpen = [false, false]; renderOverlay(); },
    close() { openIds = []; renderOverlay(); },
    destroy() { ro.disconnect(); window.removeEventListener('study-theme', onTheme); document.removeEventListener('keydown', onKey, true); },
  };
  requestAnimationFrame(redraw);
  return api;
}
