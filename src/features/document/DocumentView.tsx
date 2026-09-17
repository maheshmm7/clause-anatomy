import { Fragment, useEffect, useMemo, type ReactNode } from 'react';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { Icon } from '../../components/Icon';
import { ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import { detectScriptLanguage } from '../../lib/browser';
import { annotationRanges } from '../../lib/insights';
import { needsAttention } from '../../lib/perspective';

/**
 * 03 — document-first reading: the (redacted) paper with every explained sentence
 * highlighted and numbered, and margin notes beside it. Selecting either side keeps
 * the other in view.
 */
export function DocumentView() {
  const { t } = useI18n();
  const { doc, dispatch, go } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { text, analysis } = doc.loaded;
  const annotations = useMemo(
    () => annotationRanges(text, analysis.points),
    [text, analysis.points],
  );
  const selectedId = doc.selectedPointId;
  const pointsById = useMemo(
    () => new Map(analysis.points.map((point) => [point.id, point])),
    [analysis.points],
  );

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`anno-${selectedId}`)?.scrollIntoView({ block: 'center' });
    document.getElementById(`note-${selectedId}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const segments: ReactNode[] = [];
  let cursor = 0;
  for (const annotation of annotations) {
    const point = pointsById.get(annotation.pointId);
    if (!point) continue;
    segments.push(
      <Fragment key={`text-${annotation.start}`}>{text.slice(cursor, annotation.start)}</Fragment>,
    );
    const selected = annotation.pointId === selectedId;
    const tone = needsAttention(point, doc.perspective) ? ' anno--attention' : '';
    segments.push(
      <span key={annotation.pointId} className={`anno${tone}${selected ? ' anno--selected' : ''}`}>
        <button
          type="button"
          className="anno__marker"
          aria-pressed={selected}
          onClick={() => dispatch({ type: 'selectPoint', pointId: annotation.pointId })}
        >
          <span aria-hidden="true">{annotation.number}</span>
          <span className="visually-hidden">
            {t('annotationLabel', { n: annotation.number, title: point.title })}
          </span>
        </button>
        <mark id={`anno-${annotation.pointId}`} className="anno__text">
          {text.slice(annotation.start, annotation.end)}
        </mark>
      </span>,
    );
    cursor = annotation.end;
  }
  segments.push(<Fragment key="text-end">{text.slice(cursor)}</Fragment>);

  return (
    <div className="view view--document">
      <ViewHeader
        number="03"
        kicker={t('navDocument')}
        title={t('originalHeading')}
        headingRef={headingRef}
      >
        <p className="hint">{t('annotationsHint')}</p>
      </ViewHeader>

      <div className="reader">
        <div className="paper" lang={detectScriptLanguage(text)}>
          {segments}
        </div>

        <aside className="margin" aria-labelledby="margin-title">
          <h2 id="margin-title" className="margin__title">
            {t('annotationsTitle')}
          </h2>
          <ol className="margin__list">
            {annotations.map((annotation) => {
              const point = pointsById.get(annotation.pointId);
              if (!point) return null;
              const selected = annotation.pointId === selectedId;
              return (
                <li
                  key={annotation.pointId}
                  id={`note-${annotation.pointId}`}
                  className={`note${selected ? ' note--selected' : ''}`}
                >
                  <button
                    type="button"
                    className="note__select"
                    aria-pressed={selected}
                    onClick={() => dispatch({ type: 'selectPoint', pointId: annotation.pointId })}
                  >
                    <span className="note__number" aria-hidden="true">
                      {annotation.number}
                    </span>
                    <span className="note__title" lang={analysis.language}>
                      {point.title}
                    </span>
                  </button>
                  {selected && (
                    <div className="note__body">
                      <p lang={analysis.language}>{point.simple}</p>
                      <button
                        type="button"
                        className="btn btn--small btn--primary"
                        onClick={() => go('clauses', { pointId: point.id })}
                      >
                        {t('openClause')} <Icon name="arrowRight" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
