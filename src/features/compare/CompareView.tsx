import { useId, useMemo } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import type { WorkspaceDoc } from '../../app/workspace';
import { Icon } from '../../components/Icon';
import { Notice, Panel, ScrollArea, ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import { compareFacts, matchClauses } from '../../lib/compare';

function DocPicker({
  label,
  value,
  docs,
  exclude,
  onChange,
}: {
  label: string;
  value: string | null;
  docs: readonly WorkspaceDoc[];
  exclude: string | null;
  onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <div className="field-row">
      <label htmlFor={id} className="field-row__label">
        {label}
      </label>
      <select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {docs.map((doc) => (
          <option key={doc.id} value={doc.id} disabled={doc.id === exclude}>
            {doc.loaded.analysis.documentType}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 09 — two papers side by side: key facts and similar clauses matched up. */
export function CompareView() {
  const { t, formatDate } = useI18n();
  const { state, dispatch, go } = useWorkspace();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [idA, idB] = state.compareIds;
  const docA = state.docs.find((doc) => doc.id === idA);
  const docB = state.docs.find((doc) => doc.id === idB);

  const comparison = useMemo(() => {
    if (!docA || !docB) return null;
    const a = docA.loaded.analysis;
    const b = docB.loaded.analysis;
    return {
      a,
      b,
      factsA: compareFacts(a.points, a.keyDates),
      factsB: compareFacts(b.points, b.keyDates),
      matches: matchClauses(a.points, b.points),
    };
  }, [docA, docB]);

  const amounts = (values: number[]): string =>
    values.length === 0
      ? '—'
      : values.map((value) => `₹${value.toLocaleString('en-IN')}`).join(', ');

  return (
    <div className="view">
      <ViewHeader
        number="09"
        kicker={t('navCompare')}
        title={t('compareTitle')}
        headingRef={headingRef}
      >
        <p className="view-header__lead">{t('compareIntro')}</p>
      </ViewHeader>

      {state.docs.length < 2 ? (
        <Notice tone="info" title={t('compareNeedTwo')}>
          <button type="button" className="btn btn--primary" onClick={() => go('home')}>
            <Icon name="plus" /> {t('newDocument')}
          </button>
        </Notice>
      ) : (
        <>
          <div className="compare-pickers">
            <DocPicker
              label={t('comparePickA')}
              value={idA}
              docs={state.docs}
              exclude={idB}
              onChange={(id) => dispatch({ type: 'setCompare', slot: 0, id })}
            />
            <Icon name="columns" className="compare-pickers__icon" />
            <DocPicker
              label={t('comparePickB')}
              value={idB}
              docs={state.docs}
              exclude={idA}
              onChange={(id) => dispatch({ type: 'setCompare', slot: 1, id })}
            />
          </div>

          {comparison && (
            <>
              <Panel number="A" title={t('compareFactsTitle')} icon="grid">
                <ScrollArea label={t('compareTitle')}>
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <td />
                        <th scope="col" lang={comparison.a.language}>
                          {comparison.a.documentType}
                        </th>
                        <th scope="col" lang={comparison.b.language}>
                          {comparison.b.documentType}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">{t('compareRowClauses')}</th>
                        <td>{comparison.factsA.clauses}</td>
                        <td>{comparison.factsB.clauses}</td>
                      </tr>
                      <tr>
                        <th scope="row">{t('compareRowHigh')}</th>
                        <td>{comparison.factsA.highImportance}</td>
                        <td>{comparison.factsB.highImportance}</td>
                      </tr>
                      <tr>
                        <th scope="row">{t('compareRowVerified')}</th>
                        <td>
                          {comparison.factsA.verified}/{comparison.factsA.clauses}
                        </td>
                        <td>
                          {comparison.factsB.verified}/{comparison.factsB.clauses}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">{t('compareRowAmounts')}</th>
                        <td>{amounts(comparison.factsA.amounts)}</td>
                        <td>{amounts(comparison.factsB.amounts)}</td>
                      </tr>
                      <tr>
                        <th scope="row">{t('compareRowDates')}</th>
                        <td>
                          {comparison.factsA.dates
                            .map((date) => formatDate(date.date))
                            .join(' · ') || '—'}
                        </td>
                        <td>
                          {comparison.factsB.dates
                            .map((date) => formatDate(date.date))
                            .join(' · ') || '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </ScrollArea>
              </Panel>

              <Panel number="B" title={t('compareMatched')} icon="columns">
                <ul className="pairs">
                  {comparison.matches.pairs.map((pair) => (
                    <li key={`${pair.a.id}-${pair.b.id}`} className="pair">
                      <div className="pair__side" lang={comparison.a.language}>
                        <p className="pair__title">{pair.a.title}</p>
                        <p>{pair.a.simple}</p>
                      </div>
                      <span className="pair__vs" aria-hidden="true">
                        ⇄
                      </span>
                      <div className="pair__side" lang={comparison.b.language}>
                        <p className="pair__title">{pair.b.title}</p>
                        <p>{pair.b.simple}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <div className="dash-grid">
                {(
                  [
                    [comparison.a, comparison.matches.onlyA],
                    [comparison.b, comparison.matches.onlyB],
                  ] as const
                ).map(([analysis, only], index) => (
                  <Panel
                    key={index}
                    number={index === 0 ? 'C' : 'D'}
                    title={t('compareOnlyIn', { name: analysis.documentType })}
                    icon="document"
                  >
                    {only.length === 0 ? (
                      <p className="empty">{t('compareNone')}</p>
                    ) : (
                      <ul className="only-list" lang={analysis.language}>
                        {only.map((point) => (
                          <li key={point.id}>
                            <p className="pair__title">{point.title}</p>
                            <p>{point.simple}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
