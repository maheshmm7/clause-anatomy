import { expect, test } from '@playwright/test';
import {
  chooseEnglish,
  expectAccessible,
  expectNoHorizontalScroll,
  openRentalExample,
} from './support';

test.describe('reader journey', () => {
  test('first screen offers languages in their own scripts and is accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /हिन्दी/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /తెలుగు/ })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('rent agreement example: explain, check understanding, simulate and plan', async ({
    page,
  }) => {
    await chooseEnglish(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    await openRentalExample(page);
    await expect(page.getByText(/3 private details/)).toBeVisible();
    await page.getByRole('radio', { name: /Tenant/ }).check();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    const firstPoint = page.getByRole('article', { name: 'Monthly rent and late fee' });
    await expect(firstPoint.getByText('You must')).toBeVisible();
    await firstPoint.getByRole('button', { name: 'Yes' }).click();
    await expect(firstPoint.getByText('Right! You understood this.')).toBeVisible();

    await page.getByRole('tab', { name: /What if/ }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText(/You can leave when the 2 months' notice ends/)).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('tab', { name: /Next steps/ }).click();
    await expect(page.getByRole('heading', { name: /Questions for a lawyer/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Call 15100/ })).toHaveAttribute(
      'href',
      'tel:15100',
    );
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    await page.getByRole('tab', { name: /Key points/ }).click();
    await page
      .getByRole('button', { name: /Show in original/ })
      .first()
      .click();
    await expect(page.locator('mark')).toContainText('The Lessee shall pay a monthly rent');
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
    await page.getByRole('button', { name: /Rent agreement/ }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeFocused();

    await page.getByRole('tab', { name: /Key points/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /What if/ })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Original/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('dark mode keeps every colour pair readable', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await chooseEnglish(page);
    await openRentalExample(page);
    await expectAccessible(page);
  });

  test('Telugu interface and explanations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /తెలుగు/ }).click();
    await page.getByRole('button', { name: /ఉదాహరణ చూడండి/ }).click();
    await page.getByRole('button', { name: /అద్దె ఒప్పందం/ }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'అద్దె ఒప్పందం (ఫ్లాట్ అద్దెకు తీసుకోవడం)' }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });
});
