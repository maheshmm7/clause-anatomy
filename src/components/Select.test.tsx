import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { detectUiLanguage } from '../settings/SettingsProvider';
import { expectNoAxeViolations } from '../test/helpers';
import { Select } from './Select';

const OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी', hint: 'Hindi', lang: 'hi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
] as const;

type Value = (typeof OPTIONS)[number]['value'];

function Harness() {
  const [value, setValue] = useState<Value>('en');
  return (
    <main>
      <Select<Value> label="Explain in" value={value} options={OPTIONS} onChange={setValue} />
      <p data-testid="value">{value}</p>
      <button type="button">Elsewhere</button>
    </main>
  );
}

const setup = () => {
  render(<Harness />);
  return {
    user: userEvent.setup(),
    combobox: screen.getByRole('combobox', { name: 'Explain in' }),
    value: () => screen.getByTestId('value').textContent,
  };
};

describe('Select (select-only combobox)', () => {
  it('is named by its label, shows the value and is accessible open and closed', async () => {
    const { user, combobox } = setup();
    expect(combobox).toHaveTextContent('English');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await expectNoAxeViolations(document.body);

    await user.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Explain in' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expectNoAxeViolations(document.body);
  });

  it('works fully from the keyboard', async () => {
    const { user, combobox, value } = setup();
    combobox.focus();

    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}');
    expect(combobox.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: /हिन्दी/ }).id,
    );
    await user.keyboard('{Enter}');
    expect(value()).toBe('hi');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveFocus();

    await user.keyboard('{ArrowUp}{End}{Enter}');
    expect(value()).toBe('te');
    await user.keyboard(' {Home}{Escape}');
    expect(value()).toBe('te');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('jumps by typing, and Tab picks the highlighted option', async () => {
    const { user, combobox, value } = setup();
    combobox.focus();
    await user.keyboard('t');
    expect(value()).toBe('ta');
    await user.keyboard('t');
    expect(value()).toBe('te');

    await user.keyboard('{ArrowDown}{Home}');
    await user.tab();
    expect(value()).toBe('en');
  });

  it('closes when clicking elsewhere and picks options with the pointer', async () => {
    const { user, combobox, value } = setup();
    await user.click(combobox);
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: 'Tamil' }));
    expect(value()).toBe('ta');
    expect(screen.getByRole('listbox', { hidden: true })).not.toBeVisible();
  });
});

describe('first-visit language', () => {
  it('uses the first supported browser language, else English', () => {
    expect(detectUiLanguage(['te-IN', 'en-US'])).toBe('te');
    expect(detectUiLanguage(['fr-FR', 'HI'])).toBe('hi');
    expect(detectUiLanguage(['fr-FR'])).toBe('en');
    expect(detectUiLanguage([])).toBe('en');
  });
});
