import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';

/** Malcolm's chain navigation (linear-systems): the walk goes box → line → box; Next links/buttons open the outgoing line, Back opens the incoming line; a line's Next / Back open its boxes. */
const MAIN = ['root', 'SYS', 'SUP', 'LIN', 'NEAR', 'KICK', 'TONE', 'FOUR', 'LAP', 'PZ', 'STATE', 'MODES', 'STAB', 'INOUT', 'WORK'];
const heading = (page: Page) => page.locator('[data-testid=map-panel] .cm-head h3');
const labelOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__study.content.maps[0].nodes.find((n: any) => n.id === x).label, id);

test.describe('linear-systems: walk the chain through the lines', () => {
  const edgeHead = (page: Page, a: string, b: string) => page.locator('[data-testid=chain-nav] [data-testid=edge-next][data-to="' + b + '"]');
  test('root → line → box 1 → line → … → box 14 using only Next, then back the same way using only Back', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="root"]').dispatchEvent('click');
    await expect(heading(page)).toHaveText(await labelOf(page, 'root'));
    await expect(page.getByTestId('chain-back')).toHaveCount(0); // the root has no Back
    await expect(page.getByTestId('pop-question')).toContainText('How do we predict the output for ANY input?');
    const path: string[] = ['box:root'];
    for (let i = 1; i < MAIN.length; i++) {
      // box → its outgoing line (the Next-question link opens the LINE, not the next box)
      const link = page.locator(`[data-testid=pop-next-link][data-to="${MAIN[i]}"]`);
      await expect(link, `${MAIN[i - 1]} links to the line towards ${MAIN[i]}`).toHaveCount(1);
      await link.click();
      await expect(page.getByTestId('edge-why'), `line ${MAIN[i - 1]}→${MAIN[i]} says why`).toBeVisible();
      await expect(edgeHead(page, MAIN[i - 1], MAIN[i])).toHaveCount(1);
      path.push(`line:${MAIN[i - 1]}→${MAIN[i]}`);
      // line → the box it leads to
      await page.getByTestId('edge-next').click();
      await expect(heading(page)).toHaveText(await labelOf(page, MAIN[i]));
      path.push(`box:${MAIN[i]}`);
      await expect(page.getByTestId('pop-question'), `box ${MAIN[i]} restates the question it was reached by`).toHaveAttribute('data-edge', `${MAIN[i - 1]}__${MAIN[i]}`);
    }
    await expect(page.getByTestId('pop-next-link')).toHaveCount(0); // box 14 ends the chain
    expect(path.length).toBe(2 * MAIN.length - 1);
    // and back: box → incoming line → box above → … → root, by the main-chain Back each time
    for (let i = MAIN.length - 1; i > 0; i--) {
      const back = page.getByTestId('chain-back').first();
      await expect(back, `${MAIN[i]} Back goes along the main chain`).toHaveAttribute('data-to', MAIN[i - 1]);
      await back.click();
      await expect(page.getByTestId('edge-why')).toBeVisible();
      await expect(page.getByTestId('edge-back')).toHaveAttribute('data-to', MAIN[i - 1]);
      await page.getByTestId('edge-back').click();
      await expect(heading(page)).toHaveText(await labelOf(page, MAIN[i - 1]));
    }
    await expect(page.getByTestId('chain-back')).toHaveCount(0);
    expect(errs).toEqual([]);
  });

  test('box 9 lists both next questions, each opening its own line; buttons tappable at 390 px, no overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="PZ"]').dispatchEvent('click');
    await expect(page.getByTestId('pop-next-link')).toHaveCount(2);
    const next = page.getByTestId('chain-next'), back = page.getByTestId('chain-back');
    await expect(next).toHaveCount(2); await expect(back).toHaveCount(1);
    await expect(next.first()).toHaveAttribute('data-edge', 'PZ__STAB'); await expect(next.nth(1)).toHaveAttribute('data-edge', 'PZ__STATE');
    await expect(back.first()).toHaveAttribute('data-edge', 'LAP__PZ');
    const boxes = await page.locator('[data-testid=chain-nav] .tbtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height })));
    for (const b of boxes) { expect(b.h).toBeGreaterThanOrEqual(44); expect(b.w).toBeGreaterThanOrEqual(44); expect(b.r).toBeLessThanOrEqual(390); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], c = boxes[j]; expect(a.r <= c.l + 0.5 || c.r <= a.l + 0.5 || a.b <= c.t + 0.5 || c.b <= a.t + 0.5, `buttons ${i} and ${j} overlap`).toBe(true); }
    await next.nth(1).click();
    await expect(page.getByTestId('edge-why')).toContainText('Still open');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'STATE'));
  });

  test('a line pop-up teaches why you ask it (with a captioned figure where one helps) and has Back / Next', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-edge][data-edge="LIN__NEAR"]').first().dispatchEvent('click');
    await expect(page.locator('.c-predict .lead').first(), 'the line poses the question; the next box answers it').toHaveText('The question this line asks');
    await expect(page.getByText('The question this line answers')).toHaveCount(0);
    const why = page.getByTestId('edge-why');
    for (const t of ['Still open', 'Why it matters', 'What we want', '2 V']) await expect(why).toContainText(t);
    await expect(page.getByTestId('edge-why-figures').locator('svg, canvas').first()).toBeVisible();
    await expect(page.getByTestId('edge-why-figcap')).toContainText('homogeneity');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'NEAR'));
    await page.locator('[data-testid=map-edge][data-edge="LIN__NEAR"]').first().dispatchEvent('click');
    await page.getByTestId('edge-back').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'LIN'));
    expect(errs).toEqual([]);
  });

  test('the dashed look-back: box 11 offers it, and its line reads from Modes back to Tones', async ({ page }) => {
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="MODES"]').dispatchEvent('click');
    await page.getByTestId('pop-side-link').click();
    await expect(page.getByTestId('edge-why')).toContainText('eigenvector');
    await expect(page.getByTestId('edge-back')).toHaveAttribute('data-to', 'MODES');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'TONE'));
  });

  test('every box pop-up on both maps opens with its question line; a box with two ways in restates the one you came by', async ({ page }) => {
    await open(page, 'linear-systems');
    const maps = await page.evaluate(() => (window as any).__study.content.maps.map((m: any) => ({ id: m.id, nodes: m.nodes.filter((n: any) => n.pop).map((n: any) => n.id), edges: m.edges })));
    for (const [mi, m] of maps.entries()) {
      if (mi > 0) await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click();
      for (const id of m.nodes) {
        await page.locator(`[data-testid=map-node][data-node="${id}"]`).first().dispatchEvent('click');
        const q = page.getByTestId('pop-question');
        await expect(q, `${m.id}/${id} question line`).toHaveCount(1);
        const ins = m.edges.filter((e: any) => e.to === id && !e.dashed).map((e: any) => `${e.from}__${e.to}`);
        const got = (await q.getAttribute('data-edge')) ?? '';
        if (ins.length) expect(ins, `${m.id}/${id} restates one of its incoming questions`).toContain(got); else expect(got, `${m.id}/${id} is a root`).toBe('');
        await page.getByTestId('panel-close').click();
      }
    }
    // box 12 (Will it settle?) has two ways in: arrive from box 11 and it restates box 11's question
    await page.reload();
    await page.locator('[data-testid=map-edge][data-edge="MODES__STAB"]').first().dispatchEvent('click');
    await page.getByTestId('edge-next').click();
    await expect(page.getByTestId('pop-question')).toHaveAttribute('data-edge', 'MODES__STAB');
    await expect(page.getByTestId('pop-question')).toContainText('Will every mode fade?');
  });
});
