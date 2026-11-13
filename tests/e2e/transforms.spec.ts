import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';
import { PAIRJS, RTJS, REV1, REV2, REV3 } from './legacy-board-js';

const BOARD = '#/board';
const W = (page: Page, ms = 150) => page.waitForTimeout(ms);
const st = (page: Page) => page.evaluate(() => ({ open: !(document.getElementById('modal') as HTMLElement).hidden, k: (window as any).MOD.k, sel: (window as any).S.sel, mode: (window as any).S.mode, sig: (window as any).S.sig, f0: (window as any).S.f0, dl: (window as any).S.dl }));
const hashCanvas = (page: Page, id: string) => page.evaluate((i) => { const s = (document.getElementById(i) as HTMLCanvasElement).toDataURL(); let x = 0; for (let k = 0; k < s.length; k += 7) x = (x * 31 + s.charCodeAt(k)) | 0; return x; }, id);
const setRange = (page: Page, id: string, v: number) => page.evaluate(([i, val]) => { const e = document.getElementById(i as string) as HTMLInputElement; e.value = String(val); e.dispatchEvent(new Event('input')); }, [id, v]);

test.describe('transforms: six-domains board (migrated 1:1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await open(page, 'transforms', BOARD);
    await page.waitForFunction(() => !!(window as any).__EX && (window as any).S);
  });

  test('loads with six panels, nine arrows, 20 examples in 5 tabs and no console errors', async ({ page }) => {
    const errs = trackErrors(page);
    await page.reload(); await page.waitForFunction(() => !!(window as any).S);
    await expect(page.locator('.legacy-board .panel')).toHaveCount(6);
    expect(await page.evaluate(() => new Set([...document.querySelectorAll('.legacy-board .tl')].map((e) => (e as HTMLElement).dataset.id)).size)).toBe(9);
    expect(await page.evaluate(() => (window as any).__EX.length)).toBe(20);
    await expect(page.locator('#cats button')).toHaveCount(5);
    await expect(page.locator('#presets button')).not.toHaveCount(0);
    expect(await page.locator('#exinfo').evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false); // About collapsed
    expect(await page.locator('#more').evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);   // More controls collapsed
    expect(errs).toEqual([]);
  });

  test('board keeps its chalkboard palette in light theme', async ({ page }) => {
    await page.getByTestId('theme-toggle').click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.legacy-board .board')!).backgroundColor)).not.toBe('rgb(255, 255, 255)');
    await page.getByTestId('theme-toggle').click();
  });

  test('every example is reachable by its preset button and round-trips through the visible controls (number boxes)', async ({ page }) => {
    await page.evaluate(`(${PAIRJS.replace('for(const A of acts)for(const B of acts)', 'for(const A of acts.slice(0,1))for(const B of acts.slice(0,1))')})()`);
    const r = await page.evaluate(`(${RTJS})('num')`) as any;
    expect(r.n).toBe(20); expect(r.fails).toEqual([]); expect(r.notRepresentable).toEqual([]);
  });

  test('…and through the sliders only', async ({ page }) => {
    await page.evaluate(`(${PAIRJS.replace('for(const A of acts)for(const B of acts)', 'for(const A of acts.slice(0,1))for(const B of acts.slice(0,1))')})()`);
    const r = await page.evaluate(`(${RTJS})('range')`) as any;
    expect(r.n).toBe(20); expect(r.fails).toEqual([]); expect(r.notRepresentable).toEqual([]);
  });

  test('pairwise: an example always renders identically, whatever was dialled before it', async ({ page }) => {
    const full = !!process.env.FULL_PAIRWISE;
    test.setTimeout(full ? 20 * 60_000 : 120_000);
    const js = full ? PAIRJS : PAIRJS.replace('for(const A of acts)for(const B of acts)', 'for(const A of acts.slice(0,6))for(const B of acts.slice(0,6))');
    const r = await page.evaluate(`(${js})()`) as any;
    expect(r.fails).toEqual([]); expect(r.nfail).toBe(0);
    console.log(`pairwise (${full ? 'full' : 'reduced'}): ${r.runs} runs over ${r.actions} actions`);
  });

  test('hand-dialling an example\'s settings switches the About box to it and clears "(modified)"', async ({ page }) => {
    await page.evaluate("__apply('under')");
    await page.evaluate(REV1);
    expect(await page.locator('#exsum').textContent()).toContain('(modified)');
    await page.evaluate(REV2);
    expect(await page.locator('#exsum').textContent()).not.toContain('(modified)');
    expect(await page.evaluate("[...document.querySelectorAll('#presets button.on')].map(b=>b.dataset.id)")).toEqual(['offbin']);
    await page.evaluate(REV3);
    expect(await page.locator('#exsum').textContent()).toContain('(modified)');
  });

  test('expanded view: controls stay usable, main controls drive it, Esc / margin close it', async ({ page }) => {
    await page.evaluate("__apply('under')");
    await page.locator('#pCF .xp').click(); await W(page, 200);
    expect(await st(page)).toMatchObject({ open: true, k: 'CF' });
    await page.evaluate("document.getElementById('sF0').scrollIntoView({block:'center'})");
    const sl = (await page.locator('#sF0').boundingBox())!;
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y) === document.getElementById('sF0'), [sl.x + sl.width / 2, sl.y + sl.height / 2])).toBe(true);
    const h1 = await hashCanvas(page, 'cvM');
    await setRange(page, 'sF0', 2.5); await W(page);
    expect(await hashCanvas(page, 'cvM')).not.toBe(h1);
    const h2 = await hashCanvas(page, 'cvM');
    await page.locator('#presets button[data-id=heavy]').click(); await W(page);
    expect(await st(page)).toMatchObject({ open: true });
    expect(await hashCanvas(page, 'cvM')).not.toBe(h2);
    await page.keyboard.press('Escape');
    expect((await st(page)).open).toBe(false);
    const bx = (await page.locator('#cvDT').boundingBox())!;
    await page.mouse.click(bx.x + 50, bx.y + 40); await W(page, 200);
    expect(await st(page)).toMatchObject({ open: true, k: 'DT' });
    const mb = (await page.locator('.legacy-board .board').boundingBox())!;
    await page.mouse.click(mb.x + 3, mb.y + mb.height / 2);
    expect((await st(page)).open).toBe(false);
    await page.locator('.tl[data-id=dtft]').click(); await W(page);
    expect(await st(page)).toMatchObject({ open: true, sel: 'dtft' });
    await page.keyboard.press('Escape');
  });

  test('S-plane poles drag through all three damping regimes, and the sliders follow', async ({ page }) => {
    await page.evaluate("__apply('under')"); await W(page, 100);
    const spos = (i: number) => page.evaluate((n) => { const d = (window as any).D(), F = (window as any).VIEWS.get(document.getElementById('cvS')).F, p = [d.p1, d.p2][n]; return [F.X(p.re), F.Y(p.im), F.Y(0)]; }, i);
    const bx = (await page.locator('#cvS').boundingBox())!;
    let [x, y, y0] = await spos(0);
    await page.mouse.move(bx.x + x, bx.y + y); await page.mouse.down();
    await page.mouse.move(bx.x + x - 25, bx.y + y0 + 2, { steps: 8 }); await W(page, 50);
    expect(await st(page)).toMatchObject({ mode: 'crit', open: false });
    await page.mouse.move(bx.x + x + 20, bx.y + y0 + 1, { steps: 8 });
    expect((await st(page)).mode).toBe('crit');
    await page.mouse.up();
    [x, y, y0] = await spos(0);
    await page.mouse.move(bx.x + x, bx.y + y0); await page.mouse.down();
    await page.mouse.move(bx.x + x + 40, bx.y + y0, { steps: 8 });
    expect((await st(page)).mode).toBe('over');
    await page.mouse.move(bx.x + x + 3, bx.y + y0, { steps: 8 });
    expect((await st(page)).mode).toBe('crit');
    await page.mouse.move(bx.x + x + 3, bx.y + y0 - 45, { steps: 8 });
    expect((await st(page)).mode).toBe('under');
    await page.mouse.up();
    expect((await st(page)).open).toBe(false);
    expect(await page.evaluate("[...document.querySelectorAll('.legacy-board aside input[type=range]')].filter(e=>e.offsetParent&&!e.disabled).every(e=>Math.abs(parseFloat(e.value)-S[e.dataset.k])<1e-12)")).toBe(true);
  });

  test('Z-plane drag onto the positive real axis, and drags inside the expanded S view', async ({ page }) => {
    await page.evaluate("__apply('under')"); await W(page, 100);
    const bz = (await page.locator('#cvZ').boundingBox())!;
    const [zx, zy, z0] = await page.evaluate(() => { const d = (window as any).D(), F = (window as any).VIEWS.get(document.getElementById('cvZ')).F; return [F.X(d.q1.re), F.Y(d.q1.im), F.Y(0)]; });
    await page.mouse.move(bz.x + zx, bz.y + zy); await page.mouse.down(); await page.mouse.move(bz.x + zx, bz.y + z0, { steps: 8 }); await page.mouse.up();
    expect((await st(page)).mode).toBe('crit');
    await page.evaluate("__apply('crit')"); await page.locator('#pS .xp').click(); await W(page, 200);
    const bm = (await page.locator('#cvM').boundingBox())!;
    const [mx, my] = await page.evaluate(() => { const d = (window as any).D(), F = (window as any).VIEWS.get(document.getElementById('cvM')).F; return [F.X(d.p1.re), F.Y(0)]; });
    await page.mouse.move(bm.x + mx, bm.y + my); await page.mouse.down(); await page.mouse.move(bm.x + mx + 120, bm.y + my, { steps: 8 }); await page.mouse.up();
    expect(await st(page)).toMatchObject({ mode: 'over', open: true });
    await page.locator('#mClose').click();
    expect((await st(page)).open).toBe(false);
  });

  test('legends: collapsed by default, per-slot, list what is drawn, never cover a pole', async ({ page }) => {
    const items = (i = 0) => page.evaluate((n) => [...document.querySelectorAll(`#lgBox${n} .li b`)].map((e) => e.textContent).join(' | '), i);
    await page.evaluate("__apply('alias')"); await page.locator('#pCF .xp').click(); await W(page);
    expect(await page.evaluate("document.getElementById('lgBox0').hidden")).toBe(true);
    await page.locator('.lgchip[data-s="0"]').click(); await W(page);
    const shown = await items(); expect(shown.length).toBeGreaterThan(5);
    await page.evaluate("document.querySelector('#segCop button[data-v=off]').click()"); await W(page);
    expect(await items()).not.toBe(shown); // legend follows the 'shifted copies' toggle
    for (const [k, pre] of [['CT', "__apply('zohsinc')"], ['CT', "__apply('fsview')"], ['DT', "__apply('kaiserb')"], ['DT', "__apply('trunc')"], ['DF', "__apply('offbin')"], ['S', "__apply('crit')"], ['Z', "__apply('under')"], ['Z', "__apply('over')"]]) {
      await page.evaluate(`${pre};openModal('${k}')`); await W(page);
      expect((await items()).length, `${k} after ${pre}`).toBeGreaterThan(3);
    }
    await page.evaluate("__apply('crit');openModal('S')"); await W(page, 250);
    const bm = (await page.locator('#cvM').boundingBox())!;
    const [mx, my] = await page.evaluate(() => { const d = (window as any).D(), F = (window as any).VIEWS.get(document.getElementById('cvM')).F; return [F.X(d.p1.re), F.Y(0)]; });
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y) === document.getElementById('cvM'), [bm.x + mx, bm.y + my])).toBe(true);
    await page.mouse.move(bm.x + mx, bm.y + my); await page.mouse.down(); await page.mouse.move(bm.x + mx + 120, bm.y + my, { steps: 8 }); await page.mouse.up();
    expect((await st(page)).mode).toBe('over');
    await page.keyboard.press('Escape');
  });

  test('pair view: both directions for all 9 links, linked sliders, independent legends, dropdown', async ({ page }) => {
    const h = (id: string) => hashCanvas(page, id);
    await page.evaluate("__apply('under')"); await page.locator('.tl[data-id=lap]').click(); await W(page, 250);
    expect(await st(page)).toMatchObject({ open: true, sel: 'lap' });
    expect(await page.evaluate("document.getElementById('slot1').hidden")).toBe(false);
    const [a1, a2] = [await h('cvM'), await h('cvM2')];
    await setRange(page, 'sSig', 1.2); await W(page);
    expect(await h('cvM')).not.toBe(a1); expect(await h('cvM2')).not.toBe(a2);
    await page.evaluate("setLegend(0,true);setLegend(1,false)");
    expect(await page.evaluate("[!lgBox0.hidden,!lgBox1.hidden]")).toEqual([true, false]);
    await page.evaluate("document.getElementById('more').open=true;const s=document.getElementById('selSel');s.value='dft';s.dispatchEvent(new Event('change'))"); await W(page);
    expect(await st(page)).toMatchObject({ open: true, sel: 'dft' });
    await page.evaluate("document.getElementById('more').open=false");
    const bad = await page.evaluate(`(()=>{const bad=[];for(const id of Object.keys(TX)){closeModal();MOD.flip=false;pick(id);render();
      const rows=[...document.querySelectorAll('#mStrip .srow .dtag')].map(e=>e.textContent),card=[...document.querySelectorAll('#explain .drow .dtag')].map(e=>e.textContent);
      const [a,b]=TX[id].ends.map(e=>e.slice(1));const want=[a+' → '+b,b+' → '+a];
      if(JSON.stringify(rows)!==JSON.stringify(want))bad.push(id+' strip '+rows);if(JSON.stringify(card)!==JSON.stringify(want))bad.push(id+' card '+card);
      if(document.querySelectorAll('#explain .dlost').length!==2)bad.push(id+' lost notes');
      document.getElementById('sFlip').click();const fl=[...document.querySelectorAll('#mStrip .srow .dtag')].map(e=>e.textContent);if(JSON.stringify(fl)!==JSON.stringify([want[1],want[0]]))bad.push(id+' flip');}
      MOD.flip=false;for(const m of ['zoh','foh','sinc']){document.querySelector('#segInterp button[data-v='+m+']').click();pick('samp');render();const on=document.querySelector('#mStrip .opts .on');if(!on||!on.textContent.toUpperCase().startsWith(m==='sinc'?'IDEAL':m.toUpperCase()))bad.push('interp highlight '+m);}
      return bad;})()`);
    expect(bad).toEqual([]);
    expect(await page.evaluate("Object.keys(TX).length")).toBe(9);
    await page.keyboard.press('Escape'); await W(page);
    expect(await page.evaluate("getComputedStyle(document.querySelector('.legacy-board .map')).visibility")).toBe('visible');
  });

  test('presets never open an expanded view; About stays as the user left it; More controls badge counts overrides', async ({ page }) => {
    for (const ex of ['crit', 'fsview', 'marginal']) {
      await page.evaluate((id) => (document.querySelector(`#cats button[data-i="${(window as any).__EX.find((e: any) => e.id === id).cat}"]`) as HTMLElement).click(), ex);
      await page.locator(`#presets button[data-id=${ex}]`).click(); await W(page, 80);
      expect(await page.evaluate("!document.getElementById('modal').hidden")).toBe(false);
      expect(await page.evaluate("document.getElementById('exinfo').open")).toBe(false);
    }
    await page.evaluate("document.getElementById('exinfo').open=true");
    await page.locator('#presets button[data-id=unstable]').click();
    expect(await page.evaluate("document.getElementById('exinfo').open")).toBe(true);
    const badge = await page.evaluate("(__apply('alias'),[document.getElementById('more').open,moreBadge(),document.getElementById('moreBadge').textContent])") as any[];
    expect(badge[0]).toBe(false); expect(String(badge[2])).toMatch(/\d+ set/);
  });

  test('windows: all nine incl. Kaiser and Tukey, with live metrics', async ({ page }) => {
    const names = await page.evaluate("[...document.querySelectorAll('#selWin option')].map(o=>o.textContent)") as string[];
    expect(names.length).toBe(9);
    expect(names.join('|')).toMatch(/Kaiser/); expect(names.join('|')).toMatch(/Tukey/);
    await page.evaluate("__apply('kaiserb')"); await W(page);
    expect(await page.evaluate("document.getElementById('rowBeta').hidden")).toBe(false);
  });

  test('deep link #/board?pair=lap&preset=under opens the pair view on that example', async ({ page }) => {
    await page.goto('/transforms/index.html#/board?pair=lap&preset=over');
    await page.reload(); await page.waitForFunction(() => !!(window as any).S && (window as any).MOD.k);
    expect(await st(page)).toMatchObject({ open: true, sel: 'lap', mode: 'over' });
  });
});

