import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { RENTAL_SAMPLE } from '../../samples/rental';
import { expectNoAxeViolations } from '../../test/helpers';
import { NextStepsView } from './NextStepsView';

const analysis = RENTAL_SAMPLE.analyses.en!;

function renderView(perspective: string | null = 'lessee') {
  const user = userEvent.setup();
  const view = render(
    <I18nProvider language="en">
      <NextStepsView
        analysis={analysis}
        perspective={perspective}
        brief={{ analysis, checks: { p1: 'correct', p2: 'wrong' }, asked: [] }}
      />
    </I18nProvider>,
  );
  return { ...view, user };
}

describe('NextStepsView', () => {
  it('shows progress, a personal checklist, dates and legal help', async () => {
    const { container } = renderView();
    expect(screen.getByText('You understood 1 of 2 checks')).toBeVisible();
    expect(screen.getByText('What you must not do')).toBeVisible();
    expect(screen.getByText('1 August 2026')).toBeVisible();
    expect(screen.getByRole('link', { name: /nalsa\.gov\.in/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await expectNoAxeViolations(container);
  });

  it('asks the reader to choose who they are before showing duties', () => {
    renderView(null);
    expect(screen.getByText(/Choose who you are/)).toBeVisible();
  });

  it('copies the brief to the clipboard', async () => {
    const { user } = renderView();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('I did not understand "The first 6 months are locked"'),
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeVisible();
  });

  it('shares the brief where the device supports sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { user } = renderView();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      title: analysis.documentType,
      text: expect.stringContaining('My questions'),
    });
    Reflect.deleteProperty(navigator, 'share');
  });

  it('prints only the brief', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    const { user } = renderView();
    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalled();
    expect(document.body).toHaveClass('printing-brief');
    window.dispatchEvent(new Event('afterprint'));
    expect(document.body).not.toHaveClass('printing-brief');
  });

  it('downloads important dates as a calendar file', async () => {
    const createObjectURL = vi.fn(() => 'blob:dates');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { user } = renderView();

    await user.click(screen.getByRole('button', { name: /Add dates to my calendar/ }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:dates');
  });
});
