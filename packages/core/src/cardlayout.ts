/** One regular page section per section (c) step, with full-size figures and local controls. */
import { h, clear } from './dom';
import { controlsForSlot, type FigureHooks } from './embed';
import type { ControlSet } from './controls';
import { howToReadBlocks, type AppContent } from './types';
import type { FigureMountOpts } from './figure';

const SECTION_C = /c-what-s-going-on/;
export interface CardLayoutOpts {
  /** The tabbed `.frame` — widened while step cards are present. */
  frame?: HTMLElement;
}

interface FigRef {
  id: string;
  preset?: string;
  params?: string;
  panels?: string[];
  title: string;
  slot: HTMLElement;
}

interface Step {
  n: number;
  el: HTMLElement;
  figs: FigRef[];
  extra: Element[];
  ol: HTMLElement;
}

interface Mount {
  stop: () => void;
  host: HTMLElement;
  controls: ControlSet;
  /** serialized state to apply after the tile frame exists, so the first remount draw is sized */
  pendingRestore?: string;
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

function figureTitle(content: AppContent, id: string): string {
  return content.figures.find((f) => f.id === id)?.title ?? id;
}

function parsePanels(slot: HTMLElement): string[] | undefined {
  const raw = slot.dataset.panels;
  if (raw) {
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return ids.length ? ids : undefined;
  }
  const p = slot.dataset.params;
  if (!p) return undefined;
  try {
    const v = (JSON.parse(p) as { panels?: string }).panels;
    if (!v) return undefined;
    const ids = String(v).split(',').map((s) => s.trim()).filter(Boolean);
    return ids.length ? ids : undefined;
  } catch { return undefined; }
}

function refFromSlot(slot: HTMLElement, content: AppContent): FigRef {
  return {
    id: slot.dataset.figure || '',
    preset: slot.dataset.preset || undefined,
    params: slot.dataset.params || undefined,
    panels: parsePanels(slot),
    title: figureTitle(content, slot.dataset.figure || ''),
    slot,
  };
}


function headerBottom(): number {
  const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
  const top = document.querySelector('.topbar') as HTMLElement | null;
  if (bar) return Math.round(bar.getBoundingClientRect().bottom);
  if (top) return Math.round(top.getBoundingClientRect().bottom);
  return 88;
}

function setChromeVar(): void {
  document.documentElement.style.setProperty('--tab-chrome', `${headerBottom()}px`);
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

function stepTitle(ol: HTMLElement): string {
  const li = ol.querySelector(':scope > li');
  if (!li) return (ol.textContent || '').trim().slice(0, 120);
  const strong = li.querySelector(':scope > strong, :scope > b, :scope > p > strong, :scope > p > b');
  if (strong) return (strong.textContent || '').trim();
  const text = (li.childNodes[0]?.textContent || li.textContent || '').trim();
  return text.split('\n')[0].replace(/^[0-9]+\.\s*/, '').slice(0, 160);
}

function stepBodyNodes(ol: HTMLElement): Node[] {
  const li = ol.querySelector(':scope > li');
  if (!li) return [...ol.childNodes];
  const nodes: Node[] = [];
  let afterTitle = false;
  for (const n of [...li.childNodes]) {
    if (!afterTitle) {
      if (n.nodeType === 1 && (n as HTMLElement).matches('strong, b')) { afterTitle = true; continue; }
      if (n.nodeType === 1 && (n as HTMLElement).matches('p') && (n as HTMLElement).querySelector('strong, b')) { afterTitle = true; continue; }
      if (n.nodeType === 3 && !(n.textContent || '').trim()) continue;
      // a leading title text node
      if (n.nodeType === 3) { afterTitle = true; continue; }
    }
    nodes.push(n);
  }
  return nodes.length ? nodes : [...li.childNodes];
}

/** No-op lock kept so Contents jumps can still call it after the card snap was removed. */
export function lockStepJump(ms = 900): void {
  const root = document.documentElement;
  root.classList.add('step-jumping');
  const until = Date.now() + ms;
  (lockStepJump as { until?: number }).until = until;
  window.setTimeout(() => {
    if (Date.now() >= ((lockStepJump as { until?: number }).until ?? 0)) root.classList.remove('step-jumping');
  }, ms);
}

/**
 * Rebuild section (c) as a regular page: each step is a heading, its text,
 * full-size figures (two abreast on desktop, stacked on phones), then that
 * step's controls under the plots. Returns a cleanup.
 */
export function applyCardLayout(art: HTMLElement, content: AppContent, hooks: FigureHooks, opts: CardLayoutOpts = {}): () => void {
  const sec = sectionCNodes(art);
  if (!sec) return () => {};

  const steps: Step[] = [];
  const leftovers: Element[] = [];
  type Draft = { n: number; ol: HTMLElement; extra: Element[]; slots: HTMLElement[] };
  let draft: Draft | null = null;
  const flush = () => {
    if (!draft) return;
    const figs = draft.slots.map((s) => refFromSlot(s, content));
    steps.push({ n: draft.n, el: draft.ol, figs, extra: draft.extra, ol: draft.ol });
    draft = null;
  };
  for (const node of sec.nodes) {
    if (node.matches('ol')) {
      flush();
      draft = { n: steps.length + 1, ol: node as HTMLElement, extra: [], slots: [] };
    } else if (node.matches('.viz-slot[data-figure], .pop-figs')) {
      const slots = node.matches('.pop-figs')
        ? [...node.querySelectorAll<HTMLElement>('.viz-slot[data-figure]')]
        : [node as HTMLElement];
      if (draft) draft.slots.push(...slots);
      else leftovers.push(node);
    } else if (draft && node instanceof HTMLElement) {
      draft.extra.push(node);
    } else {
      leftovers.push(node);
    }
  }
  flush();
  if (!steps.length) return () => {};

  const total = steps.length;
  const marker = document.createComment('step-sections-here');
  sec.heading.after(marker);
  const wrap = h('div', { class: 'step-sections', dataset: { testid: 'step-sections' } });

  const alive = new Map<Step, Mount[]>();
  const savedState = new Map<string, string>();

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
    const figOpts: FigureMountOpts = { flatControls: true, panels: fig.panels, expandable: false };
    const stop = mounter(host, { ...def, lookFor: undefined }, controls, figOpts);
    const saved = savedState.get(host.dataset.stateKey || '');
    const syncPreset = () => {
      host.dataset.preset = controls.active ?? '';
      const secEl = host.closest('.step-section') as HTMLElement | null;
      if (secEl && secEl.querySelectorAll('.step-host').length === 1) {
        secEl.dataset.preset = controls.active ?? '';
      }
    };
    syncPreset();
    controls.onChange(() => { syncPreset(); placeTableChip(host.closest('.step-section') as HTMLElement); });
    return { stop: typeof stop === 'function' ? stop : () => {}, host, controls, pendingRestore: saved || undefined };
  };

  const placeTableChip = (secEl: HTMLElement | null) => {
    if (!secEl) return;
    const bar = secEl.querySelector('.step-controls') as HTMLElement | null;
    if (!bar) return;
    let chip = bar.querySelector<HTMLButtonElement>('.param-chip');
    const tableFig = [...secEl.querySelectorAll<HTMLElement>('.fig')].find((fig) => {
      const cv = fig.querySelector('canvas') as HTMLCanvasElement | null;
      return (cv?.dataset.fig ?? fig.dataset.panel) === 'table';
    });
    if (!tableFig) { chip?.remove(); return; }
    tableFig.hidden = true;
    const cv = tableFig.querySelector('canvas') as HTMLCanvasElement | null;
    const summary = cv?.dataset.summary || '';
    if (!chip) {
      chip = h('button', { type: 'button', class: 'param-chip', dataset: { testid: 'param-chip' } }) as HTMLButtonElement;
      chip.addEventListener('click', () => {
        const xp = tableFig.querySelector<HTMLButtonElement>('.st-xp');
        if (xp) xp.click();
        else cv?.click();
      });
    }
    chip.replaceChildren();
    chip.append(h('b', null, 'Parameters'));
    if (summary) chip.append(document.createTextNode(`  ${summary}`));
    chip.append(h('span', { class: 'hint' }, 'View'));
    if (chip.parentElement !== bar) bar.append(chip);
  };

  const placeControls = (step: Step, secEl: HTMLElement) => {
    const bar = secEl.querySelector('.step-controls') as HTMLElement | null;
    const how = secEl.querySelector('.step-how') as HTMLDetailsElement | null;
    if (how && !how.open) how.open = true;
    const mounts = alive.get(step) ?? [];
    if (bar) {
      for (const m of mounts) {
        const rail = m.host.querySelector('.st-ctl');
        if (rail && rail.parentElement !== bar) bar.append(rail);
      }
      for (const play of secEl.querySelectorAll<HTMLElement>('[data-testid=play]')) {
        if (play.parentElement !== bar) bar.prepend(play);
      }
    }
    placeTableChip(secEl);
  };

  const paintHow = (secEl: HTMLElement, figs: FigRef[]) => {
    const how = secEl.querySelector('.step-how') as HTMLDetailsElement | null;
    const body = secEl.querySelector('.step-how-body') as HTMLElement | null;
    if (!how || !body) return;
    const bits: string[] = [];
    for (const f of figs) {
      const def = content.figures.find((d) => d.id === f.id);
      const mounted = f.panels?.length
        ? f.panels
        : [...secEl.querySelectorAll<HTMLElement>(`.fig[data-fig-id="${f.id}"]`)].map((el) => el.dataset.panel || '').filter(Boolean);
      bits.push(...howToReadBlocks(def?.howToRead, mounted.filter((id) => id !== 'table')));
    }
    how.hidden = !bits.length;
    body.innerHTML = bits.map((s) => `<p>${s}</p>`).join('');
    how.open = true;
  };

  const unmount = (step: Step) => {
    const mounts = alive.get(step);
    if (!mounts) return;
    const secEl = step.el;
    secEl.querySelector('.step-controls')?.querySelectorAll('.st-ctl, [data-testid=play], .param-chip').forEach((el) => el.remove());
    for (const m of mounts) {
      const key = m.host.dataset.stateKey;
      if (key) savedState.set(key, m.controls.serialize());
      try { m.stop(); } catch { /* already gone */ }
      clear(m.host);
    }
    alive.delete(step);
  };

  const mount = (step: Step) => {
    if (alive.has(step)) return;
    const secEl = step.el;
    const mounts: Mount[] = [];
    const hosts = [...secEl.querySelectorAll<HTMLElement>('.step-host')];
    step.figs.forEach((fig, i) => {
      const host = hosts[i];
      if (!host) return;
      const m = mountFig(host, fig);
      if (m) mounts.push(m);
    });
    alive.set(step, mounts);
    for (const m of mounts) {
      if (m.host.dataset.figure === 'tuner') m.host.classList.add('is-tuner');
    }
    placeControls(step, secEl);
    paintHow(secEl, step.figs);
    for (const m of mounts) {
      if (m.pendingRestore) { m.controls.restore(m.pendingRestore); m.pendingRestore = undefined; }
    }
    // redraw once the full-size boxes have a real width
    requestAnimationFrame(() => window.dispatchEvent(new Event('study-theme')));
  };

  for (const step of steps) {
    const title = stepTitle(step.ol);
    const bodyNodes = stepBodyNodes(step.ol);
    const prose = h('div', { class: 'step-prose', dataset: { testid: 'step-prose' } });
    if (bodyNodes.length) {
      for (const n of bodyNodes) prose.append(n);
    }
    for (const extra of step.extra) {
      if (extra.matches('.viz-slot[data-figure], .pop-figs')) continue;
      prose.append(extra);
    }
    const howBody = h('div', { class: 'step-how-body' });
    const howBox = h('details', { class: 'step-how', open: true, dataset: { testid: 'how-to-read' } },
      h('summary', null, 'How to read this'),
      howBody);
    const figCount = Math.max(1, step.figs.length);
    const figs = h('div', { class: `step-figs n-${figCount}`, dataset: { testid: 'step-figs' } });
    step.figs.forEach((fig, i) => {
      const host = h('div', {
        class: 'viz-slot viz-embed step-host',
        dataset: { skipEmbed: '1', testid: 'viz', figure: fig.id, preset: fig.preset ?? '', stateKey: `${step.n}:${i}:${fig.id}` },
      }) as HTMLElement;
      if (fig.params) host.dataset.params = fig.params;
      if (fig.panels?.length) host.dataset.panels = fig.panels.join(',');
      figs.append(host);
      fig.slot.remove();
    });
    const controls = h('div', { class: 'step-controls', dataset: { testid: 'step-controls' } });
    const head = h('header', { class: 'step-head' },
      h('h3', null, `${step.n}. ${title}`),
      h('span', { class: 'step-ind', dataset: { testid: 'step-ind' } }, `Step ${step.n} of ${total}`),
    );
    const secEl = h('section', {
      class: 'step-section',
      id: `step-${step.n}`,
      dataset: {
        testid: 'step-section',
        step: String(step.n),
        figure: step.figs.map((f) => f.id).join(','),
        preset: step.figs.map((f) => f.preset ?? '').join(','),
      },
    }, head, prose, howBox, figs, controls);
    step.el = secEl;
  }

  for (const node of leftovers) {
    if (node.matches('.viz-slot[data-figure], .pop-figs')) node.remove();
    else wrap.append(node);
  }
  for (const s of steps) wrap.append(s.el);
  for (const s of steps) s.ol.remove();
  marker.replaceWith(wrap);

  opts.frame?.classList.add('has-step-sections');
  document.documentElement.classList.add('has-step-sections');
  setChromeVar();

  const mountAll = () => { for (const s of steps) mount(s); };
  const onResize = () => {
    setChromeVar();
    for (const s of alive.keys()) placeControls(s, s.el);
  };
  requestAnimationFrame(() => { setChromeVar(); mountAll(); });
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    document.documentElement.classList.remove('step-jumping');
    for (const s of [...alive.keys()]) unmount(s);
    opts.frame?.classList.remove('has-step-sections');
    document.documentElement.classList.remove('has-step-sections');
    document.documentElement.style.removeProperty('--tab-chrome');
  };
}
