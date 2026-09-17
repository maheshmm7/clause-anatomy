import { useActiveDoc } from '../../app/WorkspaceContext';
import { FairnessBar, RolePicker } from '../../components/controls';
import { Icon } from '../../components/Icon';
import { Notice, Panel, ScrollArea, ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { collectConsequences, IMPORTANCE_ORDER, riskMatrix, type Side } from '../../lib/insights';
import { partyLabel } from '../../lib/perspective';

const ROW_LABELS: Record<(typeof IMPORTANCE_ORDER)[number], MessageKey> = {
  high: 'importanceHigh',
  medium: 'importanceMedium',
  low: 'importanceLow',
};

const COLUMNS: readonly { side: Side; key: MessageKey }[] = [
  { side: 'you', key: 'fairnessForYou' },
  { side: 'balanced', key: 'fairnessBalanced' },
  { side: 'others', key: 'fairnessForOthers' },
];

/** 04 — every clause placed by importance and by which side it favours. */
export function RiskView() {
  const { t } = useI18n();
  const { doc, dispatch, go } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { analysis } = doc.loaded;
  // Before a role is chosen, the columns show the first party vs. everyone else.
  const [firstParty, secondParty] = analysis.parties;
  const layoutPerspective = doc.perspective ?? firstParty?.id ?? null;
  const matrix = riskMatrix(analysis.points, layoutPerspective);
  const columnLabel = (side: Side, key: MessageKey): string => {
    if (doc.perspective !== null || !firstParty || side === 'balanced') return t(key);
    if (side === 'you') {
      return t('fairnessByParty', { party: partyLabel(analysis.parties, firstParty.id) });
    }
    return secondParty && analysis.parties.length === 2
      ? t('fairnessByParty', { party: partyLabel(analysis.parties, secondParty.id) })
      : t(key);
  };
  const consequences = collectConsequences(analysis.points);
  const numberOf = (pointId: string): string =>
    String(analysis.points.findIndex((point) => point.id === pointId) + 1).padStart(2, '0');
  const titleOf = (pointId: string): string =>
    analysis.points.find((point) => point.id === pointId)?.title ?? pointId;

  return (
    <div className="view">
      <ViewHeader
        number="04"
        kicker={t('navRisks')}
        title={t('risksTitle')}
        headingRef={headingRef}
      >
        <p className="view-header__lead">{t('risksIntro')}</p>
      </ViewHeader>

      {doc.perspective === null && (
        <Notice tone="info" icon="user" title={t('fairnessPickRole')}>
          <RolePicker
            hideLegend
            analysis={analysis}
            perspective={doc.perspective}
            onChange={(perspective) => dispatch({ type: 'setPerspective', perspective })}
          />
        </Notice>
      )}

      <ScrollArea label={t('risksTitle')}>
        <table className="matrix">
          <caption className="visually-hidden">{t('risksTitle')}</caption>
          <thead>
            <tr>
              <td />
              {COLUMNS.map((column) => (
                <th
                  key={column.side}
                  scope="col"
                  className={`matrix__col matrix__col--${doc.perspective === null && column.side !== 'balanced' ? 'party' : column.side}`}
                >
                  {columnLabel(column.side, column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IMPORTANCE_ORDER.map((importance) => (
              <tr key={importance}>
                <th scope="row" className={`matrix__row matrix__row--${importance}`}>
                  {t(ROW_LABELS[importance])}
                </th>
                {COLUMNS.map((column) => {
                  const cell = matrix[importance][column.side];
                  const hot =
                    doc.perspective !== null &&
                    column.side === 'others' &&
                    importance !== 'low' &&
                    cell.length > 0;
                  return (
                    <td
                      key={column.side}
                      className={`matrix__cell${hot ? ' matrix__cell--hot' : ''}`}
                    >
                      {cell.length === 0 ? (
                        <span className="matrix__empty" aria-hidden="true">
                          —
                        </span>
                      ) : (
                        <ul className="matrix__chips">
                          {cell.map((point) => (
                            <li key={point.id}>
                              <button
                                type="button"
                                className="chip-btn"
                                onClick={() => go('clauses', { pointId: point.id })}
                                lang={analysis.language}
                              >
                                <span className="chip-btn__number">{numberOf(point.id)}</span>
                                {point.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="dash-grid">
        <Panel number="04A" title={t('fairnessTitle')} icon="scale">
          <FairnessBar analysis={analysis} perspective={doc.perspective} />
        </Panel>
        <Panel number="04B" title={t('consequencesTitle')} icon="alert" className="panel--danger">
          {consequences.length === 0 ? (
            <p className="empty">{t('consequencesEmpty')}</p>
          ) : (
            <ul className="consequences" lang={analysis.language}>
              {consequences.map((item, index) => (
                <li key={`${item.pointId}-${index}`} className="consequences__item">
                  <Icon name="alert" />
                  <span>{item.text}</span>
                  <button
                    type="button"
                    className="chip-btn chip-btn--small"
                    onClick={() => go('clauses', { pointId: item.pointId })}
                  >
                    <span className="chip-btn__number">{numberOf(item.pointId)}</span>
                    <span className="visually-hidden">{titleOf(item.pointId)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
