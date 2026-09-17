import { useEffect, useId, useMemo, useState } from 'react';
import type { VerifiedPoint } from '../../../shared/schema';
import { normalizeForMatch } from '../../../shared/text';
import { locateQuote, prepareSource } from '../../../shared/verifyQuote';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { Segmented } from '../../components/controls';
import { Icon } from '../../components/Icon';
import { Panel, ViewHeader } from '../../components/ui';
import { useFocusOnChange, useFocusOnMount, useMediaQuery } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import { contextSnippet } from '../../lib/insights';
import { needsAttention } from '../../lib/perspective';
import { useSettings } from '../../settings/SettingsProvider';
import { ClauseDetail } from './ClauseDetail';

export type ClauseFilter = 'all' | 'attention' | 'flagged' | 'unsure';

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
  );
}

/** 02 — work through clauses one at a time, with an index, filters and document context. */
export function ClausesView() {
  const { t } = useI18n();
  const { doc, dispatch, go, setAskDraft } = useActiveDoc();
  const { readingLevel } = useSettings();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [filter, setFilter] = useState<ClauseFilter>('all');
  const [query, setQuery] = useState('');
  const searchId = useId();
  const jumpId = useId();

  const { analysis, text } = doc.loaded;
  const points = analysis.points;
  const titlesById = useMemo(
    () => new Map(points.map((point) => [point.id, point.title])),
    [points],
  );
  const prepared = useMemo(() => prepareSource(text), [text]);

  const visible = useMemo(() => {
    const needle = normalizeForMatch(query);
    return points.filter((point) => {
      if (filter === 'attention' && !needsAttention(point, doc.perspective)) return false;
      if (filter === 'flagged' && !doc.flags[point.id]) return false;
      if (filter === 'unsure' && !['wrong', 'unsure'].includes(doc.checks[point.id] ?? ''))
        return false;
      return !needle || normalizeForMatch(`${point.title} ${point.simple}`).includes(needle);
    });
  }, [points, filter, query, doc.perspective, doc.flags, doc.checks]);

  const current: VerifiedPoint | undefined =
    points.find((point) => point.id === doc.selectedPointId) ?? points[0];
  const currentIndex = current ? points.indexOf(current) : -1;
  const positionInVisible = current ? visible.indexOf(current) : -1;
  const progressRef = useFocusOnChange<HTMLParagraphElement>(current?.id);

  const select = (pointId: string): void => dispatch({ type: 'selectPoint', pointId });
  const step = (delta: number): void => {
    if (visible.length === 0) return;
    const from = positionInVisible === -1 ? (delta > 0 ? -1 : visible.length) : positionInVisible;
    const next = visible[Math.min(visible.length - 1, Math.max(0, from + delta))];
    if (next) select(next.id);
  };

  // J / K keyboard navigation, as in document review tools.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (event.key === 'j' || event.key === 'J') step(1);
      if (event.key === 'k' || event.key === 'K') step(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const range = current?.verified ? locateQuote(prepared, current.quote) : null;
  const snippet = range ? contextSnippet(text, range) : null;

  const filters = (
    <Segmented<ClauseFilter>
      legend={t('filterLabel')}
      value={filter}
      compact
      options={[
        { value: 'all', label: t('filterAll') },
        { value: 'attention', label: t('filterAttention') },
        { value: 'flagged', label: t('filterFlagged') },
        { value: 'unsure', label: t('filterUnsure') },
      ]}
      onChange={setFilter}
    />
  );

  return (
    <div className="view view--clauses">
      <ViewHeader
        number="02"
        kicker={t('navClauses')}
        title={t('clausesTitle')}
        headingRef={headingRef}
      >
        <p className="hint">
          <kbd className="kbd">J</kbd> <kbd className="kbd">K</kbd> {t('keyboardHint')}
        </p>
      </ViewHeader>

      {points.length === 0 ? (
        <p className="empty">{t('noPoints')}</p>
      ) : (
        <div className="clauses-layout">
          <aside className="clause-index" aria-label={t('clausesTitle')}>
            <div className="clause-index__tools">
              <label htmlFor={searchId} className="visually-hidden">
                {t('clauseSearchLabel')}
              </label>
              <div className="search-field">
                <Icon name="search" />
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  placeholder={t('clauseSearchLabel')}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {filters}
            </div>
            {visible.length === 0 ? (
              <p className="empty">{t('clausesEmptyFilter')}</p>
            ) : wide ? (
              <ol className="clause-index__list">
                {visible.map((point) => {
                  const number = points.indexOf(point) + 1;
                  const outcome = doc.checks[point.id];
                  return (
                    <li key={point.id}>
                      <button
                        type="button"
                        className="clause-index__item"
                        aria-current={point.id === current?.id ? 'true' : undefined}
                        onClick={() => select(point.id)}
                      >
                        <span className="clause-index__number">
                          {String(number).padStart(2, '0')}
                        </span>
                        <span className="clause-index__title" lang={analysis.language}>
                          {point.title}
                        </span>
                        <span className="clause-index__marks">
                          {needsAttention(point, doc.perspective) && (
                            <Icon name="alert" className="mark--danger" />
                          )}
                          {doc.flags[point.id] && <Icon name="flag" className="mark--info" />}
                          {outcome === 'correct' && (
                            <Icon name="checkCircle" className="mark--ok" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="field-row">
                <label htmlFor={jumpId} className="field-row__label">
                  {t('jumpToClause')}
                </label>
                <select
                  id={jumpId}
                  value={current?.id}
                  onChange={(event) => select(event.target.value)}
                  lang={analysis.language}
                >
                  {visible.map((point) => (
                    <option key={point.id} value={point.id}>
                      {String(points.indexOf(point) + 1).padStart(2, '0')} · {point.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </aside>

          {current && (
            <div className="clause-main">
              <p ref={progressRef} tabIndex={-1} className="progress-line" aria-live="polite">
                {t('pointOf', { current: currentIndex + 1, total: points.length })}
              </p>
              <ClauseDetail
                key={current.id}
                point={current}
                number={currentIndex + 1}
                parties={analysis.parties}
                language={analysis.language}
                perspective={doc.perspective}
                readingLevel={readingLevel}
                titlesById={titlesById}
                checkOutcome={doc.checks[current.id]}
                note={doc.notes[current.id] ?? ''}
                flagged={Boolean(doc.flags[current.id])}
                onCheck={(outcome) =>
                  dispatch({ type: 'recordCheck', pointId: current.id, outcome })
                }
                onNote={(note) => dispatch({ type: 'setNote', pointId: current.id, note })}
                onToggleFlag={() => dispatch({ type: 'toggleFlag', pointId: current.id })}
                onOpenPoint={select}
                onShowInDocument={(pointId) => go('document', { pointId })}
                onAsk={() => {
                  setAskDraft(t('askAboutClauseQuestion', { title: current.title }));
                  go('ask');
                }}
              />
              <div className="pager">
                <button
                  type="button"
                  className="btn btn--large"
                  disabled={visible.length === 0 || positionInVisible === 0}
                  onClick={() => step(-1)}
                >
                  <Icon name="arrowLeft" /> {t('previous')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--large"
                  disabled={visible.length === 0 || positionInVisible === visible.length - 1}
                  onClick={() => step(1)}
                >
                  {t('next')} <Icon name="arrowRight" />
                </button>
              </div>
            </div>
          )}

          {snippet && current && (
            <Panel
              title={t('contextTitle')}
              icon="document"
              className="clause-context"
              headingLevel="h2"
            >
              <p className="snippet">
                {snippet.clippedStart && '… '}
                {snippet.before}
                <mark>{snippet.match}</mark>
                {snippet.after}
                {snippet.clippedEnd && ' …'}
              </p>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => go('document', { pointId: current.id })}
              >
                <Icon name="document" /> {t('showInDocument')}
              </button>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
