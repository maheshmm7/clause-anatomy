import { useEffect, useMemo, useState } from 'react';
import type { AnalysisResult, VerifiedPoint } from '../../../shared/schema';
import { Icon } from '../../components/Icon';
import { useFocusOnChange, useMediaQuery } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { CheckOutcome } from '../../lib/brief';
import { needsAttention, type Perspective } from '../../lib/perspective';
import { useSettings } from '../../settings/SettingsProvider';
import { PointCard } from './PointCard';

interface PointsViewProps {
  analysis: AnalysisResult;
  perspective: Perspective;
  checks: Readonly<Record<string, CheckOutcome>>;
  selectedPointId: string | null;
  onCheck: (pointId: string, outcome: CheckOutcome) => void;
  onOpenPoint: (pointId: string) => void;
  onShowInOriginal: (pointId: string) => void;
}

/**
 * One point at a time by default (less reading, less scrolling). Large screens add a
 * clickable outline of every point beside the card; phones get compact progress dots.
 * Readers can switch to the full list at any time.
 */
export function PointsView(props: PointsViewProps) {
  const { t } = useI18n();
  const { readingLevel } = useSettings();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [mode, setMode] = useState<'guided' | 'list' | null>(null);
  const activeMode = mode ?? 'guided';
  const { points } = props.analysis;
  const indexOf = (pointId: string | null): number =>
    Math.max(
      0,
      points.findIndex((point) => point.id === pointId),
    );
  const [index, setIndex] = useState(() => indexOf(props.selectedPointId));
  const [syncedSelection, setSyncedSelection] = useState(props.selectedPointId);
  const headingRef = useFocusOnChange<HTMLParagraphElement>(index);
  const titlesById = useMemo(
    () => new Map(points.map((point) => [point.id, point.title])),
    [points],
  );

  // Jump to a point chosen elsewhere (a "connected point" link or a what-if outcome).
  // Adjusting state while rendering avoids an extra effect-driven render.
  if (props.selectedPointId !== syncedSelection) {
    setSyncedSelection(props.selectedPointId);
    setIndex(indexOf(props.selectedPointId));
  }

  useEffect(() => {
    if (props.selectedPointId && activeMode === 'list') {
      document.getElementById(`${props.selectedPointId}-title`)?.scrollIntoView({ block: 'start' });
    }
  }, [props.selectedPointId, activeMode]);

  const safeIndex = Math.min(index, points.length - 1);
  const current = points[safeIndex];
  if (!current) return <p className="empty-state">{t('noPoints')}</p>;

  const cardProps = (point: VerifiedPoint, number: number) => ({
    point,
    number,
    parties: props.analysis.parties,
    language: props.analysis.language,
    perspective: props.perspective,
    readingLevel,
    titlesById,
    checkOutcome: props.checks[point.id],
    onCheck: (outcome: CheckOutcome) => props.onCheck(point.id, outcome),
    onOpenPoint: props.onOpenPoint,
    onShowInOriginal: props.onShowInOriginal,
  });

  return (
    <div className="points">
      <div className="points__toolbar">
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => setMode(activeMode === 'list' ? 'guided' : 'list')}
        >
          <Icon name={activeMode === 'list' ? 'arrowRight' : 'layers'} />
          {activeMode === 'list' ? t('showOneByOne') : t('showAll')}
        </button>
      </div>

      {activeMode === 'list' ? (
        <ol className="points__list">
          {points.map((point, pointIndex) => (
            <li key={point.id}>
              <PointCard {...cardProps(point, pointIndex + 1)} />
            </li>
          ))}
        </ol>
      ) : (
        <div className={wide ? 'guided guided--split' : 'guided'}>
          {wide && (
            <nav className="outline" aria-label={t('tabPoints')}>
              <ol className="outline__list">
                {points.map((point, pointIndex) => {
                  const outcome = props.checks[point.id];
                  const attention = needsAttention(point, props.perspective);
                  return (
                    <li key={point.id}>
                      <button
                        type="button"
                        className="outline__item"
                        aria-current={pointIndex === safeIndex ? 'step' : undefined}
                        onClick={() => setIndex(pointIndex)}
                      >
                        <span className="outline__number">{pointIndex + 1}</span>
                        <span className="outline__title" lang={props.analysis.language}>
                          {point.title}
                        </span>
                        {outcome === 'correct' && (
                          <Icon
                            name="checkCircle"
                            className="outline__state outline__state--done"
                          />
                        )}
                        {outcome !== 'correct' && attention && (
                          <Icon name="alert" className="outline__state outline__state--attention" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          <div className="guided__main">
            <div className="guided__progress">
              <p ref={headingRef} tabIndex={-1} className="guided__label" aria-live="polite">
                {t('pointOf', { current: safeIndex + 1, total: points.length })}
              </p>
              {!wide && (
                <ol className="dots">
                  {points.map((point, pointIndex) => {
                    const outcome = props.checks[point.id];
                    const classes = [
                      'dots__dot',
                      pointIndex === safeIndex ? 'dots__dot--current' : '',
                      needsAttention(point, props.perspective) ? 'dots__dot--attention' : '',
                      outcome === 'correct' ? 'dots__dot--done' : '',
                    ].join(' ');
                    return (
                      <li key={point.id}>
                        <button
                          type="button"
                          className={classes}
                          aria-label={t('goToPoint', { n: pointIndex + 1, title: point.title })}
                          aria-current={pointIndex === safeIndex ? 'step' : undefined}
                          onClick={() => setIndex(pointIndex)}
                        />
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            <PointCard key={current.id} {...cardProps(current, safeIndex + 1)} />
            <div className="pager">
              <button
                type="button"
                className="button button--secondary button--large"
                disabled={safeIndex === 0}
                onClick={() => setIndex(safeIndex - 1)}
              >
                <Icon name="arrowLeft" /> {t('previous')}
              </button>
              <button
                type="button"
                className="button button--primary button--large"
                disabled={safeIndex === points.length - 1}
                onClick={() => setIndex(safeIndex + 1)}
              >
                {t('next')} <Icon name="arrowRight" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
