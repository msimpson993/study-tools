import { h, clear } from './dom';
import { scrollHints } from './scrollhint';
import { initTheme, toggleTheme, currentTheme } from './theme';
import { storeGet, storeSet } from './store';
import type { AppContent, FigureDef } from './types';
import { Progress } from './progress';
import { mountScene } from './scene';
import { mountConceptMap, newMapState, type MapState } from './conceptmap';
import { miniCheck } from './minicheck';
import { mountQuiz } from './quiz';
import { mountQuizFigure, type QuizFigureRegistry } from './quizfig';
import type { PopAudioHook } from './conceptmap';
import { ControlSet } from './controls';
import { createFullscreen, replaceUrl } from './fullscreen';
import { setRefContent, pickFromHash, mapHashFor, isMapHash, copyRefButton, diveReference } from './copyref';

export interface BoardHandle { destroy?(): void; show?(params: URLSearchParams): void; hide?(): void }
export interface AppHooks {
  /** Mount a live figure for figures.yaml entry `def`. Return a cleanup. */
  figures?: Record<string, (host: HTMLElement, def: FigureDef, controls: ControlSet) => (() => void) | void>;
  /** Renderers for quiz questions with a `figure:` (id → def); see quizfig.ts. */
  quizFigures?: QuizFigureRegistry;
  /** Opt-in sound examples for map pop-ups: the app imports `audioHook(registry)` from '@study/core/audio' (so apps without sound never bundle it). */
  audio?: PopAudioHook;
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
  setRefContent(content);
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
  // full-screen toggle (hidden where the browser has no element full screen, e.g. iPhone Safari)
  const fs = createFullscreen();
  const FS_ICON_IN = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M1.5 6V1.5H6M10 1.5h4.5V6M14.5 10v4.5H10M6 14.5H1.5V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const FS_ICON_OUT = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 1.5V6H1.5M14.5 6H10V1.5M10 14.5V10h4.5M1.5 10H6v4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const fsBtn = h('button', { class: 'tbtn icon', type: 'button', dataset: { testid: 'fullscreen-toggle' }, 'aria-pressed': 'false', 'aria-label': 'Enter full screen', title: 'Full screen (swipe back to leave)', hidden: !fs.supported, onclick: () => { void fs.toggle(); } });
  const paintFs = (full: boolean) => {
    fsBtn.innerHTML = full ? FS_ICON_OUT : FS_ICON_IN;
    fsBtn.classList.toggle('on', full);
    fsBtn.setAttribute('aria-pressed', String(full));
    fsBtn.setAttribute('aria-label', full ? 'Exit full screen' : 'Enter full screen');
    fsBtn.title = full ? 'Exit full screen (or swipe back)' : 'Full screen (swipe back to leave)';
  };
  paintFs(fs.isFull());
  fs.onChange(paintFs);
  const topbar = h('header', { class: 'topbar ui' }, h('div', { class: 'in' },
    h('button', { class: 'tbtn', 'aria-label': 'Toggle sidebar', title: 'Toggle sidebar', dataset: { testid: 'sidebar-toggle' }, onclick: () => { if (onBoard) boardSb = !boardSb; else sbOpen = !sbOpen; applySb(); } }, '☰'),
    h('span', { class: 'ttl' }, subj.title),
    h('span', { class: 'q' }, subj.centralQuestion),
    content.glossary.length ? h('button', { class: 'tbtn', dataset: { testid: 'glossary-btn' }, onclick: () => { glossary.hidden = !glossary.hidden; if (!glossary.hidden) glossaryToTopic(); } }, 'Variables') : null,
    h('a', { class: 'tbtn', href: hub, title: 'All study pages' }, 'Hub'),
    fsBtn,
    h('button', { class: 'tbtn', dataset: { testid: 'theme-toggle' }, 'aria-label': 'Toggle light/dark theme', onclick: () => { toggleTheme(); themeBtn.textContent = currentTheme() === 'dark' ? '☾' : '☀'; } }, '☾')));
  const themeBtn = topbar.querySelector('[data-testid=theme-toggle]') as HTMLButtonElement;
  themeBtn.textContent = currentTheme() === 'dark' ? '☾' : '☀';
  root.append(topbar, frame, glossary);
  applySb();
  if (window.innerWidth <= 900) { sbOpen = false; applySb(); }

