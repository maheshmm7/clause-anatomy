import { useId, useMemo, useState } from 'react';
import { normalizeForMatch } from '../../../shared/text';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { Icon } from '../../components/Icon';
import { Badge, ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import { detectScriptLanguage } from '../../lib/browser';
import { collectGlossary } from '../../lib/insights';

/** 07 — every legal word in the paper, searchable, with links to where it is used. */
export function GlossaryView() {
  const { t } = useI18n();
  const { doc, go } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [query, setQuery] = useState('');
  const searchId = useId();
  const { analysis } = doc.loaded;
  const entries = useMemo(() => collectGlossary(analysis.points), [analysis.points]);
  const needle = normalizeForMatch(query);
  const visible = needle
    ? entries.filter((entry) =>
        normalizeForMatch(`${entry.term} ${entry.meaning}`).includes(needle),
      )
    : entries;

  return (
    <div className="view">
      <ViewHeader
        number="07"
        kicker={t('navGlossary')}
        title={t('glossaryTitle')}
        headingRef={headingRef}
      >
        <p className="view-header__lead">{t('glossaryIntro')}</p>
      </ViewHeader>

      <div className="search-field search-field--wide">
        <Icon name="search" />
        <label htmlFor={searchId} className="visually-hidden">
          {t('glossarySearch')}
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          placeholder={t('glossarySearch')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="empty">{t('glossaryEmpty')}</p>
      ) : (
        <dl className="glossary">
          {visible.map((entry) => (
            <div key={entry.term} className="glossary__entry">
              <dt className="glossary__term" lang={detectScriptLanguage(entry.term)}>
                {entry.term}
              </dt>
              <dd className="glossary__meaning">
                <p lang={analysis.language}>{entry.meaning}</p>
                <div className="glossary__meta">
                  <Badge
                    tone={entry.source === 'document' ? 'success' : 'warning'}
                    icon={entry.source === 'document' ? 'document' : 'help'}
                  >
                    {t(entry.source === 'document' ? 'termFromDocument' : 'termGeneral')}
                  </Badge>
                  <span className="sub-label">{t('glossaryUsedIn')}</span>
                  {entry.pointIds.map((pointId) => {
                    const index = analysis.points.findIndex((point) => point.id === pointId);
                    const point = analysis.points[index];
                    return (
                      <button
                        key={pointId}
                        type="button"
                        className="chip-btn chip-btn--small"
                        onClick={() => go('clauses', { pointId })}
                        lang={analysis.language}
                      >
                        <span className="chip-btn__number">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {point?.title}
                      </button>
                    );
                  })}
                </div>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
