import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './support';

/**
 * WCAG 1.4.10 Reflow and 1.4.4 Resize text: at 320 CSS pixels wide, with the largest
 * text size and the longest scripts, every page and every section must still fit
 * without scrolling sideways.
 */
const PAGES = ['/', '/privacy', '/terms', '/disclaimer', '/accessibility'];
const SECTIONS = ['clauses', 'document', 'risks', 'whatif', 'ask', 'glossary', 'plan', 'compare'];

for (const language of ['en', 'hi', 'te']) {
  test(`reflows at 320px with the largest text in ${language}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Sets its own 320px viewport; run once');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.addInitScript((lang) => {
      window.localStorage.setItem('clause-anatomy:uiLanguage', lang);
      window.localStorage.setItem('clause-anatomy:textSize', 'xlarge');
    }, language);

    for (const path of PAGES) {
      await page.goto(`/#${path}`);
      await expect(page.locator('main h1')).toBeVisible();
      await expectNoHorizontalScroll(page);
    }

    await page.goto('/#/workspace');
    await expect(page.locator('main h1')).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Open the first example, then visit every section of the workspace.
    await page.locator('.intake').last().click();
    await page.locator('.sample-row').first().click();
    await expect(page.locator('.kpis')).toBeVisible();
    await expectNoHorizontalScroll(page);
    for (const section of SECTIONS) {
      await page.evaluate((view) => {
        window.location.hash = `#/workspace/${view}`;
      }, section);
      await expect(page).toHaveURL(new RegExp(`#/workspace/${section}$`));
      await expect(page.locator('main h1')).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });
}
