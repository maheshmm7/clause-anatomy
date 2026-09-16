import { useEffect, useMemo, useRef } from 'react';
import type { VerifiedPoint } from '../../../shared/schema';
import { locateQuote, prepareSource } from '../../../shared/verifyQuote';
import { useI18n } from '../../i18n/I18nProvider';
import { detectScriptLanguage } from '../../lib/browser';

/** The (redacted) paper itself, with the selected point's source words highlighted. */
export function OriginalView({ text, point }: { text: string; point: VerifiedPoint | undefined }) {
  const { t } = useI18n();
  const markRef = useRef<HTMLElement>(null);
  const prepared = useMemo(() => prepareSource(text), [text]);
  const range = useMemo(
    () => (point?.verified ? locateQuote(prepared, point.quote) : null),
    [prepared, point],
  );

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: 'center' });
  }, [range]);

  return (
    <section className="original stack" aria-labelledby="original-heading">
      <h2 id="original-heading" className="card__title">
        {t('originalHeading')}
      </h2>
      {range && <p className="muted small">{t('originalHint')}</p>}
      <div className="original__text card" lang={detectScriptLanguage(text)}>
        {range ? (
          <>
            {text.slice(0, range.start)}
            <mark ref={markRef}>{text.slice(range.start, range.end)}</mark>
            {text.slice(range.end)}
          </>
        ) : (
          text
        )}
      </div>
    </section>
  );
}
