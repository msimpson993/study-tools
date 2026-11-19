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

  test('box 9 fork: the main path (box 10) comes first and is the primary button; the side path to "Will it settle?" is labelled; 390 px, no overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="PZ"]').dispatchEvent('click');
    const links = page.getByTestId('pop-next-link');
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveAttribute('data-edge', 'PZ__STATE');
    await expect(page.locator('.pop-next-list li').first()).toContainText('Main path:');
    await expect(page.locator('.pop-next-list li').nth(1)).toContainText('Side path');
    const next = page.getByTestId('chain-next'), back = page.getByTestId('chain-back');
    await expect(next).toHaveCount(2); await expect(back).toHaveCount(1);
    await expect(next.first()).toHaveAttribute('data-edge', 'PZ__STATE'); await expect(next.first()).toHaveAttribute('data-path', 'main');
    await expect(next.first()).toHaveClass(/\bon\b/); await expect(next.first()).toContainText('main path');
    await expect(next.nth(1)).toHaveAttribute('data-edge', 'PZ__STAB'); await expect(next.nth(1)).toHaveAttribute('data-path', 'side');
    await expect(next.nth(1)).not.toHaveClass(/\bon\b/); await expect(next.nth(1)).toContainText('Side path');
    const styles = await next.evaluateAll((els) => els.map((e) => { const c = getComputedStyle(e); return `${c.backgroundColor}|${c.borderStyle}`; }));
    expect(styles[0], 'main and side Next buttons look different').not.toBe(styles[1]);
    await expect(back.first()).toHaveAttribute('data-edge', 'LAP__PZ');
    const boxes = await page.locator('[data-testid=chain-nav] .tbtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height })));
    for (const b of boxes) { expect(b.h).toBeGreaterThanOrEqual(44); expect(b.w).toBeGreaterThanOrEqual(44); expect(b.r).toBeLessThanOrEqual(390); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], c = boxes[j]; expect(a.r <= c.l + 0.5 || c.r <= a.l + 0.5 || a.b <= c.t + 0.5 || c.b <= a.t + 0.5, `buttons ${i} and ${j} overlap`).toBe(true); }
    await next.first().click();
    await expect(page.getByTestId('edge-why')).toContainText('Still open');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'STATE'));
  });

  test('Back from "Will it settle?" goes first to the line you actually came through (side path), else the main chain', async ({ page }) => {
    await open(page, 'linear-systems');
    // arrive by the side path PZ → STAB
    await page.locator('[data-testid=map-node][data-node="PZ"]').dispatchEvent('click');
    await page.locator('[data-testid=chain-next][data-path=side]').click();
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'STAB'));
    await expect(page.getByTestId('chain-back').first()).toHaveAttribute('data-edge', 'PZ__STAB');
    await expect(page.getByTestId('pop-question')).toHaveAttribute('data-edge', 'PZ__STAB');
    // go on to box 13 and come back: STAB still remembers the side path it was reached by
    await page.locator('[data-testid=chain-next][data-to=INOUT]').click(); await page.getByTestId('edge-next').click();
    await page.getByTestId('chain-back').first().click(); await page.getByTestId('edge-back').click();
    await expect(heading(page)).toHaveText(await labelOf(page, 'STAB'));
    await expect(page.getByTestId('chain-back').first()).toHaveAttribute('data-edge', 'PZ__STAB');
    // tapped directly on the map: no path walked, so Back falls back to the main chain (box 11)
    await page.getByTestId('panel-close').click();
    await page.locator('[data-testid=map-node][data-node="STAB"]').dispatchEvent('click');
    await expect(page.getByTestId('chain-back').first()).toHaveAttribute('data-edge', 'MODES__STAB');
  });

  test('every Full-detail end box has one Back and one "Return to the main chain"', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('button[role=tab][data-map="full"]').first().click();
    const ends = await page.evaluate(() => { const c = (window as any).__study.content; const big = new Set(c.maps[0].nodes.map((n: any) => n.id)); const m = c.maps[1]; return m.nodes.filter((n: any) => !big.has(n.id) && !m.edges.some((e: any) => e.from === n.id && !e.dashed)).map((n: any) => n.id); });
    expect(ends.length).toBe(13);
    for (const id of ends) {
      await page.locator(`[data-testid=map-node][data-node="${id}"]`).first().dispatchEvent('click');
      // one set only: the chain buttons (no second text row of Back · Return)
      await expect(page.getByTestId('pop-end'), `${id} no second end row`).toHaveCount(0);
      await expect(page.getByTestId('chain-back'), `${id} one Back`).toHaveCount(1);
      await expect(page.getByTestId('chain-main'), `${id} main-chain button`).toContainText('Return to the main chain');
      await expect(page.getByTestId('chain-main')).toHaveCount(1);
    }
    // INV hangs under Laplace (box 8): Return opens that box
    await page.locator('[data-testid=map-node][data-node="INV"]').first().dispatchEvent('click');
    await page.getByTestId('chain-main').click();
    await expect(heading(page)).toHaveText(await labelOf(page, 'LAP'));
  });

  test("Full detail: box 13's next questions run controllability, observability, PBH, then the Gramian", async ({ page }) => {
    await open(page, 'linear-systems');
    await page.locator('button[role=tab][data-map="full"]').first().click();
    await page.locator('[data-testid=map-node][data-node="INOUT"]').first().dispatchEvent('click');
    const to = await page.getByTestId('pop-next-link').evaluateAll((els) => els.map((e) => e.getAttribute('data-to')));
    expect(to.filter((x) => x !== 'WORK')).toEqual(['CO', 'OBS', 'PBH', 'GRAM']);
  });

  test('review progress counts unique boxes: a box on both maps counts once, seen on either is seen', async ({ page }) => {
    await open(page, 'linear-systems');
    const total = await page.evaluate(() => new Set((window as any).__study.content.maps.flatMap((m: any) => m.nodes.map((n: any) => n.id))).size);
    await page.locator('[data-testid=map-node][data-node="LIN"]').dispatchEvent('click');
    await page.locator('button[data-mode=review]').first().click();
    const sum = page.locator('.cm-sum').first();
    await expect(sum).toContainText(`${total} different boxes`);
    await expect(sum).toContainText(`${total - 1} unseen`);
    await expect(sum).toContainText('1 seen');
    await page.locator('button[role=tab][data-map="full"]').first().click();
    await expect(page.locator('[data-testid=map-node][data-node="LIN"]').first()).toHaveAttribute('data-status', 'seen');
  });

  test("the quiz opens on an easy foundational question (box 1's quick check), not the eigenbasis one", async ({ page }) => {
    await open(page, 'linear-systems', '#/quiz');
    await expect(page.locator('[data-testid=qcard]').first()).toHaveAttribute('data-qid', 'pop-sys');
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
