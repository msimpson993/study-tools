import { h, clear } from './dom';
import type { FigureDef } from './types';
import type { ControlSet } from './controls';
import { fitCanvas } from './plot';

export interface FigurePanel {
  id: string;
  title: string;
  /** inline canvas height in px (default from CSS) */
  height?: number;
  /** x / y axis names with units (shown as a caption; the draw callback should also label its axes) */
  x: string; y: string;
  draw(g: CanvasRenderingContext2D, w: number, h: number, v: Record<string, number | string | boolean>): void;
  /** optional direct manipulation (drag a pole, drag the gain along a locus). Every draggable quantity must ALSO have a slider. */
  pointer?: PanelPointer;
}

/**
 * Pointer hooks for a panel. Coordinates are CSS pixels inside the canvas, plus its CSS size. `down` returns true to GRAB the
 * pointer (it is then captured, the click-to-expand that would follow is suppressed, and `touch-action:none` keeps a finger
 * drag from scrolling the page); return false to let the click expand the plot as usual. `move` is called while grabbed;
 * `hover` (optional) says whether the point is over a handle, to show a grab cursor.
 */
export interface PanelPointer {
  down(x: number, y: number, w: number, h: number): boolean;
  move(x: number, y: number, w: number, h: number): void;
  up?(): void;
  hover?(x: number, y: number, w: number, h: number): boolean;
}
/** Attach a panel's pointer hooks to one canvas. Returns a function telling the click handler to ignore the click that ends a drag. */
function wirePointer(cv: HTMLCanvasElement, ptr: PanelPointer): () => boolean {
  let grabbed = false;
  const at = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r.width, r.height] as const; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', (e) => {
    const [x, y, w, h] = at(e);
    grabbed = ptr.down(x, y, w, h);
    if (grabbed) { cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; e.preventDefault(); }
  });
  cv.addEventListener('pointermove', (e) => {
    const [x, y, w, h] = at(e);
    if (grabbed) ptr.move(x, y, w, h); else cv.style.cursor = ptr.hover?.(x, y, w, h) ? 'grab' : '';
  });
  const end = (e: PointerEvent) => { if (grabbed) { try { cv.releasePointerCapture(e.pointerId); } catch { /* already released */ } ptr.up?.(); cv.style.cursor = ''; } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  return () => { const g = grabbed; grabbed = false; return g; };
}

/**
 * Figure group: inline plots → expanded view that covers ONLY the plot stage (the controls rail stays live) → pair view
 * (forward + inverse side by side with a strip naming both directions). Legend is expandable; "how to read" shows only expanded.
 */
export function mountFigure(host: HTMLElement, def: FigureDef, panels: FigurePanel[], controls: ControlSet): { redraw(): void; open(ids: string[]): void; close(): void; destroy(): void } {
  const stage = h('div', { class: 'fig-stage', dataset: { testid: 'fig-stage' } });
  const inline = h('div', { class: `pair2${panels.length === 1 ? ' one' : ''}` });
  const overlay = h('div', { class: 'fig-overlay', hidden: true, dataset: { testid: 'fig-overlay' } });
  stage.append(h('h4', { style: 'margin:.1rem .2rem .4rem' }, def.title), inline);
  if (def.lookFor) stage.append(h('p', { class: 'fig-look', dataset: { testid: 'look-for' }, html: `<b>Look for:</b> ${def.lookFor}` }));
  // animation: play/pause drives one control (its own slider is the scrubber); reduced motion => explicit step button, no autoplay loop
  let stopAnim = () => {};
  if (def.animate) {
    const a = def.animate, cd = controls.defs.find((c) => c.id === a.control)!;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = 0, playing = false;
    const btn = h('button', { class: 'tbtn on', dataset: { testid: 'play' }, 'aria-pressed': 'false' }, reduce ? 'Step ▶' : '▶ Play');
    const span = (cd.max ?? 1) - (cd.min ?? 0);
    const advance = (dv: number) => { let v = (controls.values[a.control] as number) + dv; if (v > (cd.max ?? 1)) v = a.loop === false ? (cd.max ?? 1) : (cd.min ?? 0); controls.set(a.control, v); return v < (cd.max ?? 1); };
    const tick = (t: number) => { if (!playing) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!advance(a.speed * dt)) { if (a.loop === false) { setPlaying(false); return; } } raf = requestAnimationFrame(tick); };
    const setPlaying = (on: boolean) => { playing = on; btn.textContent = on ? '⏸ Pause' : (reduce ? 'Step ▶' : '▶ Play'); btn.setAttribute('aria-pressed', String(on)); if (on) { last = performance.now(); raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf); };
    btn.onclick = () => { if (reduce) advance(span / 20); else setPlaying(!playing); };
    stopAnim = () => { playing = false; cancelAnimationFrame(raf); };
    stage.append(h('div', { class: 'fig-anim' }, btn, h('span', null, reduce ? 'Reduced motion: stepping instead of animating. ' : '', `Scrub with the “${cd.label}” slider.`)));
  }
  stage.append(overlay);
  const rail = controls.render('Controls');
  host.append(h('div', { class: 'fig-layout' }, stage, rail));

  const canvases = new Map<string, HTMLCanvasElement>();
  const redrawers: (() => void)[] = [];
  let openIds: string[] = [];
  let legendOpen = [false, false];
  const byId = (id: string) => panels.find((p) => p.id === id)!;

  for (const p of panels) {
    const cv = h('canvas', { 'aria-label': `${p.title}. Tap to expand.`, dataset: { fig: p.id } });
    const ph = p.height ?? def.height; if (ph) cv.style.height = `${ph}px`;
    canvases.set(p.id, cv);
    const open = () => api.open([p.id]);
    const wasDrag = p.pointer ? wirePointer(cv, p.pointer) : () => false;
    cv.addEventListener('click', () => { if (!wasDrag()) open(); });
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
      if (p.pointer) wirePointer(cv, p.pointer);
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
    destroy() { stopAnim(); ro.disconnect(); window.removeEventListener('study-theme', onTheme); document.removeEventListener('keydown', onKey, true); },
  };
  requestAnimationFrame(redraw);
  return api;
}
