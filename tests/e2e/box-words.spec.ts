import { test, expect } from '@playwright/test';

/* Word guard for linear-systems map boxes: every box pop-up, on both maps, shows at most 150 words of teaching text
   as the reader sees it (the question, answer, rough words, equation, captions, sound notes, running example and next
   question; buttons, nav, the path chips, quick check, the header and the sound controls do not count). */
test('linear-systems: every map box pop-up is 150 words or under, as rendered', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/linear-systems/index.html');
  await page.waitForFunction(() => !!(window as any).__study);
  const maps: { id: string; nodes: string[] }[] = await page.evaluate(() => (window as any).__study.content.maps.map((m: any) => ({ id: m.id, nodes: m.nodes.map((n: any) => n.id) })));
  const res: Record<string, number> = {};
  for (const [mi, m] of maps.entries()) {
    if (mi > 0) await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click();
    for (const id of m.nodes) {
      if (res[id] !== undefined) continue;
      await page.locator(`[data-testid=map-node][data-node="${id}"]`).first().dispatchEvent('click');
      await page.waitForTimeout(60);
      res[id] = await page.evaluate(() => {
        const p = document.querySelector('[data-testid=map-panel]') as HTMLElement, c = p.cloneNode(true) as HTMLElement;
        c.querySelectorAll('.chain-nav,.acts,.path,.pop-ask,.cm-head,button,.aud-bar,.aud-ctl,canvas,svg,.pop-end').forEach((e) => e.remove());
        c.style.cssText = `position:absolute;left:-9999px;top:0;width:${p.clientWidth}px`; document.body.append(c);
        const n = c.innerText.split(/\s+/).filter(Boolean).length; c.remove(); return n;
      });
      await page.getByTestId('panel-close').click();
    }
  }
  expect(Object.keys(res).length).toBeGreaterThan(30);
  expect(Object.entries(res).filter(([, n]) => n > 150).map(([k, n]) => `${k}: ${n}`)).toEqual([]);
});
