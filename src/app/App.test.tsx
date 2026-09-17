import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RENTAL_SAMPLE } from '../samples/rental';
import { SettingsProvider } from '../settings/SettingsProvider';
import { expectNoAxeViolations, stubFetch, type FakeRoute } from '../test/helpers';
import { App } from './App';

const NATIVE_NAMES = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' } as const;

/**
 * Renders the app. The landing page shows on every visit; unless `uiLanguage` is null,
 * the helper picks that language there, like a returning reader would.
 */
async function renderApp({
  aiAvailable = false,
  uiLanguage = 'en',
  routes = {},
}: {
  aiAvailable?: boolean;
  uiLanguage?: 'en' | 'hi' | 'te' | null;
  routes?: Record<string, FakeRoute | FakeRoute[]>;
} = {}) {
  if (uiLanguage) window.localStorage.setItem('clause-anatomy:uiLanguage', uiLanguage);
  const fetch = stubFetch({ '/api/health': { body: { status: 'ok', aiAvailable } }, ...routes });
  const view = render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  );
  const user = userEvent.setup();
  if (uiLanguage) {
    await user.click(screen.getByRole('button', { name: new RegExp(NATIVE_NAMES[uiLanguage]) }));
  }
  return { ...view, ...fetch, user };
}

async function openRentalExample(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Try an example/ }));
  await user.click(await screen.findByRole('button', { name: /Rent agreement/ }));
  return screen.findByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' });
}

describe('first visit', () => {
  it('asks for a language in all three scripts and remembers the choice', async () => {
    const { user, container } = await renderApp({ uiLanguage: null });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose your language');
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: /हिन्दी/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'आप कौन-सा कागज़ समझना चाहते हैं?' }),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe('hi');
    expect(window.localStorage.getItem('clause-anatomy:uiLanguage')).toBe('hi');
  });
});

