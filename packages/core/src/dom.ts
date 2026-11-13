type Attrs = Record<string, any> | null;
/** Tiny hyperscript helper: h('div', {class:'x', onclick}, 'text', child). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...kids: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) el.append(c as Node | string);
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, any>, ...kids: (Node | string)[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) el.append(c as Node | string);
  return el;
}
export const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export function clear(el: Element): void { while (el.firstChild) el.removeChild(el.firstChild); }
