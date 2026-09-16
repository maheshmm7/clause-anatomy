import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  EXPLANATION_LANGUAGES,
  LANGUAGE_INFO,
  isExplanationLanguage,
} from '../../../shared/languages';
import { LIMITS } from '../../../shared/limits';
import type { FlowError, PendingUpload } from '../../app/flow';
import { Icon, type IconName } from '../../components/Icon';
import { Notice } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { SAMPLES, type SampleId } from '../../samples';
import { useSettings } from '../../settings/SettingsProvider';
import { ConsentPanel } from './ConsentPanel';

type Panel = 'paste' | 'samples' | null;

interface InputScreenProps {
  aiAvailable: boolean | null;
  error: FlowError | null;
  pending: PendingUpload | null;
  onSubmitText: (text: string) => void;
  onSubmitFile: (file: File) => void;
  onLoadSample: (id: SampleId) => void;
  onConfirmConsent: (pending: PendingUpload) => void;
  onCancelConsent: () => void;
}

function OptionButton({
  icon,
  title,
  hint,
  disabled,
  expanded,
  controls,
  onClick,
}: {
  icon: IconName;
  title: string;
  hint: string;
  disabled?: boolean;
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="option"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      aria-controls={controls}
    >
      <Icon name={icon} className="option__icon" />
      <span className="option__title">{title}</span>
      <span className="option__hint">{hint}</span>
    </button>
  );
}

export function InputScreen(props: InputScreenProps) {
  const { t } = useI18n();
  const { explanationLanguage, setExplanationLanguage } = useSettings();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ids = { paste: useId(), samples: useId(), count: useId(), language: useId() };
  const liveDisabled = props.aiAvailable === false;

  if (props.pending) {
    return (
      <ConsentPanel
        pending={props.pending}
        onConfirm={props.onConfirmConsent}
        onCancel={props.onCancelConsent}
      />
    );
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Allow picking the same file again.
    if (file) props.onSubmitFile(file);
  };

  const onPaste = (event: FormEvent): void => {
    event.preventDefault();
    props.onSubmitText(text);
  };

  const toggle = (next: Exclude<Panel, null>): void =>
    setPanel((current) => (current === next ? null : next));

  return (
    <div className="input-screen">
      <div className="stack">
        <h1 ref={headingRef} tabIndex={-1}>
          {t('inputTitle')}
        </h1>
        <p className="lead">{t('inputHint')}</p>
      </div>

      {props.error && (
        <Notice tone="danger" urgent title={t(props.error.key, props.error.values)} />
      )}
      {liveDisabled && <Notice tone="warning" title={t('aiOffline')} />}

      <div className="field field--inline">
        <label htmlFor={ids.language}>
          <Icon name="globe" /> {t('explanationLanguageLabel')}
        </label>
        <select
          id={ids.language}
          value={explanationLanguage}
          onChange={(event) => {
            if (isExplanationLanguage(event.target.value))
              setExplanationLanguage(event.target.value);
          }}
        >
          {EXPLANATION_LANGUAGES.map((language) => (
            <option key={language} value={language} lang={language}>
              {LANGUAGE_INFO[language].nativeName}
              {language === 'en' ? '' : ` (${LANGUAGE_INFO[language].englishName})`}
            </option>
          ))}
        </select>
      </div>

      <div className="options">
        <OptionButton
          icon="camera"
          title={t('optionPhoto')}
          hint={t('optionPhotoHint')}
          disabled={liveDisabled}
          onClick={() => photoInput.current?.click()}
        />
        <OptionButton
          icon="upload"
          title={t('optionUpload')}
          hint={t('optionUploadHint')}
          disabled={liveDisabled}
          onClick={() => fileInput.current?.click()}
        />
        <OptionButton
          icon="paste"
          title={t('optionPaste')}
          hint={t('optionPasteHint')}
          disabled={liveDisabled}
          expanded={panel === 'paste'}
          controls={ids.paste}
          onClick={() => toggle('paste')}
        />
        <OptionButton
          icon="sparkle"
          title={t('optionSample')}
          hint={t('optionSampleHint')}
          expanded={panel === 'samples'}
          controls={ids.samples}
          onClick={() => toggle('samples')}
        />
      </div>

      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
        aria-label={t('optionPhoto')}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain,image/*"
        hidden
        onChange={onFile}
        aria-label={t('optionUpload')}
      />

      {panel === 'paste' && (
        <form id={ids.paste} className="card stack" onSubmit={onPaste}>
          <label htmlFor={`${ids.paste}-text`} className="card__title">
            {t('pasteLabel')}
          </label>
          <textarea
            id={`${ids.paste}-text`}
            value={text}
            rows={10}
            maxLength={LIMITS.maxDocumentChars}
            aria-describedby={ids.count}
            onChange={(event) => setText(event.target.value)}
          />
          <p id={ids.count} className="muted small">
            {t('charCount', {
              count: text.length.toLocaleString(),
              max: LIMITS.maxDocumentChars.toLocaleString(),
            })}
          </p>
          <button
            type="submit"
            className="button button--primary button--large"
            disabled={text.trim().length === 0}
          >
            <Icon name="sparkle" /> {t('pasteSubmit')}
          </button>
        </form>
      )}

      {panel === 'samples' && (
        <section id={ids.samples} className="card stack" aria-labelledby={`${ids.samples}-title`}>
          <h2 id={`${ids.samples}-title`} className="card__title">
            {t('samplesTitle')}
          </h2>
          <ul className="sample-list">
            {SAMPLES.map((sample) => (
              <li key={sample.id}>
                <button
                  type="button"
                  className="sample"
                  onClick={() => props.onLoadSample(sample.id)}
                >
                  <Icon name="document" />
                  <span>
                    <span className="sample__title">{t(sample.titleKey as MessageKey)}</span>
                    <span className="sample__hint">{t(sample.hintKey as MessageKey)}</span>
                  </span>
                  <Icon name="arrowRight" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="privacy-note">
        <Icon name="lock" /> {t('privacyNote')}
      </p>
    </div>
  );
}