test.describe('transforms: board on a phone (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('tap opens a pinned expanded view; the slider below stays reachable and drives it; margin tap closes', async ({ page }) => {
    await open(page, 'transforms', BOARD);
    await page.waitForFunction(() => !!(window as any).S);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.locator('#cvDF').scrollIntoViewIfNeeded();
    const bx = (await page.locator('#cvDF').boundingBox())!;
    await page.touchscreen.tap(bx.x + 60, bx.y + 40); await W(page, 300);
    expect(await st(page)).toMatchObject({ open: true, k: 'DF' });
    await page.evaluate(() => { const b = document.querySelector('.legacy-board .board')!.getBoundingClientRect(), s = document.getElementById('sN')!.getBoundingClientRect(); window.scrollBy(0, s.top - b.bottom - 40); });
    await W(page, 300);
    const r = await page.evaluate(() => { const b = document.querySelector('.legacy-board .board')!.getBoundingClientRect(), s = document.getElementById('sN')!.getBoundingClientRect(); return { boardTop: b.top, boardBottom: b.bottom, reach: document.elementFromPoint(s.left + s.width / 2, s.top + s.height / 2) === document.getElementById('sN') }; });
    expect(r.reach).toBe(true);
    expect(r.boardTop).toBeLessThan(200); // pinned under the top bar
    const h1 = await hashCanvas(page, 'cvM');
    await setRange(page, 'sN', 16); await W(page, 200);
    expect(await hashCanvas(page, 'cvM')).not.toBe(h1);
    await page.touchscreen.tap(3, Math.round((r.boardTop + r.boardBottom) / 2)); await W(page, 150);
    expect((await st(page)).open).toBe(false);
    await page.evaluate("document.getElementById('exinfo').open=false;__apply('alias');window.scrollTo(0,0)"); await W(page, 200);
    await page.evaluate("document.querySelector('.tl[data-id=samp]').click()"); await W(page, 400);
    expect(await page.evaluate("slot1.getBoundingClientRect().top>=slot0.getBoundingClientRect().bottom-1")).toBe(true); // stacked
    const c = (await page.locator('.lgchip[data-s="1"]').boundingBox())!;
    await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2); await W(page, 200);
    expect(await page.evaluate("!lgBox1.hidden")).toBe(true);
  });
});
