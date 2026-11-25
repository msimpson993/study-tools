import { h, clear } from './dom';
import { initTheme, toggleTheme, currentTheme } from './theme';
import type { AppContent, TabPage } from './types';
import type { AppHooks } from './app';
import { Progress } from './progress';
import { mountQuiz } from './quiz';
import { createFullscreen, replaceUrl } from './fullscreen';
import { setRefContent } from './copyref';
import { embedFigureSlots } from './embed';
import { applyCardLayout, layoutSetupSection, lockStepJump } from './cardlayout';

/** Short labels for the top tab bar (full titles stay as the page heading). */
export const TAB_BAR_LABEL: Record<string, string> = {
  overview: 'Overview',
  motor: 'Motor',
  borer: 'Boring machine',
  disk: 'Disk head',
  engine: 'Engine',
};

interface Route { path: string[]; q: URLSearchParams }
function parseHash(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, qs] = raw.split('?');
  return { path: p.split('/').filter(Boolean), q: new URLSearchParams(qs ?? '') };
}

export function mountTabbedApp(content: AppContent, hooks: AppHooks = {}): void {
  const tabs = [...(content.tabs ?? [])].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (!tabs.length) return;
  setRefContent(content);
  initTheme();
  const subj = content.subject;
  document.title = subj.title;
  const root = document.getElementById('app')!;
  clear(root);
  const progress = new Progress(subj.id, content.quiz, content.maps);
  let cleanup: (() => void) | null = null;
  let lastTab = tabs[0].id;

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

  const practice = (content.review ?? []).find((r) => r.id === 'practice') ?? (content.review ?? [])[0];
  const menu = h('details', { class: 'app-menu', dataset: { testid: 'app-menu' } },
    h('summary', { class: 'tbtn' }, 'Menu'),
    h('div', { class: 'app-menu-list', role: 'menu' },
      h('a', { href: '#/quiz', role: 'menuitem', dataset: { testid: 'menu-quiz' } }, 'Quiz'),
      h('a', { href: '#/glossary', role: 'menuitem', dataset: { testid: 'menu-glossary' } }, 'Glossary'),
      practice ? h('a', { href: `#/review/${practice.id}`, role: 'menuitem', dataset: { testid: 'menu-practice' } }, 'Practice') : null,
    ));
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { menu.open = false; }));

  const themeBtn = h('button', { class: 'tbtn', dataset: { testid: 'theme-toggle' }, 'aria-label': 'Toggle light/dark theme', onclick: () => { toggleTheme(); themeBtn.textContent = currentTheme() === 'dark' ? '☾' : '☀'; } }, currentTheme() === 'dark' ? '☾' : '☀');
  const topbar = h('header', { class: 'topbar ui' }, h('div', { class: 'in' },
    h('span', { class: 'ttl' }, subj.title),
    h('span', { class: 'q' }, subj.centralQuestion),
    menu,
    h('a', { class: 'tbtn', href: '../index.html', title: 'All study pages' }, 'Hub'),
    fsBtn,
    themeBtn,
  ));

  const tabBar = h('nav', { class: 'tab-bar', 'aria-label': 'Problems', dataset: { testid: 'tab-bar' } });
  const scrollTabs = (dir: number) => {
    const step = Math.max(96, Math.round(tabBar.clientWidth * 0.75));
    tabBar.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  const prevBtn = h('button', { type: 'button', class: 'tab-bar-chevron start', 'aria-label': 'Earlier tabs', title: 'Earlier tabs', dataset: { testid: 'tab-bar-prev' }, onclick: () => scrollTabs(-1) }, '‹');
  const nextBtn = h('button', { type: 'button', class: 'tab-bar-chevron end', 'aria-label': 'More tabs', title: 'More tabs', dataset: { testid: 'tab-bar-next' }, onclick: () => scrollTabs(1) }, '›');
  const tabWrap = h('div', { class: 'tab-bar-wrap' }, prevBtn, tabBar, nextBtn);
  const updateOverflow = () => {
    const overflows = tabBar.scrollWidth > tabBar.clientWidth + 1;
    const atStart = tabBar.scrollLeft <= 1;
    const atEnd = tabBar.scrollLeft + tabBar.clientWidth >= tabBar.scrollWidth - 1;
    tabWrap.classList.toggle('overflows', overflows);
    tabWrap.classList.toggle('can-start', overflows && !atStart);
    tabWrap.classList.toggle('can-more', overflows && !atEnd);
    prevBtn.hidden = !overflows;
    nextBtn.hidden = !overflows;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
  };
  tabBar.addEventListener('scroll', updateOverflow, { passive: true });
  window.addEventListener('resize', updateOverflow);
  const main = h('main', { class: 'content tab-content', id: 'main' });
  const frame = h('div', { class: 'frame nosb tabbed' }, main);
  root.append(topbar, tabWrap, frame);
  document.documentElement.classList.add('layout-tabs');
  document.documentElement.dataset.simProject = '1';

  function paintTabs(active?: string) {
    clear(tabBar);
    for (const t of tabs) {
      const on = t.id === active;
      tabBar.append(h('a', {
        href: `#/tab/${t.id}`,
        class: on ? 'on' : '',
        role: 'tab',
        'aria-selected': on ? 'true' : 'false',
        dataset: { testid: 'tab', tab: t.id },
      }, TAB_BAR_LABEL[t.id] ?? t.title));
    }
    requestAnimationFrame(() => {
      const on = tabBar.querySelector('a.on') as HTMLElement | null;
      const narrow = window.matchMedia('(max-width: 699.98px)').matches;
      on?.scrollIntoView({ inline: narrow ? 'center' : 'nearest', block: 'nearest' });
      updateOverflow();
    });
  }

  function renderTab(tab: TabPage) {
    lastTab = tab.id;
    const toc = tab.sections.length
      ? h('nav', { class: 'tab-toc', 'aria-label': 'On this tab', dataset: { testid: 'tab-toc' } },
          h('b', null, 'Contents'),
          ...tab.sections.map((s) => h('a', { href: `#/tab/${tab.id}`, dataset: { jump: s.id }, onclick: (e: Event) => { e.preventDefault(); lockStepJump(); document.getElementById(s.id)?.scrollIntoView({ block: 'start' }); } }, s.title)))
      : null;
    const art = h('article', { class: 'prose tab-article', dataset: { testid: 'tab-page', tab: tab.id } },
      h('h1', null, tab.title),
      tab.summary ? h('p', { class: 'tab-summary', html: tab.summary }) : null,
      toc,
      h('div', { class: 'tab-body', html: tab.html }),
    );
    main.append(art);
    layoutSetupSection(art);
    const cardStop = applyCardLayout(art, content, hooks, { frame });
    const stops = embedFigureSlots(art, content, hooks, { wrapPairs: true });
    cleanup = () => { cardStop(); stops.forEach((s) => s()); };
  }

  function renderGlossary() {
    const dl = h('dl', { class: 'prose gloss-page', dataset: { testid: 'glossary-page' } });
    let last: string | undefined;
    for (const t of content.glossary) {
      if (t.section && t.section !== last) dl.append(h('h3', null, t.section));
      last = t.section;
      dl.append(h('dt', { style: 'font-weight:700;margin-top:.6rem' }, t.term), h('dd', { html: t.meaning + (t.units ? ` <i>[${t.units}]</i>` : '') }));
    }
    main.append(h('article', { class: 'prose', dataset: { testid: 'glossary-view' } }, h('h1', null, 'Glossary'), dl));
  }

  function renderReview(id?: string) {
    const pages = content.review ?? [];
    const r = id ? pages.find((x) => x.id === id) : pages[0];
    if (!r) { main.append(h('p', null, 'No practice page.')); return; }
    const art = h('article', { class: 'prose review-page', dataset: { testid: 'review-page' } },
      h('h1', null, r.title),
      r.covers ? h('p', { class: 'ui', style: 'color:var(--muted);margin-top:0' }, r.covers) : null,
      h('div', { html: r.html }),
    );
    main.append(art);
    const stops = embedFigureSlots(art, content, hooks, { wrapPairs: true });
    cleanup = () => { stops.forEach((s) => s()); };
  }

  function route() {
    menu.open = false;
    cleanup?.(); cleanup = null; clear(main);
    const { path, q } = parseHash();
    const [a, b] = path;
    if (!a || a === 'tab' || a === 'map') {
      const id = (a === 'tab' && b) ? b : tabs[0].id;
      const tab = tabs.find((t) => t.id === id) ?? tabs[0];
      if (!a || a === 'map' || (a === 'tab' && !b) || tab.id !== id) { replaceUrl(`#/tab/${tab.id}`); }
      paintTabs(tab.id);
      window.scrollTo(0, 0);
      renderTab(tab);
      return;
    }
    paintTabs(undefined);
    window.scrollTo(0, 0);
    if (a === 'quiz') {
      const tags = (q.get('tags') ?? '').split(',').filter(Boolean);
      cleanup = mountQuiz(main, content, progress, {
        figures: hooks.quizFigures, tags, title: q.get('title') ?? 'Self-check',
        back: () => { location.hash = `#/tab/${lastTab}`; },
      });
    } else if (a === 'glossary') {
      renderGlossary();
    } else if (a === 'review' || a === 'practice') {
      renderReview(a === 'practice' ? 'practice' : b);
    } else {
      replaceUrl(`#/tab/${tabs[0].id}`);
    }
  }

  window.addEventListener('hashchange', route);
  if (!location.hash || location.hash === '#' || location.hash === '#/') replaceUrl(`#/tab/${tabs[0].id}`);
  route();
  (window as unknown as { __study: unknown }).__study = { content, progress, tabs: true };
}
