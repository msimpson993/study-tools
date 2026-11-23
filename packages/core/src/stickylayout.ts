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
  if (window.innerWidth < 700) return false;
  const budget = window.innerHeight - 7 * 16;
  if (budget < 820) return false;
  if (figs.some((f) => HEAVY.has(f.id))) return budget >= 1100;
  return true;
}

function isPhone(): boolean {
  return window.matchMedia('(max-width: 699.98px)').matches;
}

interface Mount {
  stop: () => void;
  id: string;
  host: HTMLElement;
  controls: ControlSet;
}

/**
 * Rebuild section (c) as a two-column sticky figure (stacked on a phone) driven by the
 * step in view, a "Show this" button, or a two-figure toggle. Returns a cleanup.
 */
export function applyStickyLayout(art: HTMLElement, content: AppContent, hooks: FigureHooks, opts: StickyOpts = {}): () => void {
  const sec = sectionCNodes(art);
  if (!sec) return () => {};

  // Walk nodes in order, grouping each <ol> with the figure slots and loose lists that follow it.
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
  const lookEl = h('p', { class: 'sticky-look', dataset: { testid: 'sticky-look' } });
  const lookBox = h('details', { class: 'sticky-look-box', dataset: { testid: 'sticky-look-box' } },
    h('summary', null, 'Look for'),
    lookEl);
  const live = h('div', { class: 'sticky-live', dataset: { testid: 'sticky-live' }, 'aria-live': 'polite', 'aria-atomic': 'true' });
  const readout = h('p', { class: 'sticky-readout', dataset: { testid: 'sticky-readout' } });
  const toggleRow = h('div', { class: 'sticky-toggle', dataset: { testid: 'sticky-toggle' }, hidden: true, role: 'group', 'aria-label': 'Which figure' });
  const resetBtn = h('button', { type: 'button', class: 'tbtn sticky-reset', dataset: { testid: 'sticky-reset' } }, 'Reset to this step');
  const hostA = h('div', { class: 'viz-slot viz-embed sticky-host', dataset: { skipEmbed: '1', testid: 'viz' } }) as HTMLElement;
  const hostB = h('div', { class: 'viz-slot viz-embed sticky-host', dataset: { skipEmbed: '1', testid: 'viz' }, hidden: true }) as HTMLElement;
  const hosts = [hostA, hostB];
  const drawer = h('details', { class: 'sticky-controls', dataset: { testid: 'sticky-controls' } },
    h('summary', null, 'Controls'),
    h('div', { class: 'sticky-controls-body', dataset: { testid: 'sticky-controls-body' } }),
  );
  const toolbar = h('div', { class: 'sticky-toolbar' }, toggleRow, resetBtn);
  figCol.append(cap, toolbar, hostA, hostB, drawer, lookBox, live, readout);

  for (const node of leftovers) {
    if (node.matches('.viz-slot[data-figure], .pop-figs')) node.remove();
    else stepsCol.append(node);
  }

  for (const step of steps) {
    const show = h('button', { type: 'button', class: 'sticky-show', dataset: { testid: 'sticky-show' } }, 'Show this');
    const wrap = h('div', { class: 'sticky-step', dataset: { testid: 'sticky-step', step: String(step.n) } },
      h('div', { class: 'sticky-step-bar' }, show),
      step.el,
      ...(extras.get(step.n) ?? []),
    );
    const ol = step.el as HTMLOListElement;
    ol.start = step.n;
    wrap.dataset.figure = step.figs.map((f) => f.id).join(',');
    if (step.figs[0]?.preset) wrap.dataset.preset = step.figs.map((f) => f.preset ?? '').join(',');
    show.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      lockIo();
      setActive(step, 0);
    });
    step.el = wrap;
    stepsCol.append(wrap);
  }

  const wrap = h('div', { class: 'sticky-split', dataset: { testid: 'sticky-split' } }, stepsCol, figCol);
  sec.heading.after(wrap);
  // Original (c) figure slots are no longer in the article flow.
  for (const step of steps) for (const f of step.figs) f.slot.remove();

  opts.frame?.classList.add('has-sticky');

  let mounts: Mount[] = [];
  let active: Step = steps[0];
  let figIndex = 0;
  let stacked = false;
  let locked = false;
  let lockY = 0;

  const lockIo = () => { locked = true; lockY = window.scrollY; };

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
    const body = drawer.querySelector('.sticky-controls-body') as HTMLElement;
    if (isPhone()) {
      drawer.hidden = false;
      for (const host of hosts) {
        host.querySelectorAll('.st-ctl').forEach((rail) => body.append(rail));
      }
    } else {
      drawer.hidden = true;
      // Rails stay in the figure layout (placeRail in figure.ts).
    }
  };

  const fenceKey = (f: FigRef) => `${f.id}/${f.preset ?? ''}/${f.params ?? ''}`;

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
        onclick: () => {
          lockIo();
          stacked = false;
          setActive(step, i, false);
        },
      }, fig.title);
      toggleRow.append(btn);
    });
    if (window.innerWidth >= 700) {
      const both = h('button', {
        type: 'button',
        class: stack ? 'on' : '',
        'aria-pressed': String(stack),
        dataset: { testid: 'sticky-fig-both' },
        onclick: () => { lockIo(); stacked = true; setActive(step, 0, false); },
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
    const lookHtml = shown.map((f) => f.look).filter(Boolean).join('<br>');
    lookEl.hidden = !lookHtml;
    lookEl.innerHTML = lookHtml ? `<b>Look for:</b> ${lookHtml}` : '';
    lookBox.hidden = !lookHtml;
    if (!isPhone()) lookBox.open = true;
    else lookBox.open = false;
    const keys = shown.map(fenceKey).join(' | ');
    readout.textContent = keys;
    figCol.dataset.step = String(step.n);
    figCol.dataset.figure = shown.map((f) => f.id).join(',');
    figCol.dataset.preset = shown.map((f) => f.preset ?? '').join(',');
    if (shown.some((f) => f.params)) figCol.dataset.params = shown.map((f) => f.params ?? '').join('|');
    else delete figCol.dataset.params;
    live.textContent = `Showing step ${step.n}: ${title}`;
    paintToggle(step, figIndex, stacked);
    requestAnimationFrame(placeControls);
  };

  resetBtn.addEventListener('click', () => setActive(active, figIndex, true));

  let io: IntersectionObserver | null = null;
  const pickNearest = () => {
    if (locked) return;
    const targetY = window.innerHeight / 3;
    let best: Step | null = null;
    let bestDist = Infinity;
    for (const s of steps) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 40 || r.top > window.innerHeight - 20) continue;
      const dist = Math.abs(r.top - targetY);
      if (dist < bestDist) { bestDist = dist; best = s; }
    }
    if (best && best !== active) setActive(best, 0);
  };

  const onScroll = () => {
    if (locked && Math.abs(window.scrollY - lockY) > 32) locked = false;
    if (!locked) pickNearest();
  };

  const startIo = () => {
    io = new IntersectionObserver(() => { if (!locked) pickNearest(); }, {
      root: null,
      rootMargin: '-20% 0px -45% 0px',
      threshold: [0, 0.15, 0.3, 0.5, 0.75, 1],
    });
    for (const s of steps) io.observe(s.el);
  };

  const onResize = () => {
    placeControls();
    if (active.figs.length > 1) setActive(active, figIndex, true);
  };

  setActive(steps[0], 0);
  requestAnimationFrame(() => startIo());
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  return () => {
    io?.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    destroyMounts();
    opts.frame?.classList.remove('has-sticky');
  };
}

