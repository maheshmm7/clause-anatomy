import { expect, test } from '@playwright/test';
import {
  chooseEnglish,
  expectAccessible,
  expectNoHorizontalScroll,
  openRentalExample,
  openSection,
} from './support';

test.describe('reader journey', () => {
  test('landing page offers languages in their own scripts and is accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /हिन्दी/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /తెలుగు/ })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('rent agreement example: every dashboard section works and is accessible', async ({
    page,
  }) => {
    // Eight full WCAG scans in one journey.
    test.setTimeout(90_000);
    await chooseEnglish(page);
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

  test('compares two example papers side by side', async ({ page }) => {
    await chooseEnglish(page);
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
    await page.getByRole('button', { name: 'English' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Try an example/ }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Hyderabad/ }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeFocused();

    // Command palette: Ctrl+K, type, Enter.
    await page.keyboard.press('Control+K');
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
    await chooseEnglish(page);
    await expectAccessible(page);
    await openRentalExample(page);
    await expectAccessible(page);
    await openSection(page, /^Clauses/);
    await expect(page.getByRole('heading', { level: 1, name: 'Clauses' })).toBeVisible();
    await expectAccessible(page);
  });

  test('Telugu interface and explanations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /తెలుగు/ }).click();
    await page.getByRole('button', { name: /ఉదాహరణ చూడండి/ }).click();
    await page.getByRole('button', { name: /హైదరాబాద్/ }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'అద్దె ఒప్పందం (ఫ్లాట్ అద్దెకు తీసుకోవడం)' }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });
});
