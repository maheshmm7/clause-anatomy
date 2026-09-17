import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Secondary text, e.g. the English name of a language. */
  hint?: string;
  lang?: string;
}

const TYPEAHEAD_RESET_MS = 700;

/**
 * A styled dropdown that behaves like a native select: the WAI-ARIA "select-only
 * combobox" pattern. Focus stays on the button; arrow keys, Home/End, typing a letter,
 * Enter/Space, Escape and Tab all work, and the options are announced as they change.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  compact = false,
  labelIcon,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
  compact?: boolean;
  labelIcon?: Parameters<typeof Icon>[0]['name'];
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  // The list is fixed-positioned so scrolling panels, tables and dialogs never clip it.
  const [position, setPosition] = useState<CSSProperties>({});
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const selected = options[selectedIndex];
  const last = options.length - 1;

  const openList = (index = selectedIndex): void => {
    const rect = rootRef.current?.querySelector('button')?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const upward = below < 280 && rect.top > below;
      const width = Math.max(rect.width, 176);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        ...(upward
          ? { bottom: window.innerHeight - rect.top + 6, maxHeight: Math.min(288, rect.top - 16) }
          : { top: rect.bottom + 6, maxHeight: Math.min(288, below - 16) }),
      });
    }
    setActive(index);
    setOpen(true);
  };

  const commit = (index: number): void => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  };

  // Close when the pointer goes down elsewhere, or the page scrolls or resizes under it.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onScroll = (event: Event): void => {
      if (event.target !== listRef.current) setOpen(false);
    };
    const close = (): void => setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // Keep the highlighted option in view while moving through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const matchTypeahead = (key: string): number => {
    const now = Date.now();
    const typed =
      now - typeahead.current.at > TYPEAHEAD_RESET_MS ? key : typeahead.current.text + key;
    typeahead.current = { text: typed, at: now };
    // Pressing the same letter again cycles through options starting with it, like a native select.
    const search = [...typed].every((char) => char === typed[0]) ? key : typed;
    const start = open ? active : selectedIndex;
    const ordered = [...options.slice(start + 1), ...options.slice(0, start + 1)];
    const match = ordered.find((option) =>
      option.label.toLocaleLowerCase().startsWith(search.toLocaleLowerCase()),
    );
    return match ? options.indexOf(match) : -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (open) setActive(Math.min(last, active + 1));
        else openList();
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (open) setActive(Math.max(0, active - 1));
        else openList();
        return;
      case 'Home':
        if (!open) return;
        event.preventDefault();
        setActive(0);
        return;
      case 'End':
        if (!open) return;
        event.preventDefault();
        setActive(last);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) commit(active);
        else openList();
        return;
      case 'Escape':
        if (!open) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      case 'Tab':
        if (open) commit(active);
        return;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const index = matchTypeahead(event.key);
        if (index === -1) return;
        if (open) setActive(index);
        else commit(index);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`select${compact ? ' select--compact' : ''}${open ? ' select--open' : ''}`}
    >
      <span id={labelId} className={hideLabel ? 'visually-hidden' : 'select__label'}>
        {labelIcon && <Icon name={labelIcon} />}
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        className="select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="select__value" lang={selected?.lang}>
          {selected?.label}
          {selected?.hint && <span className="select__hint"> · {selected.hint}</span>}
        </span>
        <Icon name="chevronDown" className="select__chevron" />
      </button>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        tabIndex={-1}
        hidden={!open}
        className="select__list"
        style={position}
        // Keep focus on the button while the pointer picks an option.
        onPointerDown={(event) => event.preventDefault()}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            tabIndex={-1}
            data-index={index}
            aria-selected={index === selectedIndex}
            className={`select__option${index === active ? ' select__option--active' : ''}`}
            lang={option.lang}
            onPointerMove={() => setActive(index)}
            onClick={() => commit(index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit(index);
            }}
          >
            <span className="select__option-label">{option.label}</span>
            {option.hint && <span className="select__hint">{option.hint}</span>}
            {index === selectedIndex && <Icon name="check" className="select__check" />}
          </div>
        ))}
      </div>
    </div>
  );
}
