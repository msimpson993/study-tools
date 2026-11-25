import { h } from './dom';
import { ControlSet } from './controls';
import type { AppContent, FigureDef } from './types';
import type { FigureMountOpts } from './figure';
import type { QuizFigureRegistry } from './quizfig';
import { mountQuizFigure } from './quizfig';

export interface FigureHooks {
  figures?: Record<string, (host: HTMLElement, def: FigureDef, controls: ControlSet, opts?: FigureMountOpts) => (() => void) | void>;
  quizFigures?: QuizFigureRegistry;
}

/** Apply a fence's preset and any extra `k=v` args onto a fresh ControlSet, before the figure mounts. */
export function controlsForSlot(def: FigureDef, slot: HTMLElement): ControlSet {
  const controls = new ControlSet(def.controls, def.presets);
  const preset = slot.dataset.preset;
  if (preset) controls.applyPreset(preset);
  const raw = slot.dataset.params;
  if (raw) {
    try {
      const params = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(params)) {
        const d = controls.defs.find((x) => x.id === k);
        if (!d) continue;
        const val = d.type === 'range' ? Number(v) : d.type === 'toggle' ? v === 'true' || v === 'on' || v === '1' : v;
        controls.values[k] = val;
      }
      controls.active = controls.presets.find((p) => {
        const base = Object.fromEntries(controls.defs.map((d) => [d.id, d.default]));
        const want = { ...base, ...p.set };
        return controls.defs.every((d) => typeof want[d.id] === 'number' ? Math.abs((controls.values[d.id] as number) - (want[d.id] as number)) < 1e-9 : controls.values[d.id] === want[d.id]);
      })?.id ?? null;
    } catch { /* ignore a bad data-params */ }
  }
  return controls;
}

/** True when the block immediately before a figure slot already has a "Look for" line. */
export function stepSuppliesLookFor(slot: HTMLElement): boolean {
  let n: ChildNode | null = slot.previousSibling;
  while (n && n.nodeType === 3 && !n.textContent?.trim()) n = n.previousSibling;
  if (!n || n.nodeType !== 1) return false;
  return /\bLook for\b/i.test((n as HTMLElement).innerText || n.textContent || '');
}

/** Wrap back-to-back ```figure:``` slots in .pop-figs so they sit side by side above 700 px and stack below. */
export function wrapAdjacentFigureSlots(root: HTMLElement): void {
  const slots = [...root.querySelectorAll<HTMLElement>('.viz-slot[data-figure]')].filter(
    (s) => s.dataset.skipEmbed !== '1' && !s.closest('.step-thumbs, .step-host-bin, .step-card-fig'),
  );
  let i = 0;
  while (i < slots.length) {
    const run = [slots[i]];
    let k = i + 1;
    while (k < slots.length) {
      let n: ChildNode | null = run[run.length - 1].nextSibling;
      while (n && n.nodeType === 3 && !n.textContent?.trim()) n = n.nextSibling;
      if (n === slots[k]) { run.push(slots[k]); k++; } else break;
    }
    if (run.length > 1) {
      const wrap = document.createElement('div');
      wrap.className = `pop-figs n${Math.min(run.length, 4)}`;
      run[0].parentNode!.insertBefore(wrap, run[0]);
      for (const s of run) wrap.append(s);
    }
    i = k;
  }
}

/** Mount every ```figure:<id>``` and ```picture:<id>``` slot under `root`. */
export function embedFigureSlots(root: HTMLElement, content: AppContent, hooks: FigureHooks, opts?: { wrapPairs?: boolean }): (() => void)[] {
  if (opts?.wrapPairs) wrapAdjacentFigureSlots(root);
  const stops: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>('.viz-slot[data-figure]').forEach((slot) => {
    if (slot.dataset.skipEmbed === '1') return;
    const id = slot.dataset.figure!;
    const def = content.figures.find((f) => f.id === id);
    const mounter = hooks.figures?.[id];
    if (!def || !mounter) { slot.append(h('p', { class: 'st-hint' }, `(figure ${id} is not available)`)); return; }
    slot.classList.add('viz-embed');
    slot.dataset.testid = 'viz';
    const d = slot.dataset.look
      ? { ...def, lookFor: slot.dataset.look }
      : (stepSuppliesLookFor(slot) ? { ...def, lookFor: undefined } : def);
    const onSimProject = typeof document !== 'undefined' && document.documentElement?.dataset?.simProject === '1';
    const stop = mounter(slot, d, controlsForSlot(def, slot), onSimProject ? { expandable: false, flatControls: true } : undefined);
    if (typeof stop === 'function') stops.push(stop);
  });
  root.querySelectorAll<HTMLElement>('.pic-slot[data-pic]').forEach((slot) => {
    const m = mountQuizFigure({ id: slot.dataset.pic!, caption: slot.dataset.cap || undefined, alt: slot.dataset.alt || slot.dataset.pic! }, hooks.quizFigures);
    m.el.classList.add('dive-pic'); m.el.dataset.testid = 'dive-picture'; slot.append(m.el); stops.push(m.destroy);
  });
  return stops;
}
