/** One sticky live figure for section (c) on a tabbed problem page. */
import { h, clear, esc } from './dom';
import { controlsForSlot, type FigureHooks } from './embed';
import type { ControlSet } from './controls';
import type { AppContent } from './types';

const SECTION_C = /c-what-s-going-on/;
const HEAVY = new Set(['tuner', 'disk', 'pi', 'motor', 'tradeoff', 'sens']);

export interface StickyOpts {
  /** The tabbed `.frame` — widened while a sticky section is present. */
  frame?: HTMLElement;
}

interface FigRef {
  id: string;
  preset?: string;
  params?: string;
  look?: string;
  title: string;
  slot: HTMLElement;
}

interface Step {
  n: number;
  el: HTMLElement;
  figs: FigRef[];
}

/** Nodes of section (c), from its h2 up to (not including) the next h2. */
export function sectionCNodes(art: HTMLElement): { heading: HTMLElement; nodes: Element[] } | null {
  const body = art.querySelector('.tab-body') ?? art;
  const heading = [...body.querySelectorAll('h2')].find((el) => SECTION_C.test(el.id) || /what.?s going on/i.test(el.textContent || ''));
  if (!heading) return null;
  const nodes: Element[] = [];
  for (let n = heading.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) nodes.push(n);
  return { heading, nodes };
}

function looksIn(el: HTMLElement): string[] {
  const out: string[] = [];
  for (const n of el.querySelectorAll('li, p')) {
    const raw = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/^Look for\s*:/i.test(raw)) continue;
    const html = n.innerHTML.replace(/^\s*(?:<[^>]+>\s*)*Look for\s*:?\s*(?:<\/[^>]+>\s*)*/i, '').trim();
    out.push(html || raw.replace(/^Look for\s*:\s*/i, ''));
  }
  return out;
}

function figureTitle(content: AppContent, id: string): string {
  return content.figures.find((f) => f.id === id)?.title ?? id;
}

function refFromSlot(slot: HTMLElement, content: AppContent, look?: string): FigRef {
  return {
    id: slot.dataset.figure || '',
    preset: slot.dataset.preset || undefined,
    params: slot.dataset.params || undefined,
    look: slot.dataset.look || look,
    title: figureTitle(content, slot.dataset.figure || ''),
    slot,
  };
}

/** Apply a fence's preset and k=v params onto an already-mounted ControlSet. */
export function applyFenceValues(controls: ControlSet, fig: { preset?: string; params?: string }): void {
  if (fig.preset) controls.applyPreset(fig.preset);
  else controls.reset();
  if (!fig.params) return;
  try {
    const params = JSON.parse(fig.params) as Record<string, string>;
    for (const [k, v] of Object.entries(params)) {
      const d = controls.defs.find((x) => x.id === k);
      if (!d) continue;
      const val = d.type === 'range' ? Number(v) : d.type === 'toggle' ? v === 'true' || v === 'on' || v === '1' : v;
      controls.set(k, val);
    }
  } catch { /* ignore a bad data-params */ }
}

function canStack(figs: FigRef[]): boolean {
  if (figs.length < 2) return false;
  if (isPortraitPhone() || isLandscapePhone()) return false;
  const budget = window.innerHeight - 7 * 16;
  if (budget < 820) return false;
  if (figs.some((f) => HEAVY.has(f.id))) return budget >= 1100;
  return true;
}

/** Portrait / narrow phone: stacked 50/50 pin. Not used for short landscape. */
function isPortraitPhone(): boolean {
  if (isLandscapePhone()) return false;
  return window.matchMedia('(max-width: 699.98px)').matches;
}

/** Short landscape (e.g. 844×390): side-by-side 40/60, not a stacked pin. */
function isLandscapePhone(): boolean {
  return window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
}

function isCompactPhone(): boolean {
  return isPortraitPhone();
}

function headerBottom(): number {
  const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
  const top = document.querySelector('.topbar') as HTMLElement | null;
  if (bar) return Math.round(bar.getBoundingClientRect().bottom);
  if (top) return Math.round(top.getBoundingClientRect().bottom);
  return 88;
}

