import type { WorkingStep } from '../../app/flow';
import { Icon } from '../../components/Icon';
import { Spinner } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';

const STEPS: readonly { step: WorkingStep; key: MessageKey }[] = [
  { step: 'reading', key: 'workingReading' },
  { step: 'protecting', key: 'workingProtecting' },
  { step: 'explaining', key: 'workingExplaining' },
];

export function WorkingScreen({ step, onCancel }: { step: WorkingStep; onCancel: () => void }) {
  const { t } = useI18n();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const currentIndex = STEPS.findIndex((item) => item.step === step);
  const currentKey = STEPS[currentIndex]?.key ?? 'workingReading';

  return (
    <div className="working" aria-busy="true">
      <Spinner />
      <h1 ref={headingRef} tabIndex={-1} aria-live="polite">
        {t(currentKey)}
      </h1>
      <ol className="working__steps">
        {STEPS.map((item, index) => {
          const state =
            index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'waiting';
          return (
            <li
              key={item.step}
              className={`working__step working__step--${state}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <Icon name={state === 'done' ? 'checkCircle' : 'clock'} />
              {t(item.key)}
            </li>
          );
        })}
      </ol>
      <p className="muted">{t('workingHint')}</p>
      <button type="button" className="button button--secondary" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
