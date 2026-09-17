import { expect, test } from '@playwright/test';
import {
  openWorkspace,
  expectAccessible,
  expectNoHorizontalScroll,
  openRentalExample,
  openSection,
} from './support';

test.describe('reader journey', () => {
  test('home page introduces the product and leads into the workspace', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Understand any legal paper, clause by clause.',
      }),
    ).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    await page
      .getByRole('link', { name: /Open the workspace/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/workspace$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Read the fine print. Understand every clause.',
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('heading', { level: 1, name: /Understand any legal paper/ }),
    ).toBeVisible();
  });

  test('legal pages are reachable from the footer, readable and accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo')).toContainText(
      `© ${new Date().getFullYear()} Clause Anatomy`,
    );
    for (const name of ['Privacy policy', 'Terms of use', 'Disclaimer', 'Accessibility']) {
      await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
    }
    // A refresh keeps the reader on the same page.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Accessibility' })).toBeVisible();
  });

  test('sidebar toggles at every size and settings live in one dialog', async ({
    page,
    isMobile,
  }) => {
    await openWorkspace(page);
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('dialog', { name: 'Workspace sections' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    } else {
      const rail = page.locator('.app__rail');
      const wide = (await rail.boundingBox())?.width ?? 0;
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
      await expect.poll(async () => (await rail.boundingBox())?.width ?? 0).toBeLessThan(wide / 2);
      await expectAccessible(page);
      await page.reload();
      await page.getByRole('button', { name: 'Expand sidebar' }).click();
      await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
    }

    await page.getByRole('banner').getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('combobox', { name: 'Explain in' }).click();
    await page.getByRole('option', { name: /తెలుగు/ }).click();
    await expect(dialog.getByRole('combobox', { name: 'Explain in' })).toContainText('తెలుగు');
    await dialog.getByRole('radio', { name: /Dark/ }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectAccessible(page);
  });

  test('rent agreement example: every dashboard section works and is accessible', async ({
    page,
  }) => {
    // Eight full WCAG scans in one journey.
    test.setTimeout(90_000);
    await openWorkspace(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // 01 Overview
    await openRentalExample(page);
    await expect(page.getByText(/3 private details/)).toBeVisible();
    await page.getByRole('radio', { name: /Tenant/ }).check();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // 02 Clauses
    await openSection(page, /^Clauses/);
    const firstClause = page.getByRole('article', { name: 'Monthly rent and late fee' });
    await expect(firstClause.getByText('You must')).toBeVisible();
    await firstClause.getByRole('button', { name: 'Yes' }).click();
    await expect(firstClause.getByText('Right! You understood this.')).toBeVisible();
    await firstClause.getByRole('button', { name: 'Ask a lawyer about this' }).click();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // 03 Document, reached from the clause's verified quote
    await firstClause.getByRole('button', { name: /Show in document/ }).click();
    await expect(page.locator('mark#anno-p1')).toContainText('The Lessee shall pay a monthly rent');
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // 04 Risk radar
    await openSection(page, /^Risk radar/);
    await expect(page.getByRole('columnheader', { name: 'Favours the other side' })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // 05 What if
    await openSection(page, /^What if/);
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText(/You can leave when the 2 months' notice ends/)).toBeVisible();
    await expectAccessible(page);

    // 07 Glossary
    await openSection(page, /^Glossary/);
    await expect(page.getByRole('term').first()).toBeVisible();
    await expectAccessible(page);

    // 08 Action plan: the flagged clause is in the lawyer brief
    await openSection(page, /^Action plan/);
    await expect(
      page.getByText('Please explain "Monthly rent and late fee" and what it means for me.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Call 15100/ })).toHaveAttribute(
      'href',
      'tel:15100',
    );
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('keeps the open paper through a refresh and can change its language', async ({ page }) => {
    await openWorkspace(page);
    await openRentalExample(page);
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeVisible();
    await expect(page.getByText(/3 private details/)).toBeVisible();

    // The example has Hindi ready, so no AI call is needed to re-explain it.
    await page.getByRole('combobox', { name: 'Explain in' }).click();
    await page.getByRole('option', { name: /हिन्दी/ }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'किराया समझौता (फ़्लैट किराए पर लेना)' }),
    ).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('compares two example papers side by side', async ({ page }) => {
    await openWorkspace(page);
    await openRentalExample(page);
    await page.getByRole('button', { name: /New paper/ }).click();
    await page.getByRole('button', { name: /Try an example/ }).click();
    await page.getByRole('button', { name: /Bengaluru/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Bengaluru/ })).toBeVisible();

    await openSection(page, /^Compare/);
    await expect(page.getByRole('heading', { level: 1, name: 'Compare papers' })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('₹25,000');
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('works with the keyboard alone', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is a desktop concern');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
    await expect(
      page.getByRole('heading', { level: 1, name: /Understand any legal paper/ }),
    ).toBeVisible();

    await page
      .getByRole('link', { name: /Open the workspace/ })
      .first()
      .focus();
    await page.keyboard.press('Enter');
    const explainIn = page.getByRole('combobox', { name: 'Explain in' });
    await explainIn.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(explainIn).toContainText('हिन्दी');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(explainIn).toContainText('English');

    await page.getByRole('button', { name: /Try an example/ }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Hyderabad/ }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeFocused();

    // Command palette: Ctrl+K, type, Enter.
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('combobox', { name: 'Search the workspace' })).toBeFocused();
    await page.keyboard.type('deposit');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('article', { name: 'Getting your deposit back' })).toBeVisible();

    // J / K move between clauses.
    await page.getByRole('heading', { level: 1, name: 'Clauses' }).focus();
    await page.keyboard.press('j');
    await expect(page.getByText('Clause 4 of 11')).toBeVisible();
    await page.keyboard.press('k');
    await expect(page.getByText('Clause 3 of 11')).toBeVisible();
  });

  test('dark theme keeps every colour pair readable', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openWorkspace(page);
    await expectAccessible(page);
    await openRentalExample(page);
    await expectAccessible(page);
    await openSection(page, /^Clauses/);
    await expect(page.getByRole('heading', { level: 1, name: 'Clauses' })).toBeVisible();
    await expectAccessible(page);
  });

  test('Telugu interface and explanations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'App language' }).click();
    await page.getByRole('option', { name: /తెలుగు/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
    await page.getByRole('button', { name: /ఒక ఉదాహరణ చూడండి/ }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'అద్దె ఒప్పందం (ఫ్లాట్ అద్దెకు తీసుకోవడం)' }),
    ).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });
});
