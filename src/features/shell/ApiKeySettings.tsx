import { useId, useState, type FormEvent, type Ref } from 'react';
import { Icon } from '../../components/Icon';
import { ExternalLink } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { clearUserKey, saveUserKey, useHasUserKey } from '../../lib/userKey';

const AI_STUDIO_KEYS_URL = 'https://aistudio.google.com/apikey';

/**
 * Lets a reader add their own Gemini API key when the app's key is busy or used up.
 * The saved key is never shown again: it can only be replaced or removed.
 */
export function ApiKeySettings({ inputRef }: { inputRef?: Ref<HTMLInputElement> }) {
  const { t } = useI18n();
  const hasKey = useHasUserKey();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const ids = { input: useId(), privacy: useId(), error: useId() };

  const onSave = (event: FormEvent): void => {
    event.preventDefault();
    if (saveUserKey(value)) {
      setValue('');
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <form className="api-key" onSubmit={onSave} noValidate>
      <p className="hint">{t('apiKeyIntro')}</p>
      <p className="api-key__status" role="status">
        {hasKey && (
          <>
            <Icon name="key" /> {t('apiKeyActive')}
          </>
        )}
      </p>
      <div className="settings-field">
        <label htmlFor={ids.input} className="field-row__label">
          {t('apiKeyLabel')}
        </label>
        <input
          ref={inputRef}
          id={ids.input}
          type="password"
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${ids.error} ${ids.privacy}` : ids.privacy}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
        />
        {invalid && (
          <p id={ids.error} className="api-key__error" role="alert">
            {t('apiKeyInvalid')}
          </p>
        )}
        <p id={ids.privacy} className="hint">
          <Icon name="lock" /> {t('apiKeyPrivacy')}
        </p>
      </div>
      <div className="api-key__actions">
        <button type="submit" className="btn btn--primary" disabled={value.trim() === ''}>
          <Icon name="check" /> {t('apiKeySave')}
        </button>
        {hasKey && (
          <button type="button" className="btn" onClick={clearUserKey}>
            <Icon name="x" /> {t('apiKeyRemove')}
          </button>
        )}
      </div>
      <ExternalLink href={AI_STUDIO_KEYS_URL}>{t('apiKeyGet')}</ExternalLink>
    </form>
  );
}
