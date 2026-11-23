import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';

/* Meet the example (Malcolm, Nov 21): the pop-up of the box an Example node hangs from carries one link per example,
   'Meet the example: <label> →', after the running-example line and before Next question. It opens that example's
   introduction as a history step, and Back returns to the box. Only host boxes carry it. Item links in pop-ups are smaller
   (≈0.85em) than the chain controls but still ≥ 32 px tall on a phone. */
type R = { id: string; at: string; label: string };
type M = { id: string; nodes: { id: string; pop?: unknown }[] };
const info = (page: Page): Promise<{ refs: R[]; maps: M[] }> => page.evaluate(() => { const c = (window as any).__study.content; return { refs: c.subject.runningExample?.refs ?? [], maps: c.maps }; });
const tab = async (page: Page, id: string) => { const x = page.getByTestId('panel-close'); if (await x.isVisible()) { await x.click(); await page.waitForTimeout(150); } const t = page.locator(`button[role=tab][data-map="${id}"]`).first(); if (await t.count()) { await t.click(); await page.waitForTimeout(120); } };
const node = (page: Page, id: string) => page.locator(`[data-testid=map-node][data-node="${id}"]`).first().dispatchEvent('click');

for (const app of ['control-systems', 'linear-systems', 'sim-project'])
  for (const [W, H] of [[1280, 900], [390, 844]] as const) test(`${app} @${W}: host boxes link to their example's introduction; Back returns to the box`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await page.goto('about:blank');
    await open(page, app);
    const { refs, maps } = await info(page);
    let hosts = 0;
    for (const m of maps) {
      const on = refs.filter((r) => m.nodes.some((n) => n.id === r.at));
      if (!on.length) continue;
      await tab(page, m.id);
      for (const at of [...new Set(on.map((r) => r.at))]) {
        hosts++;
        const mine = on.filter((r) => r.at === at);
        await node(page, at); await page.waitForTimeout(200);
        const links = page.getByTestId('meet-example');
        await expect(links).toHaveCount(mine.length);
        for (const [i, r] of mine.entries()) await expect(links.nth(i)).toHaveText(`Meet the example: ${r.label} →`);
        // placed after the running-example line and before Next question (when the box has them)
        const order = await page.evaluate(() => { const p = document.querySelector('[data-testid=map-panel]')!; const all = [...p.querySelectorAll('[data-testid]')].map((e) => (e as HTMLElement).dataset.testid); return { meet: all.indexOf('pop-meet'), ex: all.indexOf('adds-to-example'), next: all.indexOf('pop-next') }; });
        if (order.ex >= 0) expect(order.meet).toBeGreaterThan(order.ex);
        if (order.next >= 0) expect(order.meet).toBeLessThan(order.next);
        // smaller than the text around it, and tappable on a phone
        const sz = await links.first().evaluate((a) => { const r = a.getBoundingClientRect(); return { f: parseFloat(getComputedStyle(a).fontSize), pf: parseFloat(getComputedStyle(a.closest('.cm-panel, [data-testid=map-panel]')!).fontSize), h: r.height }; });
        expect(sz.f / sz.pf).toBeLessThan(0.9);
        if (W < 700) expect(sz.h).toBeGreaterThanOrEqual(31.5);
        // open it: a history step to the introduction, and Back returns to the box
        const before = await page.evaluate(() => location.hash);
        await links.first().click(); await page.waitForTimeout(200);
        await expect(page.locator(`.qm-node[data-node="${at}"]`)).not.toHaveClass(/n-sel/);
        await expect(page.getByTestId('ref-nav')).toBeVisible();
        expect(await page.evaluate(() => location.hash)).not.toBe(before);
        await page.goBack(); await page.waitForTimeout(200);
        expect(page.url()).toContain(`/${app}/`);
        await expect(page.locator(`.qm-node[data-node="${at}"]`)).toHaveClass(/n-sel/);
        await expect(page.getByTestId('meet-example')).toHaveCount(mine.length);
      }
      // a box no example hangs from has no Meet link
      const other = m.nodes.find((n) => !on.some((r) => r.at === n.id))!;
      await node(page, other.id); await page.waitForTimeout(200);
      await expect(page.locator(`.qm-node[data-node="${other.id}"]`)).toHaveClass(/n-sel/);
      await expect(page.getByTestId('meet-example')).toHaveCount(0);
    }
    expect(hosts).toBeGreaterThan(0);
    expect(errs).toEqual([]);
  });

test('pop-up item links are smaller than the chain controls; phone links are ≥ 32 px tall', async ({ page }) => {
  for (const [W, H] of [[1280, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: W, height: H });
    await page.goto('about:blank');
    await open(page, 'control-systems');
    const host = await page.evaluate(() => (window as any).__study.content.subject.runningExample.refs[0].at);
    await node(page, host); await page.waitForTimeout(200);
    const f = (sel: string) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { f: parseFloat(getComputedStyle(e).fontSize), h: r.height }; });
    const meet = await f('[data-testid=meet-example]'), nxt = await f('[data-testid=chain-nav] button, .pop-next-link');
    expect(meet.f).toBeLessThan(nxt.f);
    await page.getByTestId('meet-example').first().click(); await page.waitForTimeout(200);
    const back = await f('[data-testid=ref-comesback-link]'), host2 = await f('[data-testid=ref-host]');
    expect(back.f).toBeLessThan(nxt.f);
    if (W < 700) { expect(back.h).toBeGreaterThanOrEqual(31.5); expect(host2.h).toBeGreaterThanOrEqual(31.5); }
  }
});
