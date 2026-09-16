import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Full WCAG 2.2 A/AA scan in a real browser, including colour contrast. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.nodes.length}): ${violation.nodes[0]?.target.join(' ')}`,
  );
  expect(summary).toEqual([]);
}

/** The page must never scroll sideways, at any screen size. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

export async function chooseEnglish(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'What paper do you want to understand?' }),
  ).toBeVisible();
}

export async function openRentalExample(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Try an example/ }).click();
  await page.getByRole('button', { name: /Rent agreement/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
  ).toBeVisible();
}

/**
 * Builds a minimal, valid one-page PDF with a real text layer, so the browser's
 * pdf.js pipeline is tested without committing binary fixtures.
 */
export function makeTextPdf(lines: string[]): Buffer {
  const escape = (text: string): string => text.replace(/[\\()]/g, (char) => `\\${char}`);
  const stream = `BT /F1 11 Tf 50 780 Td 14 TL ${lines.map((line) => `(${escape(line)}) Tj T*`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}
