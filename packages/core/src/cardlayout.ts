/** One viewport-tall figure card per section (c) step, with local controls. */
import { h, clear } from './dom';
import { controlsForSlot, type FigureHooks } from './embed';
import type { ControlSet } from './controls';
import type { AppContent } from './types';
import type { FigureMountOpts } from './figure';

const SECTION_C = /c-what-s-going-on/;
const LIVE_CAP = 3;

export interface CardLayoutOpts {
  /** The tabbed `.frame` — widened while step cards are present. */
  frame?: HTMLElement;
}

interface FigRef {
  id: string;
  preset?: string;
  params?: string;
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

function refFromSlot(slot: HTMLElement, content: AppContent): FigRef {
  return {
    id: slot.dataset.figure || '',
    preset: slot.dataset.preset || undefined,
    params: slot.dataset.params || undefined,
    title: figureTitle(content, slot.dataset.figure || ''),
    slot,
  };
}

function isPortraitPhone(): boolean {
  if (isLandscapePhone()) return false;
  return window.matchMedia('(max-width: 699.98px)').matches;
}

function isLandscapePhone(): boolean {
  return window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
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

/** Lock the gentle card-settle while a Contents (or other) jump is in flight. */
export function lockStepJump(ms = 900): void {
  const root = document.documentElement;
  root.classList.add('step-jumping');
  const until = Date.now() + ms;
  (lockStepJump as { until?: number }).until = until;
  window.setTimeout(() => {
    if (Date.now() >= ((lockStepJump as { until?: number }).until ?? 0)) root.classList.remove('step-jumping');
  }, ms);
}

const SETTLE_IDLE_MS = 150;
const SETTLE_BAND = 0.13;

/** After scrolling stops, flush a nearby card in the direction of travel — never against it. */
function attachCardSettle(): () => void {
  let lastY = window.scrollY;
  let dir = 0;
  let timer = 0;
  let settling = false;
  const onScroll = () => {
    if (settling) return;
    const y = window.scrollY;
    const dy = y - lastY;
    if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
    lastY = y;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(trySettle, SETTLE_IDLE_MS);
  };
  const trySettle = () => {
    if (document.documentElement.classList.contains('step-jumping')) return;
    if (!document.documentElement.classList.contains('has-step-cards')) return;
    if (!dir) return;
    const pin = headerBottom();
    const band = window.innerHeight * SETTLE_BAND;
    let target: HTMLElement | null = null;
    let best = Infinity;
    for (const card of document.querySelectorAll<HTMLElement>('.step-card')) {
      const delta = card.getBoundingClientRect().top - pin;
      if (dir > 0) {
        if (delta > 1 && delta <= band && delta < best) { best = delta; target = card; }
      } else if (delta < -1 && delta >= -band && -delta < best) {
        best = -delta; target = card;
      }
    }
    if (!target) return;
    settling = true;
    const dest = window.scrollY + (target.getBoundingClientRect().top - pin);
    window.scrollTo({ top: Math.max(0, dest), behavior: 'smooth' });
    window.setTimeout(() => { settling = false; lastY = window.scrollY; }, 420);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    if (timer) window.clearTimeout(timer);
  };
}

/**
 * Rebuild section (c) as one viewport-tall card per step, each with its own
 * figure instance, local controls, and independently scrolling columns.
 * Returns a cleanup.
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
  // Leave the (c) heading where it is and insert the cards right after it,
  // so (c) stays between (b) and (d). (A search for the first remaining H2
  // would find (a), which used to put the cards at the top of the tab.)
  const marker = document.createComment('step-cards-here');
  sec.heading.after(marker);
  const cardsWrap = h('div', { class: 'step-cards', dataset: { testid: 'step-cards' } });

  const openSheets = new Map<Step, (open: boolean) => void>();
  const unwirePics = new Map<Step, () => void>();
  const alive = new Map<Step, Mount[]>();
  const intersecting = new Set<Step>();
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
    const figOpts: FigureMountOpts = { flatControls: true };
    const stop = mounter(host, { ...def, lookFor: undefined }, controls, figOpts);
    const saved = savedState.get(host.dataset.stateKey || '');
    if (saved) controls.restore(saved);
    const syncPreset = () => {
      host.dataset.preset = controls.active ?? '';
      const card = host.closest('.step-card') as HTMLElement | null;
      if (card && (card.querySelectorAll('.step-host').length === 1)) {
        card.dataset.preset = controls.active ?? '';
      }
    };
    syncPreset();
    controls.onChange(() => syncPreset());
    return { stop: typeof stop === 'function' ? stop : () => {}, host, controls };
  };

  const placeControls = (step: Step, card: HTMLElement) => {
    const sheetBody = card.querySelector('.step-sheet-body') as HTMLElement | null;
    const how = card.querySelector('.step-how') as HTMLDetailsElement | null;
    const openBtn = card.querySelector('.step-ctl-open') as HTMLElement | null;
    const setSheet = openSheets.get(step);
    const phone = isPortraitPhone();
    if (openBtn) openBtn.hidden = !phone;
    if (!phone) setSheet?.(false);
    const mounts = alive.get(step) ?? [];
    if (phone && sheetBody) {
      for (const m of mounts) m.host.querySelectorAll('.st-ctl').forEach((rail) => sheetBody.append(rail));
      if (how) sheetBody.append(how);
    } else {
      if (how) card.querySelector('.step-fig-scroll')?.append(how);
      for (const m of mounts) {
        const rail = sheetBody?.querySelector(':scope > .st-ctl') ?? m.host.querySelector('.st-ctl');
        const layout = m.host.querySelector('.fig-layout');
        if (rail && layout && rail.parentElement !== layout) layout.append(rail);
      }
    }
    if (how) how.open = !phone && !isLandscapePhone();
    parkPlay(card);
    paintMorePlots(card);
  };

  const parkPlay = (card: HTMLElement) => {
    const bar = card.querySelector('.step-toolbar') as HTMLElement | null;
    if (!bar) return;
    const phone = isPortraitPhone() || isLandscapePhone();
    const plays = [...card.querySelectorAll<HTMLElement>('[data-testid=play]')];
    for (const p of plays) {
      if (phone) {
        if (p.parentElement !== bar) bar.insertBefore(p, bar.querySelector('.step-ctl-open'));
      } else {
        const anim = p.closest('.fig-layout')?.querySelector('.fig-anim')
          ?? card.querySelector('.fig-anim');
        if (anim && p.parentElement !== anim) anim.prepend(p);
      }
    }
  };

  const paintMorePlots = (card: HTMLElement) => {
    const col = card.querySelector('.step-fig-scroll') as HTMLElement | null
      ?? card.querySelector('.step-card-fig') as HTMLElement | null;
    const hint = card.querySelector('.more-plots') as HTMLElement | null;
    if (!col || !hint) return;
    const nav = card.querySelector('.pics-nav') as HTMLElement | null;
    if (nav && !nav.hidden) { hint.hidden = true; return; }
    const overflow = col.scrollHeight > col.clientHeight + 24;
    const atEnd = col.scrollTop + col.clientHeight >= col.scrollHeight - 16;
    hint.hidden = !(overflow && !atEnd);
  };

  const paintHow = (card: HTMLElement, figs: FigRef[]) => {
    const how = card.querySelector('.step-how') as HTMLDetailsElement | null;
    const body = card.querySelector('.step-how-body') as HTMLElement | null;
    if (!how || !body) return;
    const bits = figs.map((f) => content.figures.find((d) => d.id === f.id)?.howToRead || '').filter(Boolean);
    how.hidden = !bits.length;
    // howToRead is already HTML-escaped by the content pipeline (`>` → `&gt;`).
    body.innerHTML = bits.map((s) => `<p>${s}</p>`).join('');
  };

  const startOnPlot = (pair: HTMLElement) => {
    const figs = [...pair.querySelectorAll<HTMLElement>(':scope > .fig')];
    const plot = figs.find((f) => f.querySelector('canvas[data-fig="plot"]'))
      ?? figs.find((f) => !f.querySelector('canvas[data-fig="scene"]'))
      ?? figs[0];
    if (plot) pair.scrollLeft = plot.offsetLeft;
  };

  const wirePics = (card: HTMLElement): () => void => {
    const nav = card.querySelector('.pics-nav') as HTMLElement | null;
    const pairs = [...card.querySelectorAll<HTMLElement>('.pair2')];
    const cleanups: (() => void)[] = [];
    if (!nav) return () => {};
    const paint = () => {
      clear(nav);
      const phone = isPortraitPhone();
      const figs = pairs.flatMap((p) => [...p.querySelectorAll<HTMLElement>(':scope > .fig')]);
      nav.hidden = !phone || figs.length < 2;
      if (!phone || figs.length < 2) {
        for (const p of pairs) p.classList.remove('pics-swipe');
        return;
      }
      for (const p of pairs) p.classList.add('pics-swipe');
      // dots across every panel in the card (one swipe row per pair, dots combined in order)
      const items: { pair: HTMLElement; fig: HTMLElement }[] = [];
      for (const p of pairs) for (const fig of p.querySelectorAll<HTMLElement>(':scope > .fig')) items.push({ pair: p, fig });
      const dots = items.map((it, i) => {
        const title = it.fig.querySelector('h4')?.textContent || `Picture ${i + 1}`;
        const btn = h('button', { type: 'button', 'aria-label': title, dataset: { testid: 'pics-dot', index: String(i) } });
        btn.addEventListener('click', () => { it.pair.scrollTo({ left: it.fig.offsetLeft, behavior: 'smooth' }); });
        nav.append(btn);
        return { btn, ...it };
      });
      const sync = () => {
        // highlight the dot whose fig is most visible
        let best = 0, bestVis = -1;
        dots.forEach((d, i) => {
          const r = d.fig.getBoundingClientRect();
          const pr = d.pair.getBoundingClientRect();
          const vis = Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left));
          if (vis > bestVis) { bestVis = vis; best = i; }
        });
        dots.forEach((d, i) => d.btn.classList.toggle('on', i === best));
      };
      for (const p of pairs) {
        p.addEventListener('scroll', sync, { passive: true });
        cleanups.push(() => p.removeEventListener('scroll', sync));
        startOnPlot(p);
      }
      sync();
    };
    paint();
    const mq = window.matchMedia('(max-width: 699.98px)');
    const mqLand = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    const onMq = () => paint();
    mq.addEventListener?.('change', onMq);
    mqLand.addEventListener?.('change', onMq);
    return () => {
      mq.removeEventListener?.('change', onMq);
      mqLand.removeEventListener?.('change', onMq);
      for (const c of cleanups) c();
      clear(nav);
    };
  };

  const unmount = (step: Step) => {
    const mounts = alive.get(step);
    if (!mounts) return;
    unwirePics.get(step)?.();
    unwirePics.delete(step);
    for (const m of mounts) {
      const key = m.host.dataset.stateKey;
      if (key) savedState.set(key, m.controls.serialize());
      try { m.stop(); } catch { /* already gone */ }
      clear(m.host);
    }
    alive.delete(step);
    openSheets.get(step)?.(false);
  };

  const mount = (step: Step) => {
    if (alive.has(step)) return;
    const card = step.el;
    const mounts: Mount[] = [];
    const hosts = [...card.querySelectorAll<HTMLElement>('.step-host')];
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
    placeControls(step, card);
    paintHow(card, step.figs);
    unwirePics.get(step)?.();
    unwirePics.set(step, wirePics(card));
    paintMorePlots(card);
  };

  const dist = (step: Step) => {
    const r = step.el.getBoundingClientRect();
    const mid = (window.innerHeight || 0) / 2;
    return Math.abs((r.top + r.bottom) / 2 - mid);
  };

  const syncMounts = () => {
    const vis = steps.filter((s) => intersecting.has(s));
    for (const s of vis) mount(s);
    const keep = new Set(vis);
    if (keep.size < LIVE_CAP) {
      const others = steps.filter((s) => !keep.has(s)).sort((a, b) => dist(a) - dist(b));
      for (const s of others) {
        if (keep.size >= LIVE_CAP) break;
        keep.add(s);
        mount(s);
      }
    }
    for (const s of [...alive.keys()]) {
      if (!keep.has(s)) unmount(s);
    }
  };

  for (const step of steps) {
    const title = stepTitle(step.ol);
    const bodyNodes = stepBodyNodes(step.ol);
    const textCol = h('div', { class: 'step-card-text', dataset: { testid: 'step-card-text' }, tabindex: '0' });
    if (bodyNodes.length) {
      const wrap = h('div', { class: 'step-card-prose' });
      for (const n of bodyNodes) wrap.append(n);
      textCol.append(wrap);
    }
    for (const extra of step.extra) {
      if (extra.matches('.viz-slot[data-figure], .pop-figs')) continue;
      textCol.append(extra);
    }
    const figCol = h('div', { class: 'step-card-fig', dataset: { testid: 'step-card-fig' }, tabindex: '0' });
    const figScroll = h('div', { class: 'step-fig-scroll' });
    const openCtl = h('button', {
      type: 'button', class: 'tbtn step-ctl-open', dataset: { testid: 'step-controls-open' },
      'aria-expanded': 'false', hidden: true,
    }, '⚙ Controls');
    const toolbar = h('div', { class: 'step-toolbar' }, openCtl);
    figScroll.append(toolbar);
    const hosts: HTMLElement[] = [];
    step.figs.forEach((fig, i) => {
      const host = h('div', {
        class: 'viz-slot viz-embed step-host',
        dataset: { skipEmbed: '1', testid: 'viz', figure: fig.id, preset: fig.preset ?? '', stateKey: `${step.n}:${i}:${fig.id}` },
      }) as HTMLElement;
      if (fig.params) host.dataset.params = fig.params;
      hosts.push(host);
      figScroll.append(host);
      fig.slot.remove();
    });
    const nav = h('div', { class: 'pics-nav', hidden: true, 'aria-label': 'Pictures', dataset: { testid: 'pics-nav' } });
    figScroll.append(nav);
    const howBody = h('div', { class: 'step-how-body' });
    const howBox = h('details', { class: 'step-how', dataset: { testid: 'how-to-read' } },
      h('summary', null, 'How to read this'),
      howBody);
    figScroll.append(howBox);
    figCol.append(figScroll);
    figCol.append(h('div', { class: 'more-plots', hidden: true, dataset: { testid: 'more-plots' } }, 'more plots ↓'));
    const sheetBody = h('div', { class: 'step-sheet-body', dataset: { testid: 'step-controls-body' } });
    const sheet = h('div', {
      class: 'step-sheet', hidden: true,
      dataset: { testid: 'step-controls-sheet' }, role: 'dialog', 'aria-label': 'Controls',
    },
      h('div', { class: 'step-sheet-head' },
        h('strong', null, 'Controls'),
        h('button', { type: 'button', class: 'tbtn step-sheet-close', dataset: { testid: 'step-controls-close' }, 'aria-label': 'Close controls' }, '✕'),
      ),
      sheetBody,
    );
    const backdrop = h('div', { class: 'step-sheet-backdrop', hidden: true, dataset: { testid: 'step-controls-backdrop' } });

    const setSheet = (open: boolean) => {
      sheet.hidden = !open;
      backdrop.hidden = !open;
      openCtl.setAttribute('aria-expanded', String(open));
    };
    openSheets.set(step, setSheet);
    openCtl.addEventListener('click', (e) => { e.stopPropagation(); setSheet(sheet.hidden); });
    sheet.querySelector('.step-sheet-close')?.addEventListener('click', () => setSheet(false));
    backdrop.addEventListener('click', () => setSheet(false));

    const card = h('article', {
      class: 'step-card',
      id: `step-card-${step.n}`,
      dataset: {
        testid: 'step-card',
        step: String(step.n),
        figure: step.figs.map((f) => f.id).join(','),
        preset: step.figs.map((f) => f.preset ?? '').join(','),
      },
    },
      h('header', { class: 'step-card-head' },
        h('h3', null, `${step.n}. ${title}`),
        h('span', { class: 'step-ind', dataset: { testid: 'step-ind' } }, `Step ${step.n} of ${total}`),
      ),
    );
    const body = h('div', { class: 'step-card-body' }, textCol, figCol, sheet, backdrop);
    card.append(body);
    const more = figCol.querySelector('.more-plots') as HTMLElement | null;
    more?.addEventListener('click', () => {
      figScroll.scrollBy({ top: Math.max(80, figScroll.clientHeight * 0.6), behavior: 'smooth' });
    });
    figScroll.addEventListener('scroll', () => paintMorePlots(card), { passive: true });
    step.el = card;
  }

  for (const node of leftovers) {
    if (node.matches('.viz-slot[data-figure], .pop-figs')) node.remove();
    else cardsWrap.append(node);
  }
  for (const s of steps) cardsWrap.append(s.el);
  for (const s of steps) s.ol.remove();
  marker.replaceWith(cardsWrap);

  opts.frame?.classList.add('has-step-cards');
  document.documentElement.classList.add('has-step-cards');
  setChromeVar();

  let io: IntersectionObserver | null = null;
  const startIo = () => {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const step = steps.find((s) => s.el === e.target);
        if (!step) continue;
        if (e.isIntersecting) intersecting.add(step); else intersecting.delete(step);
      }
      syncMounts();
    }, { root: null, rootMargin: '100% 0px 100% 0px', threshold: 0 });
    for (const s of steps) io.observe(s.el);
  };

  const onResize = () => {
    setChromeVar();
    for (const s of alive.keys()) placeControls(s, s.el);
    for (const s of steps) paintMorePlots(s.el);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    for (const s of steps) openSheets.get(s)?.(false);
  };

  const stopSettle = attachCardSettle();
  requestAnimationFrame(() => { setChromeVar(); startIo(); syncMounts(); });
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKey);

  return () => {
    io?.disconnect();
    stopSettle();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('step-jumping');
    for (const s of [...alive.keys()]) unmount(s);
    opts.frame?.classList.remove('has-step-cards');
    document.documentElement.classList.remove('has-step-cards');
    document.documentElement.style.removeProperty('--tab-chrome');
  };
}
