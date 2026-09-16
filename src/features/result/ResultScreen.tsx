import { lazy, Suspense, useCallback, useId, useReducer, useRef, type KeyboardEvent } from 'react';
import { ApiClientError, api } from '../../api/client';
import type { LoadedDocument } from '../../app/flow';
import { Icon, type IconName } from '../../components/Icon';
import { Spinner } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { PointsView } from '../points/PointsView';
import { Overview } from './Overview';
import { RESULT_TABS, initialResultState, resultReducer, type ResultTab } from './resultState';

// Secondary sections load on demand to keep the first result render light.
const WhatIfView = lazy(async () => ({
  default: (await import('../whatif/WhatIfView')).WhatIfView,
}));
const AskView = lazy(async () => ({ default: (await import('../ask/AskView')).AskView }));
const NextStepsView = lazy(async () => ({
  default: (await import('../next/NextStepsView')).NextStepsView,
}));
const OriginalView = lazy(async () => ({
  default: (await import('../original/OriginalView')).OriginalView,
}));

const TAB_INFO: Record<ResultTab, { key: MessageKey; icon: IconName }> = {
  points: { key: 'tabPoints', icon: 'layers' },
  whatif: { key: 'tabWhatIf', icon: 'branch' },
  ask: { key: 'tabAsk', icon: 'chat' },
  next: { key: 'tabNext', icon: 'checkCircle' },
  original: { key: 'tabOriginal', icon: 'document' },
};

export function ResultScreen({
  document,
  aiAvailable,
}: {
  document: LoadedDocument;
  aiAvailable: boolean;
}) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(resultReducer, initialResultState);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const tabRefs = useRef(new Map<ResultTab, HTMLButtonElement>());
  const baseId = useId();
  const { analysis } = document;
  const askCounter = useRef(0);

  const ask = useCallback(
    async (question: string) => {
      askCounter.current += 1;
      const id = `ask-${askCounter.current}`;
      dispatch({ type: 'askStarted', id, question });
      try {
        const result = await api.ask({
          text: document.text,
          question,
          language: analysis.language,
        });
        dispatch({ type: 'askFinished', id, result });
      } catch (error) {
        const code = error instanceof ApiClientError ? error.code : 'internal';
        dispatch({
          type: 'askFailed',
          id,
          errorKey: `error_${code === 'cancelled' ? 'internal' : code}` as MessageKey,
        });
      }
    },
    [analysis.language, document.text],
  );

  if (analysis.category === 'not-legal') {
    return (
      <div className="result screen">
        <Overview
          document={document}
          perspective={null}
          onPerspectiveChange={() => undefined}
          headingRef={headingRef}
        />
      </div>
    );
  }

  // WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends.
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const index = RESULT_TABS.indexOf(state.tab);
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: RESULT_TABS.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = RESULT_TABS[(target + RESULT_TABS.length) % RESULT_TABS.length] ?? 'points';
    dispatch({ type: 'setTab', tab: next });
    tabRefs.current.get(next)?.focus();
  };

  const selectedPoint = analysis.points.find((point) => point.id === state.selectedPointId);
  const openPoint = (pointId: string): void => dispatch({ type: 'openPoint', pointId });
  const showInOriginal = (pointId: string): void => dispatch({ type: 'showInOriginal', pointId });
  const asked = state.asks.flatMap((entry) =>
    entry.result ? [{ question: entry.question, basis: entry.result.basis }] : [],
  );

  return (
    <div className="result screen">
      <Overview
        document={document}
        perspective={state.perspective}
        onPerspectiveChange={(perspective) => dispatch({ type: 'setPerspective', perspective })}
        headingRef={headingRef}
      />

      <div className="tabs no-print" role="tablist" aria-label={t('tabsLabel')}>
        {RESULT_TABS.map((tab) => (
          <button
            key={tab}
            ref={(element) => {
              if (element) tabRefs.current.set(tab, element);
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab}`}
            aria-controls={`${baseId}-panel`}
            aria-selected={state.tab === tab}
            tabIndex={state.tab === tab ? 0 : -1}
            className="tabs__tab"
            onClick={() => dispatch({ type: 'setTab', tab })}
            onKeyDown={onTabKeyDown}
          >
            <Icon name={TAB_INFO[tab].icon} className="tabs__icon" />
            <span className="tabs__label">{t(TAB_INFO[tab].key)}</span>
          </button>
        ))}
      </div>

      <div
        id={`${baseId}-panel`}
        key={state.tab}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${state.tab}`}
        className="tabs__panel screen"
        tabIndex={-1}
      >
        <Suspense fallback={<Spinner />}>
          {state.tab === 'points' && (
            <PointsView
              analysis={analysis}
              perspective={state.perspective}
              checks={state.checks}
              selectedPointId={state.selectedPointId}
              onCheck={(pointId, outcome) => dispatch({ type: 'recordCheck', pointId, outcome })}
              onOpenPoint={openPoint}
              onShowInOriginal={showInOriginal}
            />
          )}
          {state.tab === 'whatif' && <WhatIfView analysis={analysis} onOpenPoint={openPoint} />}
          {state.tab === 'ask' && (
            <AskView
              analysis={analysis}
              aiAvailable={aiAvailable}
              entries={state.asks}
              onAsk={(question) => void ask(question)}
            />
          )}
          {state.tab === 'next' && (
            <NextStepsView
              analysis={analysis}
              perspective={state.perspective}
              brief={{ analysis, checks: state.checks, asked }}
            />
          )}
          {state.tab === 'original' && <OriginalView text={document.text} point={selectedPoint} />}
        </Suspense>
      </div>
    </div>
  );
}
