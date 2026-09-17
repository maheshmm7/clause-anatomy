import {
  ExplanationLanguageSelect,
  LanguageSwitch,
  ReadingLevelSwitch,
  TextSizeSwitch,
  ThemeSwitch,
} from '../../components/controls';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n/I18nProvider';

/** All preferences in one place. Changes apply immediately and stay on this device. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog id="settings-dialog" label={t('openSettings')} className="modal" onClose={onClose}>
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
          <ExplanationLanguageSelect />
          <ReadingLevelSwitch />
        </section>
        <section className="settings-group" aria-labelledby="settings-display">
          <h3 id="settings-display" className="settings-group__title">
            {t('settingsDisplaySection')}
          </h3>
          <ThemeSwitch />
          <TextSizeSwitch />
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