  // glossary drawer
  let glossaryToTopic = () => {};
  {
    const dl = h('dl');
    const render = (q: string) => {
      clear(dl);
      let last: string | undefined;
      for (const t of content.glossary.filter((x) => !q || (x.term + x.meaning + (x.section ?? '')).toLowerCase().includes(q.toLowerCase()))) {
        // a heading each time the section changes (terms stay in file order)
        if (t.section && t.section !== last) dl.append(h('div', { class: 'gloss-sec', role: 'heading', 'aria-level': '3' }, t.section));
        last = t.section;
        dl.append(h('dt', null, t.term), h('dd', { html: t.meaning + (t.units ? ` <i>[${t.units}]</i>` : '') }));
      }
    };
    const inp = h('input', { type: 'search', placeholder: 'Search symbols and terms', 'aria-label': 'Search glossary' });
    // on open, scroll to the section whose terms the current page (the open map box's panel, else the main view) uses most
    glossaryToTopic = () => {
      if (inp.value) return;
      const panel = document.querySelector<HTMLElement>('.cm-panel:not(.idle)');
      const page = ((panel?.innerText || '') + ' ' + (panel ? '' : main.innerText)).toLowerCase();
      const score = new Map<string, number>();
      for (const t of content.glossary) {
        if (!t.section) continue;
        const names = t.term.split(/,\s*|\s+or\s+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 3);
        let n = 0;
        for (const nm of names) { let i = page.indexOf(nm); while (i >= 0 && n < 50) { n++; i = page.indexOf(nm, i + nm.length); } }
        score.set(t.section, (score.get(t.section) ?? 0) + Math.min(n, 6));
      }
      let best = '', bs = 0;
      for (const [k, v] of score) if (v > bs) { best = k; bs = v; }
      const head = [...dl.querySelectorAll<HTMLElement>('.gloss-sec')].find((e) => e.textContent === best);
      glossary.dataset.topic = head ? best : '';
      glossary.scrollTop = head ? Math.max(0, head.offsetTop - 8) : 0;
    };
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
    figures: hooks.quizFigures,
    audio: hooks.audio,
    onState: () => {
      if (!isMapHash(location.hash || '#/')) return;
      const want = mapHashFor(mapState.pick);
      const cur = location.hash || '#/';
      if (cur !== want && cur !== want.replace(/^#/, '')) replaceUrl(want);
    },
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
      const key = sec.kind === 'map' ? 'map' : sec.kind === 'quiz' ? 'quiz' : sec.kind === 'board' ? 'board' : sec.kind === 'review' ? 'review' : sec.id;
      const href = sec.kind === 'map' ? '#/' : sec.kind === 'quiz' ? '#/quiz' : sec.kind === 'board' ? '#/board' : sec.kind === 'review' ? '#/review' : `#/s/${sec.id}`;
      sidebar.append(link(href, sec.title, active === key));
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
    if (!a || a === 'map' || a === 'node' || a === 'edge') {
      // #/node/<id> and #/edge/<from>__<to> select that box/line. Bare #/ keeps the in-memory pick so
      // Explore → quiz → back to the map restores the panel (mapState lives across routes).
      const picked = (a === 'node' || a === 'edge') ? pickFromHash(content, path) : null;
      if (picked) { mapState.mapId = picked.mapId; mapState.pick = picked.pick; }
      renderSidebar('map');
      cleanup = mountConceptMap(main, content, progress, mapState, navMap);
    } else if (a === 'dive' && b) {
      renderSidebar(`dive:${b}`);
      renderDive(b, q.get('from'));
    } else if (a === 'quiz') {
      renderSidebar('quiz');
      const tags = (q.get('tags') ?? '').split(',').filter(Boolean);
      main.append(crumbs('Self-check'));
      cleanup = mountQuiz(main, content, progress, { figures: hooks.quizFigures, tags, title: q.get('title') ?? 'Self-check', openDive: (id) => go(`/dive/${id}`), back: () => history.length > 1 ? history.back() : go('/') });
    } else if (a === 'review') {
      renderSidebar('review');
      if (b) renderReview(b); else renderReviewList();
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
          list.append(h('a', { class: 'callout', href: `#/dive/${d.id}`, style: 'text-decoration:none;color:inherit;display:block', dataset: { testid: 'dive-card' } }, h('b', { class: 'lead' }, d.title), h('span', { class: 'ui', style: 'font-size:.85rem' }, d.chain.length ? d.chain[d.chain.length - 1].title : (content.maps.flatMap((m) => m.nodes).find((n) => n.dive === d.id)?.detail ?? ''))));
      };
      draw();
      wrap.append(h('p', null, 'Every deep dive opens with the chain of questions that leads there. You can also reach them from any map box.'), chips, list);
      main.append(wrap);
    } else if (sec.kind === 'glossary') {
      const dl = h('dl', { class: 'prose gloss-page', dataset: { testid: 'glossary-page' } });
      let last: string | undefined;
      for (const t of content.glossary) {
        if (t.section && t.section !== last) dl.append(h('h3', null, t.section));
        last = t.section;
        dl.append(h('dt', { style: 'font-weight:700;margin-top:.6rem' }, t.term), h('dd', { html: t.meaning + (t.units ? ` <i>[${t.units}]</i>` : '') }));
      }
      main.append(dl);
    } else if (sec.kind === 'figures') {
      // a figure counts as on the map when a box's live entry or a deep dive embeds it; the rest are listed apart, without claiming a map box reaches them
      const refs = JSON.stringify({ m: content.maps, d: content.dives }), onMap = (id: string) => refs.includes(`figure:${id}`) || refs.includes(`data-figure=\\"${id}\\"`);
      const on = content.figures.filter((f) => onMap(f.id)), extra = content.figures.filter((f) => !onMap(f.id));
      const link = (f: FigureDef) => h('p', null, h('a', { class: 'tbtn on fig-link', href: `#/figure/${f.id}` }, f.title));
      const wrap = h('div', { class: 'prose fig-list', dataset: { testid: 'figure-list' } }, h('p', null, extra.length ? 'Live figures. Each in this first list is also reachable from a map box.' : 'Live figures. Each is also reachable from a map box.'));
      for (const f of on) wrap.append(link(f));
      if (extra.length) {
        wrap.append(h('h3', { dataset: { testid: 'figure-extras' } }, 'Extra tools (not on the map)'), h('p', null, 'These open only from here.'));
        for (const f of extra) wrap.append(link(f));
      }
      main.append(wrap);
    }
  }


  /** The Review area: mini exams live here, outside the question map (which stays the landing view). */
  function renderReviewList() {
    const pages = content.review ?? [];
    main.append(crumbs('Review'));
    const wrap = h('div', { class: 'prose', dataset: { testid: 'review-list' } },
      h('h2', null, 'Review'),
      h('p', null, 'Exam preparation, kept apart from the map so the map stays a clean chain of ideas. Each mini exam has a topic checklist that links back to the map, a formula sheet, worked problems and a self-test.'));
    for (const r of pages) {
      const n = r.quizTag ? content.quiz.filter((q) => q.tags.includes(r.quizTag!)).length : 0;
      wrap.append(h('a', { class: 'callout', href: `#/review/${r.id}`, style: 'text-decoration:none;color:inherit;display:block', dataset: { testid: 'review-card' } },
        h('b', { class: 'lead' }, r.covers ?? 'Review'),
        h('b', null, r.title),
        h('div', { class: 'cb', html: `<p>${r.summary}</p>` }),
        h('span', { class: 'ui', style: 'font-size:.78rem;color:var(--muted)' }, n ? `${n}-question self-test` : '')));
    }
    main.append(wrap);
  }

  function renderReview(id: string) {
    const r = (content.review ?? []).find((x) => x.id === id);
    if (!r) return go('/review');
    main.append(crumbs(['Review', '#/review'], r.title));
    const n = r.quizTag ? content.quiz.filter((q) => q.tags.includes(r.quizTag!)).length : 0;
    const hasSheet = r.html.includes('formula-sheet');
    const art = h('article', { class: 'prose review-page', dataset: { testid: 'review-page' } },
      h('div', { class: 'dive-head' }, h('h2', null, r.title)),
      r.covers ? h('p', { class: 'ui', style: 'color:var(--muted);margin-top:0' }, r.covers) : null,
      h('div', { class: 'chips' },
        n ? h('a', { class: 'tbtn on', dataset: { testid: 'review-quiz' }, href: `#/quiz?tags=${encodeURIComponent(r.quizTag!)}&title=${encodeURIComponent(r.title)}` }, `Take the self-test (${n})`) : null,
        ...(r.quizSubsets ?? []).map((sub) => h('a', { class: 'tbtn', dataset: { testid: 'review-quiz-subset' }, href: `#/quiz?tags=${encodeURIComponent(sub.tag)}&title=${encodeURIComponent(`${r.title}: ${sub.label}`)}` }, `${sub.label} only (${content.quiz.filter((q) => q.tags.includes(sub.tag)).length})`)),
        hasSheet ? h('button', { class: 'tbtn', dataset: { testid: 'review-print' }, onclick: () => {
          document.body.dataset.print = 'sheet';
          const done = () => { delete document.body.dataset.print; window.removeEventListener('afterprint', done); };
          window.addEventListener('afterprint', done);
          window.print();
        } }, 'Print the formula sheet') : null));
    const body = h('div', { class: 'review-body', html: r.html });
    art.append(body);
    const stops = embedFigures(body);
    cleanup = () => stops.forEach((f) => f());
    art.append(h('div', { class: 'chips' }, h('a', { class: 'tbtn', href: '#/review' }, '← All reviews'), h('a', { class: 'tbtn', href: '#/' }, '← Back to the map')));
    main.append(art);
  }

  function renderDive(id: string, from: string | null) {
    const d = content.dives.find((x) => x.id === id);
    if (!d) return go('/');
    if (from) { const [mid, nid] = from.split('/'); if (nid) progress.markSeen(mid, nid); }
    const catLabel = content.subject.categories?.find((c) => c.id === d.category)?.label;
    main.append(crumbs(['Deep dives', '#/s/dives'], catLabel ?? '', d.title));
    const art = h('article', { class: 'prose', dataset: { testid: 'dive' } },
      h('div', { class: 'dive-head' }, h('h2', null, d.title), copyRefButton(() => diveReference(content, d))));
    const glance = d.level ? h('nav', { class: 'glance', dataset: { testid: 'at-a-glance' } }) : null;
    if (d.level) art.append(h('div', { class: 'level-tag', dataset: { testid: 'math-level' } }, h('span', null, 'Math level: '), h('b', null, d.level)), glance!);
    if (d.chain.length) art.append(h('details', { class: 'fold', open: true }, h('summary', null, 'Where are we? The chain of questions that leads here'),
      h('ol', { class: 'chain' }, ...d.chain.map((s) => h('li', null, s.title, s.detail ? h('small', null, s.detail) : null)))));
    let sceneStop: (() => void) | null = null;
    if (content.subject.runningExample && d.addsToExample) {
      const exId = d.exampleScene?.scene, exTitle = (exId && content.subject.runningExample.moreScenes?.find((m) => m.id === exId)?.title) || (!exId && content.subject.runningExample.moreScenes?.length ? content.subject.runningExample.scene?.title : undefined) || content.subject.runningExample.title;
      const callout = h('aside', { class: 'callout c-example', dataset: { testid: 'dive-example' } }, h('b', { class: 'lead' }, `Running example: ${exTitle}`),
        h('div', { class: 'cb', html: `<p><b>What this adds:</b> ${d.addsToExample}</p>${d.accountsFor ? `<p><b>What it lets us account for:</b> ${d.accountsFor}</p>` : ''}` }));
      const sc = content.subject.runningExample.scene;
      const row = h('div', { class: `ex-row${sc ? ' has-scene' : ''}`, dataset: { testid: 'dive-example-row' } }, callout);
      art.append(row);
      if (sc) { const id = d.exampleScene?.scene ?? sc.id, base = id === sc.id ? sc : content.subject.runningExample.moreScenes?.find((m) => m.id === id); sceneStop = mountScene(row, { scene: id, overlays: d.exampleScene?.overlays, caption: d.exampleScene?.caption, params: d.exampleScene?.params ?? base?.params, diagram: d.exampleScene?.diagram ?? base?.diagram }).destroy; }
    }
    const body = h('div', { html: d.html });
    art.append(body);
    if (d.check?.length) {
      const qs = d.check.map((id) => content.quiz.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
      art.append(h('section', { class: 'check-yourself', dataset: { testid: 'check-yourself' } }, h('h3', null, 'Check yourself'), ...qs.map((q) => miniCheck(q, progress))));
    }
    if (glance) {
      const heads = [...art.querySelectorAll<HTMLElement>(':scope > div > h3, :scope > section > h3')];
      const ol = h('ol', null);
      heads.forEach((hd, i) => {
        hd.id = `sec-${d.id}-${i + 1}`;
        ol.append(h('li', null, h('a', { href: '#', dataset: { target: hd.id }, onclick: (ev: Event) => { ev.preventDefault(); hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, hd.textContent ?? '')));
      });
      glance.append(h('b', { class: 'lead' }, 'At a glance'), ol);
    }
    const stops = embedFigures(body);
    const prevCleanup = cleanup;
    let hintStop: (() => void) | null = null;
    requestAnimationFrame(() => { if (body.isConnected) hintStop = scrollHints(body); });
    cleanup = () => { prevCleanup?.(); stops.forEach((f) => f()); sceneStop?.(); hintStop?.(); };
    if (d.matlab) art.append(h('details', { class: 'fold' }, h('summary', null, 'MATLAB'), h('div', null, h('pre', null, h('code', null, d.matlab)))));
    if (d.neighbors.length) art.append(h('div', null, h('b', { class: 'ui' }, 'Neighbors'), h('div', { class: 'chips' }, ...d.neighbors.map((n) => h('a', { class: 'chip', href: `#/dive/${n}` }, content.dives.find((x) => x.id === n)?.title ?? n)))));
    const qs = progress.questionsFor([d.id]);
    art.append(h('div', { class: 'chips' },
      h('a', { class: 'tbtn on', href: '#/' }, '← Back to the map'),
      qs.length ? h('a', { class: 'tbtn', dataset: { testid: 'quiz-me' }, href: `#/quiz?tags=${encodeURIComponent(d.id)}&title=${encodeURIComponent(d.title)}` }, `Quiz me (${qs.length})`) : null));
    main.append(art);
  }

  /** Mount every ```figure:<id>``` slot of a rendered dive/section (no URL sync; each gets its own ControlSet). */
  function embedFigures(root: HTMLElement): (() => void)[] {
    const stops: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>('.viz-slot[data-figure]').forEach((slot) => {
      const id = slot.dataset.figure!;
      const def = content.figures.find((f) => f.id === id);
      const mounter = hooks.figures?.[id];
      if (!def || !mounter) { slot.append(h('p', { class: 'st-hint' }, `(figure ${id} is not available)`)); return; }
      slot.classList.add('viz-embed');
      slot.dataset.testid = 'viz';
      const d = slot.dataset.look ? { ...def, lookFor: slot.dataset.look } : def; // a dive's own look-for for a reused figure
      const stop = mounter(slot, d, new ControlSet(def.controls, def.presets));
      if (typeof stop === 'function') stops.push(stop);
    });
    // ```picture:<id> caption``` slots: static captioned pictures drawn by the subject's quiz-figure renderers
    root.querySelectorAll<HTMLElement>('.pic-slot[data-pic]').forEach((slot) => {
      const m = mountQuizFigure({ id: slot.dataset.pic!, caption: slot.dataset.cap || undefined, alt: slot.dataset.alt || slot.dataset.pic! }, hooks.quizFigures);
      m.el.classList.add('dive-pic'); m.el.dataset.testid = 'dive-picture'; slot.append(m.el); stops.push(m.destroy);
    });
    return stops;
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
    controls.onChange(() => { const s = controls.serialize(); replaceUrl(`#/figure/${id}${s ? `?${s}` : ''}`); });
    cleanup = typeof stop === 'function' ? stop : null;
    if (def.presets.length) main.append(h('div', { class: 'prose' }, ...def.presets.filter((p) => p.about).map((p) => h('details', { class: 'fold' }, h('summary', null, `About: ${p.label}`), h('div', { html: `<p>${p.about}</p>` })))));
  }

  window.addEventListener('hashchange', route);
  progress.onChange(() => { /* sidebar bar refresh */ const act = sidebar.querySelector('a.on'); if (!act) return; const sm = progress.summary(); const bar = sidebar.querySelector('.bar i') as HTMLElement | null; if (bar) bar.style.width = `${((sm.seen + sm.correct + sm.missed) / sm.total) * 100}%`; });
  route();
  (window as any).__study = { content, progress, mapState };
}
