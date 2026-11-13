import { h, clear } from './dom';
import { initTheme, toggleTheme, currentTheme } from './theme';
import { storeGet, storeSet } from './store';
import type { AppContent, FigureDef } from './types';
import { Progress } from './progress';
import { mountConceptMap, newMapState, type MapState } from './conceptmap';
import { mountQuiz } from './quiz';
import { ControlSet } from './controls';

export interface BoardHandle { destroy?(): void; show?(params: URLSearchParams): void; hide?(): void }
export interface AppHooks {
  /** Mount a live figure for figures.yaml entry `def`. Return a cleanup. */
  figures?: Record<string, (host: HTMLElement, def: FigureDef, controls: ControlSet) => (() => void) | void>;
  /** Mount the app's single custom board view lazily (kept alive while hidden). */
  board?: (host: HTMLElement, params: URLSearchParams) => BoardHandle;
}

interface Route { path: string[]; q: URLSearchParams }
function parseHash(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, qs] = raw.split('?');
  return { path: p.split('/').filter(Boolean), q: new URLSearchParams(qs ?? '') };
}
const go = (hash: string) => { location.hash = hash; };

export function mountApp(content: AppContent, hooks: AppHooks = {}): void {
  initTheme();
  const subj = content.subject;
  document.title = subj.title;
  const root = document.getElementById('app')!;
  const progress = new Progress(subj.id, content.quiz, content.maps);
  const mapState: MapState = newMapState(content);

  // ---------- chrome ----------
  const sidebar = h('nav', { class: 'sidebar ui', 'aria-label': 'Sections', dataset: { testid: 'sidebar' } });
  const main = h('main', { class: 'content', id: 'main' });
  const boardHost = h('div', { dataset: { testid: 'board-host' }, hidden: true });
  const frame = h('div', { class: 'frame' }, sidebar, h('div', null, main, boardHost));
  const glossary = h('aside', { class: 'drawer', hidden: true, 'aria-label': 'Variables and glossary', dataset: { testid: 'glossary' } });
  let sbOpen = storeGet<boolean>('study-tools:sidebar', window.innerWidth > 900);
  // The board route is wide, so it starts with the sidebar tucked away (the ☰ button still opens it).
  let onBoard = false, boardSb = false;
  const applySb = () => { const open = onBoard ? boardSb : sbOpen; sidebar.hidden = !open; frame.classList.toggle('nosb', !open); if (!onBoard) storeSet('study-tools:sidebar', sbOpen); };
  const hub = '../index.html';
  const topbar = h('header', { class: 'topbar ui' }, h('div', { class: 'in' },
    h('button', { class: 'tbtn', 'aria-label': 'Toggle sidebar', title: 'Toggle sidebar', dataset: { testid: 'sidebar-toggle' }, onclick: () => { if (onBoard) boardSb = !boardSb; else sbOpen = !sbOpen; applySb(); } }, '☰'),
    h('span', { class: 'ttl' }, subj.title),
    h('span', { class: 'q' }, subj.centralQuestion),
    content.glossary.length ? h('button', { class: 'tbtn', dataset: { testid: 'glossary-btn' }, onclick: () => { glossary.hidden = !glossary.hidden; } }, 'Variables') : null,
    h('a', { class: 'tbtn', href: hub, title: 'All study pages' }, 'Hub'),
    h('button', { class: 'tbtn', dataset: { testid: 'theme-toggle' }, 'aria-label': 'Toggle light/dark theme', onclick: () => { toggleTheme(); themeBtn.textContent = currentTheme() === 'dark' ? '☾' : '☀'; } }, '☾')));
  const themeBtn = topbar.querySelector('[data-testid=theme-toggle]') as HTMLButtonElement;
  themeBtn.textContent = currentTheme() === 'dark' ? '☾' : '☀';
  root.append(topbar, frame, glossary);
  applySb();
  if (window.innerWidth <= 900) { sbOpen = false; applySb(); }

  // glossary drawer
  {
    const dl = h('dl');
    const render = (q: string) => {
      clear(dl);
      for (const t of content.glossary.filter((x) => !q || (x.term + x.meaning).toLowerCase().includes(q.toLowerCase())))
        dl.append(h('dt', null, t.term), h('dd', { html: t.meaning + (t.units ? ` <i>[${t.units}]</i>` : '') }));
    };
    const inp = h('input', { type: 'search', placeholder: 'Search symbols and terms', 'aria-label': 'Search glossary' });
    inp.addEventListener('input', () => render(inp.value));
    render('');
    glossary.append(h('div', { style: 'display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem' }, h('b', null, 'Variables & terms'), h('span', { style: 'flex:1' }), h('button', { class: 'tbtn', onclick: () => { glossary.hidden = true; } }, '✕')), inp, dl);
  }

  // ---------- views ----------
  let cleanup: (() => void) | null = null;
  let boardHandle: BoardHandle | null = null;
  const navMap = {
    openDive: (id: string) => go(`/dive/${id}?from=${encodeURIComponent(`${mapState.mapId}/${mapState.pick?.kind === 'node' ? mapState.pick.id : ''}`)}`),
    openLive: (live: string) => {
      const [kind, rest] = live.split(':');
      go(kind === 'figure' ? `/figure/${rest}` : `/board?pair=${rest.replace('?', '&')}`);
    },
    openQuiz: (tags: string[], title: string) => go(`/quiz?tags=${encodeURIComponent(tags.join(','))}&title=${encodeURIComponent(title)}`),
  };

  function crumbs(...items: (string | [string, string])[]) {
    const c = h('div', { class: 'crumbs ui', dataset: { testid: 'crumbs' } }, h('a', { href: '#/', dataset: { testid: 'back-to-map' } }, '← Map'));
    for (const it of items) { c.append('›'); c.append(typeof it === 'string' ? h('span', null, it) : h('a', { href: it[1] }, it[0])); }
    return c;
  }

  function renderSidebar(active: string) {
    clear(sidebar);
    const link = (href: string, text: string, on: boolean) => h('a', { href, class: on ? 'on' : '' }, text);
    for (const sec of subj.sections) {
      const href = sec.kind === 'map' ? '#/' : sec.kind === 'quiz' ? '#/quiz' : sec.kind === 'board' ? '#/board' : `#/s/${sec.id}`;
      sidebar.append(link(href, sec.title, active === (sec.kind === 'map' ? 'map' : sec.kind === 'quiz' ? 'quiz' : sec.kind === 'board' ? 'board' : sec.id)));
    }
    if (content.dives.length) {
      sidebar.append(h('h6', null, 'Deep dives'));
      for (const d of content.dives) sidebar.append(link(`#/dive/${d.id}`, d.title, active === `dive:${d.id}`));
    }
    const sm = progress.summary();
    const done = sm.seen + sm.correct + sm.missed;
    sidebar.append(h('h6', null, 'Review progress'), h('div', { class: 'bar' }, h('i', { style: `width:${(done / sm.total) * 100}%` })), h('div', { style: 'padding:0 .5rem;color:var(--muted)' }, `${done} / ${sm.total} boxes seen`));
  }

  function showMain() { if (onBoard) { onBoard = false; applySb(); } main.hidden = false; boardHost.hidden = true; boardHandle?.hide?.(); }

  function route() {
    cleanup?.(); cleanup = null; clear(main);
    const { path, q } = parseHash();
    const [a, b] = path;
    window.scrollTo(0, 0);
    if (a === 'board' && hooks.board) {
      main.hidden = true; boardHost.hidden = false;
      if (!onBoard) { onBoard = true; boardSb = false; applySb(); }
      if (!boardHandle) boardHandle = hooks.board(boardHost, q);
      boardHandle.show?.(q);
      renderSidebar('board');
      return;
    }
    showMain();
    if (!a || a === 'map') {
      renderSidebar('map');
      cleanup = mountConceptMap(main, content, progress, mapState, navMap);
    } else if (a === 'dive' && b) {
      renderSidebar(`dive:${b}`);
      renderDive(b, q.get('from'));
    } else if (a === 'quiz') {
      renderSidebar('quiz');
      const tags = (q.get('tags') ?? '').split(',').filter(Boolean);
      main.append(crumbs('Self-check'));
      cleanup = mountQuiz(main, content, progress, { tags, title: q.get('title') ?? 'Self-check', openDive: (id) => go(`/dive/${id}`), back: () => history.length > 1 ? history.back() : go('/') });
    } else if (a === 'figure' && b) {
      renderSidebar('figures');
      renderFigure(b, q);
    } else if (a === 's' && b) {
      renderSidebar(b);
      renderSection(b);
    } else go('/');
  }

  function renderSection(id: string) {
    const sec = subj.sections.find((x) => x.id === id);
    if (!sec) return go('/');
    main.append(crumbs(sec.title));
    if (sec.kind === 'md') main.append(h('article', { class: 'prose', html: sec.html }));
    else if (sec.kind === 'dives') {
      const wrap = h('div', { class: 'prose' });
      const cats = content.subject.categories ?? [{ id: '', label: 'All' }];
      let cat = cats[0].id;
      const chips = h('div', { class: 'chips' });
      const list = h('div', { class: 'pair2' });
      const draw = () => {
        clear(chips); clear(list);
        for (const c of cats) chips.append(h('button', { class: `chip${c.id === cat ? ' on' : ''}`, onclick: () => { cat = c.id; draw(); } }, c.label));
        for (const d of content.dives.filter((x) => !cat || x.category === cat))
          list.append(h('a', { class: 'callout', href: `#/dive/${d.id}`, style: 'text-decoration:none;color:inherit;display:block', dataset: { testid: 'dive-card' } }, h('b', { class: 'lead' }, d.title), h('span', { class: 'ui', style: 'font-size:.85rem' }, d.chain[d.chain.length - 1].title)));
      };
      draw();
      wrap.append(h('p', null, 'Every deep dive opens with the chain of questions that leads there. You can also reach them from any map box.'), chips, list);
      main.append(wrap);
    } else if (sec.kind === 'glossary') {
      const dl = h('dl', { class: 'prose' });
      for (const t of content.glossary) dl.append(h('dt', { style: 'font-weight:700;margin-top:.6rem' }, t.term), h('dd', { html: t.meaning + (t.units ? ` <i>[${t.units}]</i>` : '') }));
      main.append(dl);
    } else if (sec.kind === 'figures') {
      const wrap = h('div', { class: 'prose' }, h('p', null, 'Live figures. Each is also reachable from a map box.'));
      for (const f of content.figures) wrap.append(h('p', null, h('a', { class: 'tbtn on', href: `#/figure/${f.id}` }, f.title)));
      main.append(wrap);
    }
  }

  function renderDive(id: string, from: string | null) {
    const d = content.dives.find((x) => x.id === id);
    if (!d) return go('/');
    if (from) { const [mid, nid] = from.split('/'); if (nid) progress.markSeen(mid, nid); }
    const catLabel = content.subject.categories?.find((c) => c.id === d.category)?.label;
    main.append(crumbs(['Deep dives', '#/s/dives'], catLabel ?? '', d.title));
    const art = h('article', { class: 'prose', dataset: { testid: 'dive' } }, h('h2', null, d.title));
    art.append(h('details', { class: 'fold', open: true }, h('summary', null, 'Where are we? The chain of questions that leads here'),
      h('ol', { class: 'chain' }, ...d.chain.map((s) => h('li', null, s.title, s.detail ? h('small', null, s.detail) : null)))));
    art.append(h('div', { html: d.html }));
    if (d.matlab) art.append(h('details', { class: 'fold' }, h('summary', null, 'MATLAB'), h('div', null, h('pre', null, h('code', null, d.matlab)))));
    if (d.neighbors.length) art.append(h('div', null, h('b', { class: 'ui' }, 'Neighbors'), h('div', { class: 'chips' }, ...d.neighbors.map((n) => h('a', { class: 'chip', href: `#/dive/${n}` }, content.dives.find((x) => x.id === n)?.title ?? n)))));
    const qs = progress.questionsFor([d.id]);
    art.append(h('div', { class: 'chips' },
      h('a', { class: 'tbtn on', href: '#/' }, '← Back to the map'),
      qs.length ? h('a', { class: 'tbtn', dataset: { testid: 'quiz-me' }, href: `#/quiz?tags=${encodeURIComponent(d.id)}&title=${encodeURIComponent(d.title)}` }, `Quiz me (${qs.length})`) : null));
    main.append(art);
  }

  function renderFigure(id: string, q: URLSearchParams) {
    const def = content.figures.find((f) => f.id === id);
    const mounter = hooks.figures?.[id];
    if (!def || !mounter) return go('/');
    main.append(crumbs(['Live figures', '#/s/figures'], def.title));
    const controls = new ControlSet(def.controls, def.presets);
    const stop = mounter(main, def, controls);
    if (q.toString()) controls.restore(q.toString());
    // keep the URL in sync so a setup is shareable
    controls.onChange(() => { const s = controls.serialize(); history.replaceState(null, '', `#/figure/${id}${s ? `?${s}` : ''}`); });
    cleanup = typeof stop === 'function' ? stop : null;
    if (def.presets.length) main.append(h('div', { class: 'prose' }, ...def.presets.filter((p) => p.about).map((p) => h('details', { class: 'fold' }, h('summary', null, `About: ${p.label}`), h('div', { html: `<p>${p.about}</p>` })))));
  }

  window.addEventListener('hashchange', route);
  progress.onChange(() => { /* sidebar bar refresh */ const act = sidebar.querySelector('a.on'); if (!act) return; const sm = progress.summary(); const bar = sidebar.querySelector('.bar i') as HTMLElement | null; if (bar) bar.style.width = `${((sm.seen + sm.correct + sm.missed) / sm.total) * 100}%`; });
  route();
  (window as any).__study = { content, progress, mapState };
}
