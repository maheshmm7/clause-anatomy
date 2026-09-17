import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RENTAL_SAMPLE } from '../samples/rental';
import { SettingsProvider } from '../settings/SettingsProvider';
import { expectNoAxeViolations, stubFetch, type FakeRoute } from '../test/helpers';
import { te } from '../i18n/messages/te';
import { App } from './App';

const NATIVE_NAMES = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' } as const;
const RENTAL_TITLE = 'Rent agreement (renting a flat)';

type User = ReturnType<typeof userEvent.setup>;

/** Renders the app and, unless `uiLanguage` is null, picks it on the landing page. */
async function renderApp({
  aiAvailable = false,
  uiLanguage = 'en',
  routes = {},
}: {
  aiAvailable?: boolean;
  uiLanguage?: 'en' | 'hi' | 'te' | null;
  routes?: Record<string, FakeRoute | FakeRoute[]>;
} = {}) {
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

const sections = () => within(screen.getByRole('navigation', { name: 'Workspace sections' }));

async function goTo(user: User, label: RegExp, heading: string | RegExp) {
  await user.click(sections().getByRole('button', { name: label }));
  return screen.findByRole('heading', { level: 1, name: heading });
}

async function openExample(user: User, name: RegExp = /Hyderabad/) {
  await user.click(await screen.findByRole('button', { name: /Try an example/ }));
  await user.click(await screen.findByRole('button', { name }));
}

async function openRentalExample(user: User) {
  await openExample(user);
  return screen.findByRole('heading', { level: 1, name: RENTAL_TITLE });
}

describe('landing page', () => {
  it('asks for a language in all three scripts and remembers the choice', async () => {
    const { user, container } = await renderApp({ uiLanguage: null });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose your language');
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: /हिन्दी/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'बारीक लिखावट पढ़ें। हर धारा समझें।' }),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe('hi');
    expect(window.localStorage.getItem('clause-anatomy:uiLanguage')).toBe('hi');
  });

  it('can be reopened from the workspace and marks the current language', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: /Language page/ }));
    expect(screen.getByRole('button', { name: /English/ })).toHaveAttribute('aria-current', 'true');

    await user.click(screen.getByRole('button', { name: /తెలుగు/ }));
    expect(document.documentElement.lang).toBe('te');
    expect(await screen.findByRole('navigation', { name: te.navMainLabel })).toBeVisible();
  });

  it('goes back to the landing page with the browser Back button', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { level: 1, name: /Read the fine print/ })).toBeVisible();
    window.history.back();
    expect(
      await screen.findByRole('heading', { level: 1, name: /Choose your language/ }),
    ).toBeVisible();
  });
});

