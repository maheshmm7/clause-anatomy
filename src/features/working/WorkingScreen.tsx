import type { WorkingStep } from '../../app/flow';
import { Icon, type IconName } from '../../components/Icon';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';

const STEPS: readonly { step: WorkingStep; key: MessageKey; icon: IconName }[] = [
  { step: 'reading', key: 'workingReading', icon: 'document' },
  { step: 'protecting', key: 'workingProtecting', icon: 'lock' },
  { step: 'explaining', key: 'workingExplaining', icon: 'sparkle' },
];

/** Changing language translates the explanation only: one short step. */
const TRANSLATE_STEPS: typeof STEPS = [
  { step: 'translating', key: 'workingTranslating', icon: 'globe' },
];

export function WorkingScreen({ step, onCancel }: { step: WorkingStep; onCancel: () => void }) {
  const { t } = useI18n();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const steps = step === 'translating' ? TRANSLATE_STEPS : STEPS;
  const currentIndex = Math.max(
    0,
    steps.findIndex((item) => item.step === step),
  );
  const currentKey = steps[currentIndex]?.key ?? 'workingReading';

  return (
    <div className="working" aria-busy="true">
      <div className="working__counter" aria-hidden="true">
        <span className="working__current">0{currentIndex + 1}</span>
        <span className="working__total">/0{steps.length}</span>
      </div>
      <h1 ref={headingRef} tabIndex={-1} aria-live="polite" className="working__title">
        {t(currentKey)}
      </h1>

      <div className="scanner" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className={`scanner__line scanner__line--${index % 3}`} />
        ))}
        <span className="scanner__beam" />
      </div>

      <ol className="stepper">
        {steps.map((item, index) => {
          const state =
            index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'waiting';
          return (
            <li
              key={item.step}
              className={`stepper__step stepper__step--${state}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className="stepper__icon">
                <Icon name={state === 'done' ? 'check' : item.icon} />
              </span>
              <span>{t(item.key)}</span>
            </li>
          );
        })}
      </ol>

      <p className="hint">{t('workingHint')}</p>
      <button type="button" className="btn" onClick={onCancel}>
        <Icon name="x" /> {t('cancel')}
      </button>
    </div>
  );
}