function setPinVars(figCol: HTMLElement): void {
  const top = headerBottom();
  const root = document.documentElement;
  root.style.setProperty('--sticky-pin-top', `${top}px`);
  const r = figCol.getBoundingClientRect();
  // Use the height the pin will have, not fig.bottom while the figure is still down the page
  // (a large --sticky-card-top breaks scroll-margin and scrollIntoView).
  const pinnedBottom = r.top <= top + 4 ? r.bottom : top + r.height;
  root.style.setProperty('--sticky-card-top', `${Math.round(isCompactPhone() ? pinnedBottom : top)}px`);
}

/**
 * On wide screens, put section (b)'s figures beside its prose.
 */
export function layoutSetupSection(art: HTMLElement): void {
  const body = art.querySelector('.tab-body') ?? art;
  const heading = [...body.querySelectorAll('h2')].find((el) => /^b-/.test(el.id) || /the setup/i.test(el.textContent || ''));
  if (!heading) return;
  const nodes: Element[] = [];
  for (let n = heading.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) nodes.push(n);
  if (!nodes.length) return;
  const figs = nodes.filter((n) => n.matches('.viz-slot, .pop-figs, table, .st-eq'));
  const text = nodes.filter((n) => !figs.includes(n));
  if (!figs.length) return;
  const sec = h('section', { class: 'tab-sec tab-sec-setup has-figs', dataset: { testid: 'tab-setup' } });
  const textCol = h('div', { class: 'tab-sec-text' });
  const figCol = h('div', { class: 'tab-sec-figs' });
  heading.replaceWith(sec);
  sec.append(heading, textCol, figCol);
  for (const n of text) textCol.append(n);
  for (const n of figs) figCol.append(n);
}

interface Mount {
  stop: () => void;
  id: string;
  host: HTMLElement;
  controls: ControlSet;
}

/**
 * Rebuild section (c) as a sticky live figure driven by the step in view
 * or a click on a step card. Returns a cleanup.
 */
