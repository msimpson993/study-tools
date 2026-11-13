/* Board host for the legacy guide: one lazily-mounted instance (kept alive while hidden) that shows one section at a time.
   Route: #/board?pair=<section id | all>[&at=<element id>]. */
import { mountGuide } from './guide';

export function mountBoard(host: HTMLElement) {
  mountGuide(host);
  host.classList.add('guide-host');
  const secs = [...host.querySelectorAll<HTMLElement>('section[data-stage]')];
  const titleOf = (s: HTMLElement) => (s.querySelector('h2')?.textContent ?? 'Overview & roadmap').replace(/\s+/g, ' ').trim();

  const bar = document.createElement('div');
  bar.className = 'gbar'; bar.dataset.testid = 'guide-bar';
  const prev = document.createElement('button'); prev.textContent = '‹ Prev'; prev.dataset.testid = 'guide-prev';
  const next = document.createElement('button'); next.textContent = 'Next ›'; next.dataset.testid = 'guide-next';
  const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Choose a section of the guide'); sel.dataset.testid = 'guide-select';
  for (const s of secs) sel.append(new Option(titleOf(s), s.id));
  sel.append(new Option('All sections (one long page)', 'all'));
  const note = document.createElement('span'); note.className = 'gnote';
  note.innerHTML = 'The original interactive guide, unchanged. <a href="#/">← Back to the question map</a>';
  bar.append(prev, sel, next, note);
  host.prepend(bar);

  const go = (pair: string, at?: string) => { location.hash = `#/board?pair=${encodeURIComponent(pair)}${at ? `&at=${encodeURIComponent(at)}` : ''}`; };
  sel.onchange = () => go(sel.value);
  const step = (d: number) => { const i = secs.findIndex((s) => s.id === sel.value); const j = i + d; if (j >= 0 && j < secs.length) go(secs[j].id); };
  prev.onclick = () => step(-1); next.onclick = () => step(1);

  const byId = (id: string) => host.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
  /** `pair` is a section id, "all", or any element id inside the guide (a card, a deep dive, a question). */
  function show(params: URLSearchParams) {
    let pair = params.get('pair') ?? 'overview';
    let at = params.get('at');
    if (pair !== 'all' && !secs.some((s) => s.id === pair)) {
      const el = byId(pair); const sec = el?.closest('section[data-stage]') as HTMLElement | null;
      if (sec) { at = at ?? pair; pair = sec.id; } else pair = 'all';
    }
    for (const s of secs) s.classList.toggle('gh-hide', pair !== 'all' && s.id !== pair);
    sel.value = pair;
    const i = secs.findIndex((s) => s.id === pair);
    prev.disabled = i <= 0; next.disabled = i < 0 || i >= secs.length - 1;
    const el = at ? byId(at) : null;
    if (el) { if (el.tagName === 'DETAILS') (el as HTMLDetailsElement).open = true; requestAnimationFrame(() => el.scrollIntoView({ block: 'start' })); }
    else window.scrollTo(0, 0);
  }

  // in-guide anchors (#q3, #sp-meaning, #ap-slow …) stay inside the board instead of hijacking the app's router
  host.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href')!;
    if (href.startsWith('#/')) return; // an app route (e.g. #/quiz)
    e.preventDefault();
    const id = href.slice(1);
    const el = id ? byId(id) : null;
    const sec = el?.closest('section[data-stage]') as HTMLElement | null;
    go(sec ? sec.id : 'overview', sec && sec.id !== id ? id : undefined);
  });

  (window as any).__guide = { show, sections: secs.map((s) => s.id) };
  return { show, hide() {} };
}