describe('input screen', () => {
  it('explains when live AI is unavailable and keeps examples usable', async () => {
    const { container } = await renderApp({ aiAvailable: false });
    expect(await screen.findByText(/Live explanations are not available/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Take a photo/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Paste text/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Try an example/ })).toBeEnabled();
    expect(screen.getByText(/This app explains papers in simple words/)).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it('redacts personal numbers before sending pasted text to the API', async () => {
    const { user, calls } = await renderApp({
      aiAvailable: true,
      routes: { '/api/analyze': { body: RENTAL_SAMPLE.analyses.en } },
    });
    await user.click(await screen.findByRole('button', { name: /Paste text/ }));
    await user.click(screen.getByLabelText('Paste the words of your paper here'));
    await user.paste(
      'The Lessee (mobile 9876543210, PAN ABCDE1234F) shall pay rent of Rs. 22,000 by the 5th.',
    );
    await user.click(screen.getByRole('button', { name: /Explain this paper/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeVisible();
    const request = calls.find((call) => call.path === '/api/analyze');
    expect(JSON.stringify(request?.body)).not.toMatch(/9876543210|ABCDE1234F/);
    expect(request?.body).toMatchObject({
      language: 'en',
      text: expect.stringContaining('[PHONE HIDDEN]'),
    });
    expect(screen.getByText(/2 private details/)).toBeVisible();
  });

  it('shows a clear message when the paper is too short', async () => {
    const { user } = await renderApp({ aiAvailable: true });
    await user.click(await screen.findByRole('button', { name: /Paste text/ }));
    await user.type(screen.getByLabelText('Paste the words of your paper here'), 'Too short');
    await user.click(screen.getByRole('button', { name: /Explain this paper/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is too little text to explain',
    );
  });

  it('shows a friendly error when the AI is busy', async () => {
    const { user } = await renderApp({
      aiAvailable: true,
      routes: {
        '/api/analyze': { status: 503, body: { error: { code: 'ai_busy', message: 'busy' } } },
      },
    });
    await user.click(await screen.findByRole('button', { name: /Paste text/ }));
    await user.click(screen.getByLabelText('Paste the words of your paper here'));
    await user.paste('The Lessee shall pay a monthly rent of Rs. 22,000 on or before the 5th day.');
    await user.click(screen.getByRole('button', { name: /Explain this paper/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The AI is busy');
  });
});

describe('result journey with the rent agreement example', () => {
  it('explains, checks understanding and prepares next steps', async () => {
    const { user, container } = await renderApp();
    await openRentalExample(user);
    await expectNoAxeViolations(container);

    // Private numbers in the example were hidden.
    expect(screen.getByText(/3 private details/)).toBeVisible();

    // Perspective relabels the anatomy for the reader.
    await user.click(screen.getByRole('radio', { name: /Tenant/ }));
    const firstPoint = screen.getByRole('article', { name: 'Monthly rent and late fee' });
    expect(within(firstPoint).getByText('You must')).toBeVisible();
    expect(within(firstPoint).getByText('Found in your paper')).toBeVisible();

    // Teach-back: "Not sure" re-explains simply and adds a lawyer question.
    await user.click(within(firstPoint).getByRole('button', { name: 'Not sure' }));
    expect(within(firstPoint).getByText("That's okay. Here it is again, simply:")).toBeVisible();

    // One point at a time on small screens.
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Point 2 of 11')).toBeVisible();

    // Tabs follow the WAI-ARIA keyboard pattern.
    const pointsTab = screen.getByRole('tab', { name: /Key points/ });
    pointsTab.focus();
    await user.keyboard('{ArrowRight}');
    const whatIfTab = screen.getByRole('tab', { name: /What if/ });
    expect(whatIfTab).toHaveAttribute('aria-selected', 'true');
    expect(whatIfTab).toHaveFocus();

    // What-if simulator walks the tree deterministically.
    expect(await screen.findByText('Have you already stayed more than 6 months?')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(await screen.findByText(/You are still in the 6-month lock-in period/)).toBeVisible();
    expect(screen.getByText('Risky')).toBeVisible();
    await expectNoAxeViolations(container);

    // Next steps: personal checklist and the lawyer brief with the unsure point.
    await user.click(screen.getByRole('tab', { name: /Next steps/ }));
    expect(await screen.findByText('What you must do')).toBeVisible();
    expect(
      screen.getByText(
        'I did not understand "Monthly rent and late fee". What does it mean for me?',
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Call 15100/ })).toHaveAttribute('href', 'tel:15100');
    await expectNoAxeViolations(container);

    // Original text is shown with private numbers hidden.
    await user.click(screen.getByRole('tab', { name: /Original/ }));
    expect(await screen.findByText(/\[PHONE HIDDEN\]/)).toBeVisible();

    // Start over returns to the input screen.
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'What paper do you want to understand?',
      }),
    ).toBeVisible();
  });

  it('answers questions about the paper with verified quotes', async () => {
    const { user, calls } = await renderApp({
      aiAvailable: true,
      routes: {
        '/api/ask': {
          body: {
            basis: 'document',
            answer: 'Only with written permission first.',
            quotes: [{ text: 'without the prior written consent of the Lessor', verified: true }],
          },
        },
      },
    });
    await openRentalExample(user);
    await user.click(screen.getByRole('tab', { name: /Ask/ }));
    await user.type(
      await screen.findByLabelText('Ask about your paper'),
      'Can my friend stay with me?',
    );
    await user.click(screen.getByRole('button', { name: /^Ask$/ }));

    expect(await screen.findByText('Only with written permission first.')).toBeVisible();
    expect(screen.getByText('Answered from your paper')).toBeVisible();
    const request = calls.find((call) => call.path === '/api/ask');
    expect(request?.body).toMatchObject({
      question: 'Can my friend stay with me?',
      language: 'en',
    });
    expect(JSON.stringify(request?.body)).not.toContain('98480');
  });

  it('shows the example in Telugu without needing live AI', async () => {
    const { user } = await renderApp({ uiLanguage: 'te' });
    await user.click(screen.getByRole('button', { name: /ఉదాహరణ చూడండి/ }));
    await user.click(await screen.findByRole('button', { name: /అద్దె ఒప్పందం/ }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'అద్దె ఒప్పందం (ఫ్లాట్ అద్దెకు తీసుకోవడం)',
      }),
    ).toBeVisible();
    await waitFor(() => expect(document.documentElement.lang).toBe('te'));
  });

  it('falls back to English for an example without a translation when AI is offline', async () => {
    const { user } = await renderApp({ uiLanguage: 'hi' });
    await user.click(screen.getByRole('button', { name: /उदाहरण देखें/ }));
    await user.click(await screen.findByRole('button', { name: /बाउंस चेक/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Legal notice for a bounced cheque' }),
    ).toBeVisible();
    expect(screen.getByText(/यह उदाहरण अंग्रेज़ी में दिखाया गया है/)).toBeVisible();
    expect(screen.getByText('इस कागज़ में समय-सीमा है')).toBeVisible();
    expect(screen.getByText('वे आपसे क्या चाहते हैं')).toBeVisible();
  });
});

describe('navigation and language', () => {
  it('shows the landing page on every visit, marking the last used language', async () => {
    window.localStorage.setItem('clause-anatomy:uiLanguage', 'te');
    const { user } = await renderApp({ uiLanguage: null });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose your language');
    expect(screen.getByRole('button', { name: /తెలుగు/ })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: /English/ }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'What paper do you want to understand?',
      }),
    ).toBeVisible();
  });

  it('switches language from a readable header menu, with keyboard support', async () => {
    const { user, container } = await renderApp();
    const menuButton = screen.getByRole('button', { name: /App language/ });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const menu = within(screen.getByRole('list', { name: 'App language' }));
    const current = menu.getByRole('button', { name: /English/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(current).toHaveFocus();
    await expectNoAxeViolations(container);

    await user.keyboard('{ArrowDown}');
    expect(menu.getByRole('button', { name: /हिन्दी/ })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();

    await user.click(menuButton);
    await user.click(
      within(screen.getByRole('list', { name: 'App language' })).getByRole('button', {
        name: /తెలుగు/,
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /మీరు ఏ కాగితాన్ని/ }),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe('te');
  });

  it('returns to the landing page from the header and keeps the current result', async () => {
    const { user } = await renderApp();
    await openRentalExample(user);
    expect(document.title).toBe('Rent agreement (renting a flat) · Clause Anatomy');

    await user.click(screen.getByRole('button', { name: /App language/ }));
    await user.click(screen.getByRole('button', { name: 'Open language page' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose your language');

    await user.click(screen.getByRole('button', { name: /हिन्दी/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' }),
    ).toBeVisible();
    // The paper stays explained in English, and the app says so.
    expect(screen.getByText(/यह कागज़ English में समझाया गया है/)).toBeVisible();
  });

  it('supports the browser back button: result → start → language page', async () => {
    const { user } = await renderApp();
    await openRentalExample(user);

    window.history.back();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'What paper do you want to understand?',
      }),
    ).toBeVisible();

    window.history.back();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose your language'),
    );
  });

  it('the brand in the header also leads to the landing page', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: /Clause Anatomy/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose your language');
  });
});