describe('workspace home', () => {
  it('explains when live AI is unavailable and keeps examples usable', async () => {
    const { container } = await renderApp({ aiAvailable: false });
    expect(await screen.findByText(/Live explanations are not available/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Take a photo/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Paste text/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Try an example/ })).toBeEnabled();
    expect(sections().getByRole('button', { name: /^Clauses/ })).toBeDisabled();
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

    expect(await screen.findByRole('heading', { level: 1, name: RENTAL_TITLE })).toBeVisible();
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

  it('applies display settings to the whole page', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('radio', { name: 'Large text' }));
    expect(document.documentElement.dataset.textSize).toBe('large');
    await user.click(screen.getByRole('radio', { name: 'Auto' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

// Whole journeys with axe scans: slower than unit tests, especially under coverage.
describe('dashboard journey with the rent agreement example', { timeout: 30_000 }, () => {
  it('shows the overview dashboard and relabels everything for the reader', async () => {
    const { user, container } = await renderApp();
    await openRentalExample(user);
    await expectNoAxeViolations(container);

    expect(screen.getByText(/3 private details/)).toBeVisible();
    expect(screen.getByText('11/11 checked')).toBeVisible();
    const risks = screen.getByRole('region', { name: 'Check these first' });
    expect(within(risks).getAllByRole('button')).toHaveLength(5);

    await user.click(screen.getByRole('radio', { name: /Tenant/ }));
    expect(screen.getByText('Favours you')).toBeVisible();

    await user.click(within(risks).getByRole('button', { name: /The first 6 months are locked/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Clauses' })).toBeVisible();
    expect(screen.getByRole('article', { name: 'The first 6 months are locked' })).toBeVisible();
  });

  it('works through clauses: anatomy, teach-back, notes, flags and filters', async () => {
    const { user, container } = await renderApp();
    await openRentalExample(user);
    await user.click(screen.getByRole('radio', { name: /Tenant/ }));
    await goTo(user, /^Clauses/, 'Clauses');
    await expectNoAxeViolations(container);

    const first = screen.getByRole('article', { name: 'Monthly rent and late fee' });
    expect(within(first).getByText('You must')).toBeVisible();
    expect(within(first).getByText('Found in your paper')).toBeVisible();

    await user.click(within(first).getByRole('button', { name: 'calendar month' }));
    expect(within(first).getByText('From your paper')).toBeVisible();

    await user.click(within(first).getByRole('button', { name: 'Not sure' }));
    expect(within(first).getByText("That's okay. Here it is again, simply:")).toBeVisible();

    await user.type(
      within(first).getByLabelText('My notes on this clause'),
      'Is there a grace period?',
    );
    const flag = within(first).getByRole('button', { name: 'Ask a lawyer about this' });
    await user.click(flag);
    expect(flag).toHaveAttribute('aria-pressed', 'true');
    expect(within(first).getByText('Flagged for a lawyer')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Clause 2 of 11')).toBeVisible();
    await user.keyboard('j');
    expect(screen.getByText('Clause 3 of 11')).toBeVisible();
    await user.keyboard('k');
    expect(screen.getByText('Clause 2 of 11')).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Flagged' }));
    const jump = screen.getByRole('combobox', { name: 'Jump to clause' });
    expect(within(jump).getAllByRole('option')).toHaveLength(1);
    await user.click(screen.getByRole('radio', { name: 'Not understood' }));
    expect(
      within(screen.getByRole('combobox', { name: 'Jump to clause' })).getByRole('option'),
    ).toHaveTextContent('Monthly rent and late fee');
    await user.type(screen.getByRole('searchbox', { name: 'Search clauses' }), 'zzzz');
    expect(screen.getByText('No clauses match.')).toBeVisible();

    // Notes and flags go into the lawyer brief.
    await goTo(user, /^Action plan/, 'Action plan');
    expect(
      screen.getByText('About "Monthly rent and late fee": Is there a grace period?'),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it('links clauses and the annotated document both ways', async () => {
    const { user, container } = await renderApp();
    await openRentalExample(user);
    await goTo(user, /^Clauses/, 'Clauses');
    const first = screen.getByRole('article', { name: 'Monthly rent and late fee' });
    await user.click(within(first).getByRole('button', { name: /Show in document/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your paper (private numbers hidden)' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: /^Clause \d+: Monthly rent and late fee$/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: /^Clause \d+: Landlord visits$/ }));
    await user.click(screen.getByRole('button', { name: /Open clause/ }));
    expect(await screen.findByRole('article', { name: 'Landlord visits' })).toBeVisible();
  });

  it('maps risks, simulates situations and explains legal words', async () => {
    const { user, container } = await renderApp();
    await openRentalExample(user);

    await goTo(user, /^Risk radar/, 'Risk radar');
    const matrix = screen.getByRole('table', { name: 'Risk radar' });
    expect(within(matrix).getByRole('columnheader', { name: 'Favours Landlord' })).toBeVisible();
    await user.click(screen.getByRole('radio', { name: /Tenant/ }));
    expect(
      within(matrix).getByRole('columnheader', { name: 'Favours the other side' }),
    ).toBeVisible();
    expect(screen.getByRole('region', { name: 'What can go wrong' })).toBeVisible();
    await expectNoAxeViolations(container);

    await goTo(user, /^What if/, 'What if?');
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(screen.getByRole('heading', { name: 'What the paper says happens' })).toBeVisible();
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole('button', { name: /Start again/ }));
    expect(screen.getByRole('button', { name: 'No' })).toBeVisible();

    await goTo(user, /^Glossary/, 'Glossary');
    const terms = screen.getAllByRole('term');
    expect(terms.length).toBeGreaterThan(3);
    await user.type(screen.getByRole('searchbox', { name: 'Search words' }), 'calendar');
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['calendar month']);
    await expectNoAxeViolations(container);
  });

  it('answers questions about a clause with quotes from the paper', async () => {
    const { user, calls, container } = await renderApp({
      aiAvailable: true,
      routes: {
        '/api/ask': {
          body: {
            basis: 'document',
            answer: 'You pay Rs. 200 extra for every late day.',
            quotes: [{ text: 'A late fee of Rs. 200 per day', verified: true }],
          },
        },
      },
    });
    await openRentalExample(user);
    await goTo(user, /^Clauses/, 'Clauses');
    await user.click(screen.getByRole('button', { name: /Ask about this clause/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ask about your paper' }),
    ).toBeVisible();
    const box = screen.getByRole('textbox', { name: 'Ask about your paper' });
    expect(box).toHaveValue('What does "Monthly rent and late fee" mean for me?');
    await user.click(within(box.closest('form')!).getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText('You pay Rs. 200 extra for every late day.')).toBeVisible();
    expect(screen.getByText('Answered from your paper')).toBeVisible();
    expect(calls.find((call) => call.path === '/api/ask')?.body).toMatchObject({
      question: 'What does "Monthly rent and late fee" mean for me?',
      language: 'en',
    });
    await expectNoAxeViolations(container);
  });

  it('keeps several papers in the library and compares two of them', async () => {
    const { user, container } = await renderApp();
    await openRentalExample(user);
    expect(sections().getByRole('button', { name: /^Compare/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /New paper/ }));
    await openExample(user, /Bengaluru/);
    await screen.findByRole('heading', { level: 1, name: /Bengaluru/ });

    await goTo(user, /^Compare/, 'Compare papers');
    expect(screen.getByRole('region', { name: 'Similar clauses side by side' })).toBeVisible();
    expect(screen.getByRole('table')).toHaveTextContent('₹22,000');
    await expectNoAxeViolations(container);

    await user.click(sections().getByRole('button', { name: /^Workspace/ }));
    const library = screen.getByRole('region', { name: 'Your papers in this session' });
    expect(within(library).getAllByRole('button', { name: 'Open' })).toHaveLength(2);
    await user.click(within(library).getAllByRole('button', { name: /^Remove/ })[0]!);
    expect(within(library).getAllByRole('button', { name: 'Open' })).toHaveLength(1);
  });

  it('finds clauses from anywhere with the command palette', async () => {
    const { user } = await renderApp();
    await openRentalExample(user);

    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog', { name: 'Search the workspace' });
    await user.keyboard('deposit');
    expect(
      within(dialog).getByRole('option', { name: /Getting your deposit back/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations(dialog);
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('article', { name: 'Getting your deposit back' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Search/ }));
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the menu drawer on small screens and closes it after choosing', async () => {
    const { user } = await renderApp();
    await openRentalExample(user);
    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuButton);
    const drawer = screen.getByRole('dialog', { name: 'Workspace sections' });
    await user.click(within(drawer).getByRole('button', { name: /^Glossary/ }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Glossary' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(heading).toHaveFocus();

    // Escape closes the drawer and returns focus to the menu button.
    await user.click(menuButton);
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
  });
});
