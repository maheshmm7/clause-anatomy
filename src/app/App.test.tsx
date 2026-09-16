import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RENTAL_SAMPLE } from '../samples/rental';
import { SettingsProvider } from '../settings/SettingsProvider';
import { expectNoAxeViolations, stubFetch, type FakeRoute } from '../test/helpers';
import { App } from './App';

function renderApp({
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
  return { ...view, ...fetch, user: userEvent.setup() };
}

async function openRentalExample(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Try an example/ }));
  await user.click(await screen.findByRole('button', { name: /Rent agreement/ }));
  return screen.findByRole('heading', { level: 1, name: 'Rent agreement (renting a flat)' });
}

describe('first visit', () => {
  it('asks for a language in all three scripts and remembers the choice', async () => {
    const { user, container } = renderApp({ uiLanguage: null });
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
    const { container } = renderApp({ aiAvailable: false });
    expect(await screen.findByText(/Live explanations are not available/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Take a photo/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Paste text/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Try an example/ })).toBeEnabled();
    expect(screen.getByText(/This app explains papers in simple words/)).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it('redacts personal numbers before sending pasted text to the API', async () => {
    const { user, calls } = renderApp({
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
    const { user } = renderApp({ aiAvailable: true });
    await user.click(await screen.findByRole('button', { name: /Paste text/ }));
    await user.type(screen.getByLabelText('Paste the words of your paper here'), 'Too short');
    await user.click(screen.getByRole('button', { name: /Explain this paper/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is too little text to explain',
    );
  });

  it('shows a friendly error when the AI is busy', async () => {
    const { user } = renderApp({
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
    const { user, container } = renderApp();
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
    const { user, calls } = renderApp({
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
    const { user } = renderApp({ uiLanguage: 'te' });
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
    const { user } = renderApp({ uiLanguage: 'hi' });
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
