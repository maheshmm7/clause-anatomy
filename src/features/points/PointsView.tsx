import { useEffect, useMemo, useState } from 'react';
import type { AnalysisResult, VerifiedPoint } from '../../../shared/schema';
import { Icon } from '../../components/Icon';
import { useFocusOnChange, useMediaQuery } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { CheckOutcome } from '../../lib/brief';
import type { Perspective } from '../../lib/perspective';
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
 * Small screens default to one point at a time (less reading, less scrolling);
 * large screens default to the full list. Readers can switch either way.
 */
export function PointsView(props: PointsViewProps) {
  const { t } = useI18n();
  const { readingLevel } = useSettings();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [mode, setMode] = useState<'guided' | 'list' | null>(null);
  const activeMode = mode ?? (wide ? 'list' : 'guided');
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
  if (!current) return <p className="muted">{t('noPoints')}</p>;

  const cardProps = (point: VerifiedPoint) => {
    return {
      point,
      parties: props.analysis.parties,
      language: props.analysis.language,
      perspective: props.perspective,
      readingLevel,
      titlesById,
      checkOutcome: props.checks[point.id],
      onCheck: (outcome: CheckOutcome) => props.onCheck(point.id, outcome),
      onOpenPoint: props.onOpenPoint,
      onShowInOriginal: props.onShowInOriginal,
    };
  };

  return (
    <div className="points stack">
      <div className="points__toolbar">
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => setMode(activeMode === 'list' ? 'guided' : 'list')}
        >
          <Icon name={activeMode === 'list' ? 'arrowRight' : 'document'} />
          {activeMode === 'list' ? t('showOneByOne') : t('showAll')}
        </button>
      </div>

      {activeMode === 'list' ? (
        <ol className="points__list">
          {points.map((point) => (
            <li key={point.id}>
              <PointCard {...cardProps(point)} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="stack">
          <div className="progress">
            <p ref={headingRef} tabIndex={-1} className="progress__label" aria-live="polite">
              {t('pointOf', { current: safeIndex + 1, total: points.length })}
            </p>
            <progress max={points.length} value={safeIndex + 1} aria-hidden="true" />
          </div>
          <PointCard key={current.id} {...cardProps(current)} />
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
      )}
    </div>
  );
}
