import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SpeakButton } from '../components/ui';
import { I18nProvider } from '../i18n/I18nProvider';
import { useFocusOnChange, useMediaQuery } from './dom';
import { SpeechProvider, useSpeechInput } from './speech';

class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function stubSpeechSynthesis() {
  const spoken: FakeUtterance[] = [];
  const synth = {
    speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [{ lang: 'te_IN', name: 'Telugu' }]),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { synth, spoken };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider language="en">
    <SpeechProvider>{children}</SpeechProvider>
  </I18nProvider>
);

describe('SpeakButton', () => {
  it('reads text aloud in the explanation language and can stop', async () => {
    const { synth, spoken } = stubSpeechSynthesis();
    const user = userEvent.setup();
    render(<SpeakButton id="p1" text="అద్దె కట్టండి" language="te" />, { wrapper });

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(spoken[0]).toMatchObject({ text: 'అద్దె కట్టండి', lang: 'te-IN', rate: 0.9 });
    expect(spoken[0]?.voice).toMatchObject({ name: 'Telugu' });
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Listen' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('resets when speech finishes', async () => {
    const { spoken } = stubSpeechSynthesis();
    const user = userEvent.setup();
    render(<SpeakButton id="p1" text="Pay rent" language="en" />, { wrapper });
    await user.click(screen.getByRole('button', { name: 'Listen' }));
    act(() => spoken[0]?.onend?.());
    expect(screen.getByRole('button', { name: 'Listen' })).toBeVisible();
  });

  it('is hidden when the browser cannot speak', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    // jsdom has no speechSynthesis by default.
    expect(descriptor).toBeUndefined();
    render(<SpeakButton id="p1" text="Pay rent" language="en" />, { wrapper });
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('useSpeechInput', () => {
  it('turns speech into text and stops listening at the end', () => {
    const instances: {
      lang: string;
      start: () => void;
      stop: () => void;
      onresult: ((event: unknown) => void) | null;
      onend: (() => void) | null;
    }[] = [];
    class FakeRecognition {
      lang = '';
      interimResults = true;
      maxAlternatives = 5;
      onresult: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn();
      constructor() {
        instances.push(this);
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const onText = vi.fn();
    const { result } = renderHook(() => useSpeechInput('hi-IN', onText));

    expect(result.current.supported).toBe(true);
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    expect(instances[0]?.lang).toBe('hi-IN');

    act(() => instances[0]?.onresult?.({ results: [[{ transcript: ' क्या किराया बढ़ेगा ' }]] }));
    expect(onText).toHaveBeenCalledWith('क्या किराया बढ़ेगा');

    act(() => instances[0]?.onend?.());
    expect(result.current.listening).toBe(false);

    act(() => result.current.stop());
    expect(instances[0]?.stop).toHaveBeenCalled();
  });

  it('reports no support when the browser lacks speech recognition', () => {
    const { result } = renderHook(() => useSpeechInput('en-IN', vi.fn()));
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.listening).toBe(false);
  });
});

describe('dom hooks', () => {
  it('useMediaQuery follows media query changes', () => {
    let listener: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: vi.fn((_type: string, callback: () => void) => {
        listener = callback;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 64rem)'));
    expect(result.current).toBe(false);
    media.matches = true;
    act(() => listener?.());
    expect(result.current).toBe(true);
    unmount();
    expect(media.removeEventListener).toHaveBeenCalled();
  });

  it('useMediaQuery is false without matchMedia support', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1px)'));
    expect(result.current).toBe(false);
  });

  it('useFocusOnChange moves focus only after the key changes', () => {
    function Harness({ step }: { step: number }) {
      const ref = useFocusOnChange<HTMLHeadingElement>(step);
      return (
        <h2 ref={ref} tabIndex={-1}>
          Step {step}
        </h2>
      );
    }
    const { rerender } = render(<Harness step={1} />);
    expect(screen.getByRole('heading')).not.toHaveFocus();
    rerender(<Harness step={2} />);
    expect(screen.getByRole('heading')).toHaveFocus();
  });
});
