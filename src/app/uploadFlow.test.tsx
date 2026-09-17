import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RENTAL_SAMPLE } from '../samples/rental';
import { SettingsProvider } from '../settings/SettingsProvider';
import { expectNoAxeViolations, stubFetch, type FakeRoute } from '../test/helpers';
import type * as Readers from '../features/input/readers';
import { App } from './App';

const readDocumentFile = vi.hoisted(() => vi.fn());

vi.mock('../features/input/readers', async (importOriginal) => ({
  ...(await importOriginal<typeof Readers>()),
  readDocumentFile,
}));

const PHOTO = {
  kind: 'visual',
  mimeType: 'image/jpeg',
  data: '/9j/4AAQSkZJRgABAQ==',
  previewUrl: null,
  fileName: 'page.jpg',
};

async function renderApp(routes: Record<string, FakeRoute | FakeRoute[]>) {
  const fetch = stubFetch({
    '/api/health': { body: { status: 'ok', aiAvailable: true } },
    ...routes,
  });
  window.localStorage.setItem('clause-anatomy:uiLanguage', 'en');
  window.history.replaceState(null, '', '#/workspace');
  render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  );
  return { ...fetch, user: userEvent.setup() };
}

async function uploadPhoto(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('button', { name: /Take a photo/ });
  await user.upload(
    screen.getByLabelText('Take a photo', { selector: 'input' }),
    new File(['x'], 'page.jpg', { type: 'image/jpeg' }),
  );
}

describe('photo upload flow', { timeout: 20_000 }, () => {
  beforeEach(() => {
    readDocumentFile.mockReset();
  });

  it('asks for consent, transcribes, redacts and explains', async () => {
    readDocumentFile.mockResolvedValue(PHOTO);
    const { user, calls } = await renderApp({
      '/api/extract': { body: { quality: 'partial', text: `${RENTAL_SAMPLE.text}\n[UNREADABLE]` } },
      '/api/analyze': { body: RENTAL_SAMPLE.analyses.en },
    });

    await uploadPhoto(user);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Before we read your photo/ }),
    ).toBeVisible();
    expect(screen.getByText('Selected: page.jpg')).toBeVisible();
    await expectNoAxeViolations(document.body);

    await user.click(screen.getByRole('button', { name: /OK, read it/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeVisible();
    expect(screen.getByText(/Some parts of the page were hard to read/)).toBeVisible();
    expect(calls.find((call) => call.path === '/api/extract')?.body).toEqual({
      mimeType: 'image/jpeg',
      data: PHOTO.data,
    });
    expect(JSON.stringify(calls.find((call) => call.path === '/api/analyze')?.body)).not.toContain(
      '98480',
    );
  });

  it('lets the reader cancel before anything is sent', async () => {
    readDocumentFile.mockResolvedValue(PHOTO);
    const { user, calls } = await renderApp({});
    await uploadPhoto(user);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Read the fine print. Understand every clause.',
      }),
    ).toBeVisible();
    expect(calls.some((call) => call.path === '/api/extract')).toBe(false);
  });

  it('explains how to retake an unreadable photo', async () => {
    readDocumentFile.mockResolvedValue(PHOTO);
    const { user } = await renderApp({
      '/api/extract': { body: { quality: 'unreadable', text: '' } },
    });
    await uploadPhoto(user);
    await user.click(await screen.findByRole('button', { name: /OK, read it/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Take the photo again in good light',
    );
  });

  it('shows file reading problems in plain words', async () => {
    const { ReadError } = await import('../features/input/readers');
    readDocumentFile.mockRejectedValue(new ReadError('error_fileTooLarge'));
    const { user } = await renderApp({});
    await screen.findByRole('button', { name: /Upload a file/ });
    await user.upload(
      screen.getByLabelText('Upload a file', { selector: 'input' }),
      new File(['x'], 'big.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is too big');
  });

  it('analyses text read from a digital PDF, and can be cancelled while working', async () => {
    readDocumentFile.mockResolvedValue({ kind: 'text', text: RENTAL_SAMPLE.text });
    let release: (() => void) | undefined;
    const { user } = await renderApp({ '/api/analyze': { body: RENTAL_SAMPLE.analyses.en } });
    const fetchMock = vi.mocked(fetch);
    const original = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input) === '/api/analyze') {
        await new Promise<void>((resolve) => {
          release = resolve;
          init?.signal?.addEventListener('abort', () => resolve());
        });
        if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      }
      return original!(input, init);
    });

    await screen.findByRole('button', { name: /Upload a file/ });
    await user.upload(
      screen.getByLabelText('Upload a file', { selector: 'input' }),
      new File(['%PDF-'], 'lease.pdf', { type: 'application/pdf' }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Finding what matters to you…' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Read the fine print. Understand every clause.',
      }),
    ).toBeVisible();
    release?.();
  });
});
