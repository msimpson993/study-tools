import { h, clear } from './dom';
import { howToReadFor, type FigureDef } from './types';
import type { ControlSet } from './controls';
import { fitCanvas } from './plot';
import { copyRefButton, figureRefWithControls, refContent } from './copyref';

export interface FigurePanel {
  id: string;
  title: string;
  /** inline canvas height in px (default from CSS) */
  height?: number;
  /** x / y axis names with units (shown as a caption; the draw callback should also label its axes). y may depend on the live control values (e.g. rpm vs fraction). */
  x: string; y: string | ((v: Record<string, number | string | boolean>) => string);
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
/** “x: … · y: …” under a panel, only when it is a plot with both axes named (a formula, a table or a picture has none) */
const axisY = (p: { y?: FigurePanel['y'] }, v?: Record<string, number | string | boolean>) => {
  if (typeof p.y === 'function') return v ? p.y(v) : '';
  return p.y ?? '';
};
const axesCaption = (p: { x?: string; y?: FigurePanel['y'] }, v?: Record<string, number | string | boolean>) => {
  const y = axisY(p, v);
  return (p.x?.trim() && y.trim() ? `x: ${p.x} · y: ${y}` : '');
};
/** `intro`: the compact form an Example node's introduction uses: only the named panels (the animated picture), with its
 *  play button but no controls rail and no "Look for" (those belong to the boxes that introduce what they show) */
export interface FigureMountOpts {
  intro?: { panels?: string[] };
  flatControls?: boolean;
  /** Mount only these panel ids (step cards). Unlike `intro`, the controls rail stays. */
  panels?: string[];
}
let scrollLocks = 0;
function lockPageScroll(on: boolean): void {
  if (on) {
    if (scrollLocks++ === 0) document.documentElement.classList.add('fig-overlay-open');
  } else if (scrollLocks > 0 && --scrollLocks === 0) document.documentElement.classList.remove('fig-overlay-open');
}

export function mountFigure(host: HTMLElement, def: FigureDef, panels0: FigurePanel[], controls: ControlSet, opts: FigureMountOpts = {}): { redraw(): void; open(ids: string[]): void; close(): void; destroy(): void } {
  const intro = opts.intro;
  const want = opts.panels?.length ? opts.panels : intro?.panels;
  const panels = want?.length ? panels0.filter((p) => want.includes(p.id)) : panels0;
  const stage = h('div', { class: 'fig-stage', dataset: { testid: 'fig-stage' } });
  const inline = h('div', { class: `pair2${panels.length === 1 ? ' one' : ''}` });
  const overlay = h('div', { class: 'fig-overlay', hidden: true, dataset: { testid: 'fig-overlay' } });
  const figRef = (prefix?: string) => {
    const auto = prefix ?? (typeof location !== 'undefined' && location.hash.startsWith('#/dive/') ? 'deep dive' : undefined);
    return figureRefWithControls(refContent(), def, controls.values, controls.serialize(), auto);
  };
  stage.append(h('div', { class: 'fig-stage-head' }, h('h4', null, def.title), copyRefButton(() => figRef())), inline);
  if (def.lookFor && !intro) stage.append(h('p', { class: 'fig-look', dataset: { testid: 'look-for' }, html: `<b>Look for:</b> ${def.lookFor}` }));
  // animation: play/pause drives one control (its own slider is the scrubber); reduced motion => explicit step button, no autoplay loop
  let stopAnim = () => {};
  const animCtl = def.animate ? controls.defs.find((c) => c.id === def.animate!.control) : undefined;
  const animShown = !!(def.animate && animCtl && (!animCtl.panels?.length || !want?.length || animCtl.panels.some((id) => want.includes(id))));
  if (animShown && def.animate) {
    const a = def.animate, cd = animCtl!;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = 0, playing = false;
    const btn = h('button', { class: 'tbtn on', dataset: { testid: 'play' }, 'aria-pressed': 'false' }, reduce ? 'Step ▶' : '▶ Play');
    const span = (cd.max ?? 1) - (cd.min ?? 0);
    const advance = (dv: number) => { let v = (controls.values[a.control] as number) + dv; if (v > (cd.max ?? 1)) v = a.loop === false ? (cd.max ?? 1) : (cd.min ?? 0); controls.set(a.control, v); return v < (cd.max ?? 1); };
    // loop: false and already at the end: Play/Step starts again from the beginning (replay).
    // Rewind is deferred to the first animation frame so the Play button can light immediately
    // (a heavy first draw must not leave aria-pressed false).
    const atEnd = () => (controls.values[a.control] as number) >= (cd.max ?? 1) - 1e-9;
    const rewindIfDone = () => { if (atEnd()) controls.set(a.control, cd.min ?? 0); };
    let replay = false;
    const tick = (t: number) => {
      if (!playing) return;
      if (replay) { rewindIfDone(); replay = false; last = t; }
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!advance(a.speed * dt)) { if (a.loop === false) { setPlaying(false); return; } }
      raf = requestAnimationFrame(tick);
    };
    const setPlaying = (on: boolean) => { playing = on; btn.textContent = on ? '⏸ Pause' : (reduce ? 'Step ▶' : '▶ Play'); btn.setAttribute('aria-pressed', String(on)); if (on) { last = performance.now(); raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf); };
    btn.onclick = () => { if (reduce) { rewindIfDone(); advance(span / 20); } else if (playing) setPlaying(false); else { replay = atEnd(); setPlaying(true); } };
    stopAnim = () => { playing = false; cancelAnimationFrame(raf); };
    stage.append(h('div', { class: 'fig-anim' }, btn, h('span', null, reduce ? 'Reduced motion: stepping instead of animating. ' : '', intro ? '' : `Scrub with the “${cd.label}” slider.`)));
  }
  stage.append(overlay);
  const stepCard = host.closest('.step-card') as HTMLElement | null;
  function placeOverlay() {
    const dest = stepCard ?? stage;
    if (overlay.parentElement !== dest) dest.append(overlay);
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) api.close();
  });
  const cardText = stepCard?.querySelector('.step-card-text')?.textContent ?? '';
  const rail = controls.render('Controls', { flat: !!opts.flatControls, panels: want, cardText });
  const layout = h('div', { class: `fig-layout${intro ? ' fig-intro' : ''}` }, stage, intro ? null : rail);
  host.append(layout);

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
    const cap = axesCaption(p, controls.values);
    const axesEl = cap ? h('div', { class: 'fig-axes' }, cap) : null;
    inline.append(h('div', { class: 'fig', dataset: { figId: def.id, panel: p.id, testid: 'fig-tile' } },
      h('h4', null, p.title),
      h('button', { class: 'st-xp', 'aria-label': `Expand ${p.title}`, title: 'Expand', dataset: { expand: p.id }, onclick: open }, '⤢'),
      cv, axesEl));
    redrawers.push(() => {
      const f = fitCanvas(cv);
      if (f.w < 8 || f.h < 8) return;
      p.draw(f.g, f.w, f.h, controls.values);
      if (axesEl) axesEl.textContent = axesCaption(p, controls.values);
    });
  }

  // On a phone tab page, sit the controls directly under the first plot so they are not
  // a long scroll below all four stacked panels. Desktop keeps the right-hand rail.
  const placeRail = () => {
    if (intro) return;
    const landscapeShort = window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    const inCard = !!host.closest('.step-card');
    const phoneTabs = document.documentElement.classList.contains('layout-tabs')
      && window.matchMedia('(max-width: 700px)').matches
      && !landscapeShort;
    const first = inline.querySelector('.fig');
    // Card layout owns the rail (under the plots, or in the phone sheet).
    if (inCard) layout.append(rail);
    else if (phoneTabs && first) first.after(rail);
    else layout.append(rail);
  };
  placeRail();
  const mq = window.matchMedia('(max-width: 700px)');
  const mqLand = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
  const onRailMq = () => placeRail();
  mq.addEventListener?.('change', onRailMq);
  mqLand.addEventListener?.('change', onRailMq);

  const slotCanvases: HTMLCanvasElement[] = [];
  function renderOverlay() {
    clear(overlay); slotCanvases.length = 0;
    if (!openIds.length) { overlay.hidden = true; return; }
    overlay.hidden = false;
    const isPair = openIds.length === 2;
    const box = h('div', { class: 'fig-box', role: 'dialog', 'aria-label': def.title });
    box.append(h('div', { class: 'fig-head' }, h('h4', null, isPair && def.pair ? `${byId(openIds[0]).title} ⇄ ${byId(openIds[1]).title}` : byId(openIds[0]).title),
      def.pair && !isPair ? h('button', { class: 'tbtn', dataset: { testid: 'pair-open' }, onclick: () => api.open([def.pair!.forward, def.pair!.inverse]) }, 'Pair view') : null,
      copyRefButton(() => figRef()),
      h('button', { class: 'tbtn', dataset: { testid: 'fig-close' }, 'aria-label': 'Close expanded plot', onclick: () => api.close() }, '✕')));
    if (isPair && def.pair) {
      box.append(h('div', { class: 'fig-strip', dataset: { testid: 'pair-strip' }, html: `<div><b>${def.pair.forwardName}</b> (${byId(def.pair.forward).title} → ${byId(def.pair.inverse).title})</div><div><b>${def.pair.inverseName}</b> (${byId(def.pair.inverse).title} → ${byId(def.pair.forward).title})</div>${def.pair.strip ? `<div>${def.pair.strip}</div>` : ''}` }));
    }
    const grid = h('div', { class: 'fig-grid' });
    openIds.forEach((id, i) => {
      const p = byId(id);
      const cv = h('canvas', { dataset: { big: id }, 'aria-label': p.title });
      slotCanvases.push(cv);
      const wasDrag = p.pointer ? wirePointer(cv, p.pointer) : () => false;
      (cv as HTMLCanvasElement & { wasDrag?: () => boolean }).wasDrag = wasDrag;
      const lg = h('div', { class: 'st-lgbox', hidden: !legendOpen[i], dataset: { testid: 'legend-box' } }, ...def.legend.map((l) => h('div', { class: 'li' }, h('i', { class: l.dash ? 'dash' : '', style: `--c:${l.color};border-top-color:${l.color}` }), l.label)));
      const chip = h('button', { class: 'chip', 'aria-expanded': String(legendOpen[i]), dataset: { testid: 'legend-chip' }, onclick: () => { legendOpen[i] = !legendOpen[i]; chip.setAttribute('aria-expanded', String(legendOpen[i])); lg.hidden = !legendOpen[i]; } }, 'Legend ▾');
      const cap = axesCaption(p, controls.values);
      grid.append(h('div', { class: 'fig-slot' }, h('div', { class: 'sh' }, h('span', null, cap), chip), lg, cv));
    });
    const howText = howToReadFor(def.howToRead, openIds);
    box.append(grid);
    if (howText) box.append(h('div', { class: 'fig-how', dataset: { testid: 'how-to-read' }, html: `<b>How to read this:</b> ${howText}` }));
    overlay.append(box);
    // A second tap on the expanded plot shrinks it (a drag on a pointer plot does not).
    slotCanvases.forEach((cv) => {
      cv.addEventListener('click', () => {
        const dragged = (cv as HTMLCanvasElement & { wasDrag?: () => boolean }).wasDrag?.() ?? false;
        if (!dragged) api.close();
      });
    });
    placeOverlay();
    requestAnimationFrame(redraw);
  }

  function redraw() {
    redrawers.forEach((f) => f());
    slotCanvases.forEach((cv, i) => { const p = byId(openIds[i]); const f = fitCanvas(cv); if (f.w >= 8 && f.h >= 8) p.draw(f.g, f.w, f.h, controls.values); });
  }
  controls.onChange(() => redraw());
  const ro = new ResizeObserver(() => redraw());
  ro.observe(stage);
  for (const el of inline.querySelectorAll('.fig')) ro.observe(el);
  if (host.parentElement) ro.observe(host.parentElement);
  const onTheme = () => redraw();
  window.addEventListener('study-theme', onTheme);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && openIds.length) { api.close(); e.stopPropagation(); } };
  document.addEventListener('keydown', onKey, true);

  const api = {
    redraw,
    open(ids: string[]) { const wasOpen = openIds.length > 0; openIds = ids; legendOpen = [false, false]; renderOverlay(); if (!wasOpen && openIds.length) lockPageScroll(true); },
    close() { const wasOpen = openIds.length > 0; openIds = []; renderOverlay(); if (wasOpen) lockPageScroll(false); },
    destroy() { if (openIds.length) lockPageScroll(false); stopAnim(); ro.disconnect(); window.removeEventListener('study-theme', onTheme); document.removeEventListener('keydown', onKey, true); mq.removeEventListener?.('change', onRailMq); mqLand.removeEventListener?.('change', onRailMq); },
  };
  requestAnimationFrame(redraw);
  return api;
}
