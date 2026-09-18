import {
  ExplanationLanguageSelect,
  LanguageSwitch,
  ReadingLevelSwitch,
  TextSizeSwitch,
  ThemeSwitch,
} from '../../components/controls';
import { useRef } from 'react';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiKeySettings } from './ApiKeySettings';

/**
 * All preferences in one place. Changes apply immediately and stay on this device.
 * Opened from a "use your own key" prompt, it starts at the key field.
 */
export function SettingsDialog({
  onClose,
  focusKeyField = false,
}: {
  onClose: () => void;
  focusKeyField?: boolean;
}) {
  const { t } = useI18n();
  const keyInput = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      id="settings-dialog"
      label={t('openSettings')}
      className="modal"
      onClose={onClose}
      initialFocus={focusKeyField ? keyInput : undefined}
    >
      <div className="modal__head">
        <h2 className="modal__title">
          <Icon name="sliders" /> {t('openSettings')}
        </h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <Icon name="x" />
          <span className="visually-hidden">{t('close')}</span>
        </button>
      </div>
      <div className="modal__body">
        <p className="hint">
          <Icon name="lock" /> {t('settingsIntro')}
        </p>
        <section className="settings-group" aria-labelledby="settings-language">
          <h3 id="settings-language" className="settings-group__title">
            {t('settingsLanguageSection')}
          </h3>
          <LanguageSwitch />
          <div className="settings-field">
            <ExplanationLanguageSelect />
            <p className="hint">{t('explanationLanguageHint')}</p>
          </div>
          <ReadingLevelSwitch />
        </section>
        <section className="settings-group" aria-labelledby="settings-display">
          <h3 id="settings-display" className="settings-group__title">
            {t('settingsDisplaySection')}
          </h3>
          <ThemeSwitch />
          <TextSizeSwitch />
        </section>
        <section className="settings-group" aria-labelledby="settings-key">
          <h3 id="settings-key" className="settings-group__title">
            {t('settingsKeySection')}
          </h3>
          <ApiKeySettings inputRef={keyInput} />
        </section>
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--primary" onClick={onClose}>
          <Icon name="check" /> {t('close')}
        </button>
      </div>
    </Dialog>
  );
}