export function applyStickyLayout(art: HTMLElement, content: AppContent, hooks: FigureHooks, opts: StickyOpts = {}): () => void {
  const sec = sectionCNodes(art);
  if (!sec) return () => {};

  const steps: Step[] = [];
  const leftovers: Element[] = [];
  type Draft = { n: number; ol: HTMLElement; extra: Element[]; slots: HTMLElement[]; looks: string[] };
  let draft: Draft | null = null;
  const extras = new Map<number, Element[]>();
  const flush = () => {
    if (!draft) return;
    const figs = draft.slots.map((s, i) => refFromSlot(s, content, draft!.looks[i]));
    if (figs.length && draft.looks.length > figs.length) {
      const last = figs[figs.length - 1];
      last.look = [last.look, ...draft.looks.slice(figs.length)].filter(Boolean).join('<br>');
    }
    extras.set(draft.n, draft.extra);
    steps.push({ n: draft.n, el: draft.ol, figs });
    draft = null;
  };
  for (const node of sec.nodes) {
    if (node.matches('ol')) {
      flush();
      const ol = node as HTMLElement;
      draft = { n: steps.length + 1, ol, extra: [], slots: [], looks: looksIn(ol) };
    } else if (node.matches('.viz-slot[data-figure], .pop-figs')) {
      const slots = node.matches('.pop-figs')
        ? [...node.querySelectorAll<HTMLElement>('.viz-slot[data-figure]')]
        : [node as HTMLElement];
      if (draft) draft.slots.push(...slots);
      else leftovers.push(node);
    } else if (draft && (node.matches('ul') || node.matches('p') || node instanceof HTMLElement)) {
      draft.extra.push(node);
      draft.looks.push(...looksIn(node as HTMLElement));
    } else {
      leftovers.push(node);
    }
  }
  flush();
  if (!steps.length) return () => {};

  const stepsCol = h('div', { class: 'sticky-steps' });
  const figCol = h('aside', { class: 'sticky-fig', dataset: { testid: 'sticky-fig' } });
  const cap = h('p', { class: 'sticky-cap', dataset: { testid: 'sticky-cap' } });
  const live = h('div', { class: 'sticky-live', dataset: { testid: 'sticky-live' }, 'aria-live': 'polite', 'aria-atomic': 'true' });
  const readout = h('p', { class: 'sticky-readout', dataset: { testid: 'sticky-readout' } });
  const toggleRow = h('div', { class: 'sticky-toggle', dataset: { testid: 'sticky-toggle' }, hidden: true, role: 'group', 'aria-label': 'Which figure' });
  const resetBtn = h('button', { type: 'button', class: 'tbtn sticky-reset', dataset: { testid: 'sticky-reset' } }, 'Reset to this step');
  const openCtl = h('button', {
    type: 'button', class: 'tbtn sticky-ctl-open', dataset: { testid: 'sticky-controls-open' },
    'aria-expanded': 'false', 'aria-controls': 'sticky-controls-sheet',
  }, 'Controls');
  const hostA = h('div', { class: 'viz-slot viz-embed sticky-host', dataset: { skipEmbed: '1', testid: 'viz' } }) as HTMLElement;
  const hostB = h('div', { class: 'viz-slot viz-embed sticky-host', dataset: { skipEmbed: '1', testid: 'viz' }, hidden: true }) as HTMLElement;
  const hosts = [hostA, hostB];
  const howBody = h('div', { class: 'sticky-how-body' });
  const howBox = h('details', { class: 'sticky-how', dataset: { testid: 'how-to-read' } },
    h('summary', null, 'How to read this'),
    howBody);
  const sheet = h('div', {
    class: 'sticky-sheet', hidden: true, id: 'sticky-controls-sheet',
    dataset: { testid: 'sticky-controls-sheet' }, role: 'dialog', 'aria-label': 'Controls',
  },
    h('div', { class: 'sticky-sheet-head' },
      h('strong', null, 'Controls'),
      h('button', { type: 'button', class: 'tbtn sticky-sheet-close', dataset: { testid: 'sticky-controls-close' }, 'aria-label': 'Close controls' }, '✕'),
    ),
    h('div', { class: 'sticky-controls-body', dataset: { testid: 'sticky-controls-body' } }),
  );
  const backdrop = h('div', { class: 'sticky-sheet-backdrop', hidden: true, dataset: { testid: 'sticky-controls-backdrop' } });
  const toolbar = h('div', { class: 'sticky-toolbar' }, toggleRow, resetBtn, openCtl);
  figCol.append(cap, toolbar, hostA, hostB, howBox, live, readout);

  const pinSheet = () => {
    const r = figCol.getBoundingClientRect();
    const top = `${Math.round(r.bottom)}px`;
    sheet.style.top = top;
    backdrop.style.top = top;
  };
  const setSheet = (open: boolean) => {
    sheet.hidden = !open;
    backdrop.hidden = !open;
    openCtl.setAttribute('aria-expanded', String(open));
    if (open) pinSheet();
  };
  openCtl.addEventListener('click', (e) => { e.stopPropagation(); setSheet(sheet.hidden); });
  sheet.querySelector('.sticky-sheet-close')?.addEventListener('click', () => setSheet(false));
  backdrop.addEventListener('click', () => setSheet(false));

  for (const node of leftovers) {
    if (node.matches('.viz-slot[data-figure], .pop-figs')) node.remove();
    else stepsCol.append(node);
  }

  let locked = false;
  let lockedStep: Step | null = null;
  let mounts: Mount[] = [];
  let active: Step = steps[0];
  let figIndex = 0;
  let stacked = false;

  const activateByClick = (step: Step, index = 0) => {
    locked = true;
    lockedStep = step;
    setActive(step, index);
  };

  for (const step of steps) {
    const show = h('button', { type: 'button', class: 'sticky-show', dataset: { testid: 'sticky-show' } }, 'Show this');
    const wrap = h('div', { class: 'sticky-step', dataset: { testid: 'sticky-step', step: String(step.n) } },
      h('div', { class: 'sticky-step-bar' }, show),
      step.el,
      ...(extras.get(step.n) ?? []),
    );
    const ol = step.el as HTMLOListElement;
    ol.start = step.n;
    wrap.style.zIndex = String(step.n);
    wrap.dataset.figure = step.figs.map((f) => f.id).join(',');
    if (step.figs[0]?.preset) wrap.dataset.preset = step.figs.map((f) => f.preset ?? '').join(',');
    const onActivate = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest('a, input, textarea, select')) return;
      e.preventDefault();
      e.stopPropagation();
      activateByClick(step, 0);
    };
    show.addEventListener('click', onActivate);
    wrap.addEventListener('click', onActivate);
    step.el = wrap;
    stepsCol.append(wrap);
  }

  const wrap = h('div', { class: 'sticky-split', dataset: { testid: 'sticky-split' } }, figCol, stepsCol);
  sec.heading.after(wrap);
  document.body.append(sheet, backdrop);
  for (const step of steps) for (const f of step.figs) f.slot.remove();

  opts.frame?.classList.add('has-sticky');

  const destroyMounts = () => {
    for (const m of mounts) {
      try { m.stop(); } catch { /* already gone */ }
    }
    mounts = [];
    for (const host of hosts) clear(host);
  };

  const mountFig = (host: HTMLElement, fig: FigRef): Mount | null => {
    host.hidden = false;
    host.dataset.figure = fig.id;
    host.dataset.preset = fig.preset ?? '';
    if (fig.params) host.dataset.params = fig.params; else delete host.dataset.params;
    host.dataset.skipEmbed = '1';
    const def = content.figures.find((f) => f.id === fig.id);
    const mounter = hooks.figures?.[fig.id];
    if (!def || !mounter) {
      host.append(h('p', { class: 'st-hint' }, `(figure ${fig.id} is not available)`));
      return null;
    }
    const controls = controlsForSlot(def, host);
    const stop = mounter(host, { ...def, lookFor: undefined }, controls);
    return { stop: typeof stop === 'function' ? stop : () => {}, id: fig.id, host, controls };
  };

  const placeControls = () => {
    const body = sheet.querySelector('.sticky-controls-body') as HTMLElement;
    openCtl.hidden = !isCompactPhone();
    if (!isCompactPhone()) setSheet(false);
    if (isCompactPhone()) {
      for (const host of hosts) {
        host.querySelectorAll('.st-ctl').forEach((rail) => body.append(rail));
      }
    } else {
      const rails = [...body.querySelectorAll<HTMLElement>(':scope > .st-ctl')];
      for (const rail of rails) {
        const layout = hosts.map((h) => h.querySelector('.fig-layout')).find((l) => l && !l.querySelector('.st-ctl'))
          ?? hosts[0]?.querySelector('.fig-layout');
        layout?.append(rail);
      }
    }
    howBox.open = !isCompactPhone() && !isLandscapePhone();
    setPinVars(figCol);
  };

  const fenceKey = (f: FigRef) => `${f.id}/${f.preset ?? ''}/${f.params ?? ''}`;

  const paintHow = (shown: FigRef[]) => {
    const bits = shown.map((f) => {
      const def = content.figures.find((d) => d.id === f.id);
      return def?.howToRead ? def.howToRead : '';
    }).filter(Boolean);
    howBox.hidden = !bits.length;
    howBody.innerHTML = bits.join('<hr>');
  };

  const paintToggle = (step: Step, index: number, stack: boolean) => {
    clear(toggleRow);
    if (step.figs.length < 2) { toggleRow.hidden = true; return; }
    toggleRow.hidden = false;
    step.figs.forEach((fig, i) => {
      const on = stack || i === index;
      const btn = h('button', {
        type: 'button',
        class: on && !stack ? 'on' : '',
        'aria-pressed': String(stack ? true : i === index),
        dataset: { testid: 'sticky-fig-choice', fig: fig.id, index: String(i) },
        onclick: () => { activateByClick(step, i); stacked = false; setActive(step, i, false); },
      }, fig.title);
      toggleRow.append(btn);
    });
    if (!isCompactPhone() && !isLandscapePhone()) {
      const both = h('button', {
        type: 'button',
        class: stack ? 'on' : '',
        'aria-pressed': String(stack),
        dataset: { testid: 'sticky-fig-both' },
        onclick: () => { stacked = true; activateByClick(step, 0); setActive(step, 0, false); },
      }, 'Both');
      toggleRow.append(both);
    }
  };

  const setActive = (step: Step, index = 0, reuseStack = true) => {
    active = step;
    figIndex = Math.max(0, Math.min(index, step.figs.length - 1));
    const stack = step.figs.length > 1 && (reuseStack ? canStack(step.figs) || stacked : stacked);
    stacked = stack;

    for (const s of steps) {
      const on = s === step;
      s.el.classList.toggle('on', on);
      if (on) s.el.setAttribute('aria-current', 'step');
      else s.el.removeAttribute('aria-current');
    }

    const shown = stack ? step.figs : [step.figs[figIndex] ?? step.figs[0]];
    const same =
      mounts.length === shown.length
      && mounts.every((m, i) => m.id === shown[i].id);

    if (same) {
      shown.forEach((fig, i) => applyFenceValues(mounts[i].controls, fig));
    } else {
      destroyMounts();
      hostB.hidden = shown.length < 2;
      shown.forEach((fig, i) => {
        const m = mountFig(hosts[i], fig);
        if (m) mounts.push(m);
      });
    }
    hostB.hidden = shown.length < 2;

    const title = shown.map((f) => f.title).join(' · ');
    cap.innerHTML = `Step ${step.n}: <b>${esc(title)}</b>`;
    const keys = shown.map(fenceKey).join(' | ');
    readout.textContent = keys;
    figCol.dataset.step = String(step.n);
    figCol.dataset.figure = shown.map((f) => f.id).join(',');
    figCol.dataset.preset = shown.map((f) => f.preset ?? '').join(',');
    if (shown.some((f) => f.params)) figCol.dataset.params = shown.map((f) => f.params ?? '').join('|');
    else delete figCol.dataset.params;
    live.textContent = `Showing step ${step.n}: ${title}`;
    paintHow(shown);
    paintToggle(step, figIndex, stacked);
    requestAnimationFrame(() => { placeControls(); setPinVars(figCol); });
  };

  resetBtn.addEventListener('click', (e) => { e.stopPropagation(); setActive(active, figIndex, true); });

  const nearestStep = (): Step | null => {
    if (isCompactPhone()) {
      const targetY = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-card-top')) || figCol.getBoundingClientRect().bottom) + 8;
      // Every earlier card stays stuck at the same pin, so "closest top" would
      // keep picking step 1. Take the last card that has reached the pin and
      // still extends below it.
      let best: Step | null = null;
      for (const s of steps) {
        const r = s.el.getBoundingClientRect();
        if (r.bottom <= targetY) continue;
        if (r.top <= targetY + 16) best = s;
      }
      return best;
    }
    const targetY = window.innerHeight / 3;
    let best: Step | null = null;
    let bestDist = Infinity;
    for (const s of steps) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 40 || r.top > window.innerHeight - 20) continue;
      const dist = Math.abs(r.top - targetY);
      if (dist < bestDist) { bestDist = dist; best = s; }
    }
    return best;
  };

  const onScroll = () => {
    setPinVars(figCol);
    pinSheet();
    const near = nearestStep();
    if (locked) {
      if (near && lockedStep && near !== lockedStep) {
        locked = false;
        lockedStep = null;
        setActive(near, 0);
      }
      return;
    }
    if (near && near !== active) setActive(near, 0);
  };

  let io: IntersectionObserver | null = null;
  const startIo = () => {
    io = new IntersectionObserver(() => { if (!locked) onScroll(); }, {
      root: null,
      rootMargin: '-20% 0px -45% 0px',
      threshold: [0, 0.15, 0.3, 0.5, 0.75, 1],
    });
    for (const s of steps) io.observe(s.el);
  };

  const onResize = () => {
    placeControls();
    setPinVars(figCol);
    if (active.figs.length > 1) setActive(active, figIndex, true);
  };

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sheet.hidden) setSheet(false); };

  setActive(steps[0], 0);
  requestAnimationFrame(() => { startIo(); setPinVars(figCol); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKey);

  return () => {
    io?.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    setSheet(false);
    sheet.remove();
    backdrop.remove();
    destroyMounts();
    opts.frame?.classList.remove('has-sticky');
    document.documentElement.style.removeProperty('--sticky-pin-top');
    document.documentElement.style.removeProperty('--sticky-card-top');
  };
}
