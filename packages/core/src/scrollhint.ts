/**
 * Wide display equations stay horizontal-scroll containers on a phone, but say so: a fade on the side that
 * has more, and a small "scroll" cue under the equation while any of it is out of view.
 */
export function scrollHints(root: HTMLElement, sel = '.katex-display'): () => void {
  const els = [...root.querySelectorAll<HTMLElement>(sel)];
  const update = (el: HTMLElement) => {
    const wide = el.scrollWidth > el.clientWidth + 2;
    el.classList.toggle('x-scroll', wide);
    el.classList.toggle('x-more-right', wide && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    el.classList.toggle('x-more-left', wide && el.scrollLeft > 2);
    let cue = el.nextElementSibling as HTMLElement | null;
    if (!cue || !cue.classList.contains('x-cue')) cue = null;
    if (wide && !cue) {
      cue = document.createElement('div'); cue.className = 'x-cue'; cue.setAttribute('aria-hidden', 'true'); cue.dataset.testid = 'scroll-cue';
      cue.textContent = 'scroll sideways for the rest ⇢'; el.after(cue);
    } else if (!wide && cue) cue.remove();
    if (cue) cue.textContent = el.classList.contains('x-more-right') ? 'scroll sideways for the rest ⇢' : '⇠ scroll back';
  };
  const onScroll = (ev: Event) => update(ev.currentTarget as HTMLElement);
  for (const el of els) { el.addEventListener('scroll', onScroll, { passive: true }); update(el); }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => els.forEach(update)) : null;
  els.forEach((el) => ro?.observe(el));
  return () => { ro?.disconnect(); els.forEach((el) => el.removeEventListener('scroll', onScroll)); };
}
