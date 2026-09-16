import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { chooseEnglish, expectNoHorizontalScroll, makeTextPdf } from './support';

const analysis = JSON.parse(
  readFileSync(new URL('./fixtures/rental-analysis.json', import.meta.url), 'utf8'),
) as unknown;

test.describe('document upload in a real browser', () => {
  test('reads a digital PDF on the device, hides personal numbers and explains it', async ({
    page,
  }) => {
    const sent: string[] = [];
    await page.route('**/api/health', (route) =>
      route.fulfill({ json: { status: 'ok', aiAvailable: true } }),
    );
    await page.route('**/api/analyze', async (route) => {
      sent.push(route.request().postData() ?? '');
      await route.fulfill({ json: analysis });
    });

    await chooseEnglish(page);
    const pdf = makeTextPdf([
      'RESIDENTIAL RENTAL AGREEMENT',
      'Lessee mobile: 98765 43210, PAN: ABCDE1234F',
      'The Lessee shall pay a monthly rent of Rs. 22,000 on or before the 5th day of every month.',
    ]);
    await page
      .getByLabel('Upload a file', { exact: true })
      .setInputFiles({ name: 'lease.pdf', mimeType: 'application/pdf', buffer: pdf });

    await expect(
      page.getByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('The Lessee shall pay a monthly rent');
    expect(sent[0]).toContain('[PHONE HIDDEN]');
    expect(sent[0]).not.toMatch(/98765|ABCDE1234F/);
    await expectNoHorizontalScroll(page);
  });

  test('asks for consent before a photo leaves the device', async ({ page }) => {
    let extractCalls = 0;
    await page.route('**/api/health', (route) =>
      route.fulfill({ json: { status: 'ok', aiAvailable: true } }),
    );
    await page.route('**/api/extract', (route) => {
      extractCalls += 1;
      return route.fulfill({ json: { quality: 'unreadable', text: '' } });
    });
    await chooseEnglish(page);

    // A tiny valid PNG, drawn and compressed by the browser before upload.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await page
      .getByLabel('Take a photo', { exact: true })
      .setInputFiles({ name: 'page.png', mimeType: 'image/png', buffer: png });

    await expect(
      page.getByRole('heading', { level: 1, name: /Before we read your photo/ }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: 'Preview of the page you selected' })).toBeVisible();
    expect(extractCalls).toBe(0);

    await page.getByRole('button', { name: /OK, read it/ }).click();
    await expect(page.getByRole('alert')).toContainText('Take the photo again in good light');
    expect(extractCalls).toBe(1);
  });
});

test.describe('production server security', () => {
  test('serves the app with strict security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(response.status()).toBe(200);
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('never caches API answers and rejects bad input safely', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.headers()['cache-control']).toBe('no-store');

    const bad = await request.post('/api/analyze', {
      data: { text: '<script>alert(1)</script>', language: 'en', admin: true },
    });
    expect(bad.status()).toBe(400);
    expect(await bad.json()).toEqual({
      error: { code: 'invalid_input', message: expect.any(String) },
    });

    const missingAi = await request.post('/api/analyze', {
      data: { text: 'The Lessee shall pay a monthly rent of Rs. 22,000.', language: 'en' },
    });
    expect(missingAi.status()).toBe(503);

    const unknown = await request.get('/api/../../etc/passwd');
    expect([200, 404]).toContain(unknown.status());
    expect(await unknown.text()).not.toContain('root:');
  });

  test('loads the heavy PDF reader only when a PDF is chosen', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scripts.push(req.url());
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: /Try an example/ })).toBeVisible();
    expect(scripts.some((url) => /pdf[.-]/.test(url))).toBe(false);
  });
});
