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

export function WorkingScreen({ step, onCancel }: { step: WorkingStep; onCancel: () => void }) {
  const { t } = useI18n();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const currentIndex = STEPS.findIndex((item) => item.step === step);
  const currentKey = STEPS[currentIndex]?.key ?? 'workingReading';

  return (
    <div className="working screen" aria-busy="true">
      <div className="scan" aria-hidden="true">
        <div className="scan__paper">
          <span className="scan__line scan__line--title" />
          <span className="scan__line" />
          <span className="scan__line scan__line--hl" />
          <span className="scan__line" />
          <span className="scan__line scan__line--short" />
          <span className="scan__line scan__line--hl2" />
          <span className="scan__line" />
          <span className="scan__beam" />
        </div>
        <span className="scan__orb scan__orb--1" />
        <span className="scan__orb scan__orb--2" />
      </div>

      <h1 ref={headingRef} tabIndex={-1} aria-live="polite" className="working__title">
        {t(currentKey)}
      </h1>

      <ol className="stepper">
        {STEPS.map((item, index) => {
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
              <span className="stepper__label">{t(item.key)}</span>
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
