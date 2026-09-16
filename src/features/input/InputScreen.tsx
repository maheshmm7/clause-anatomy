import { useId, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
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
import { AnatomyPreview } from './AnatomyPreview';
import { ConsentPanel } from './ConsentPanel';

type Panel = 'paste' | 'samples' | null;
type Accent = 'indigo' | 'violet' | 'teal' | 'saffron';

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

interface OptionTileProps {
  icon: IconName;
  accent: Accent;
  title: string;
  hint: string;
  disabled?: boolean;
  expanded?: boolean;
  controls?: string;
  dropActive?: boolean;
  extraHint?: string;
  onClick: () => void;
  onDragOver?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent<HTMLButtonElement>) => void;
}

function OptionTile(props: OptionTileProps) {
  return (
    <button
      type="button"
      className={`tile tile--${props.accent}${props.dropActive ? ' tile--drop' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-expanded={props.expanded}
      aria-controls={props.controls}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      <span className="tile__icon">
        <Icon name={props.icon} />
      </span>
      <span className="tile__title">{props.title}</span>
      <span className="tile__hint">{props.hint}</span>
      {props.extraHint && <span className="tile__extra">{props.extraHint}</span>}
    </button>
  );
}

const STEPS: readonly { icon: IconName; title: MessageKey; hint: MessageKey }[] = [
  { icon: 'upload', title: 'howStep1', hint: 'howStep1Hint' },
  { icon: 'lock', title: 'howStep2', hint: 'howStep2Hint' },
  { icon: 'checkCircle', title: 'howStep3', hint: 'howStep3Hint' },
];

export function InputScreen(props: InputScreenProps) {
  const { t } = useI18n();
  const { explanationLanguage, setExplanationLanguage } = useSettings();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState('');
  const [dropActive, setDropActive] = useState(false);
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

  const onDrop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setDropActive(false);
    const file = event.dataTransfer.files[0];
    if (file && !liveDisabled) props.onSubmitFile(file);
  };

  const onPaste = (event: FormEvent): void => {
    event.preventDefault();
    props.onSubmitText(text);
  };

  const toggle = (next: Exclude<Panel, null>): void =>
    setPanel((current) => (current === next ? null : next));

  return (
    <div className="input-screen screen">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow-pill">
            <Icon name="sparkle" /> {t('heroEyebrow')}
          </p>
          <h1 ref={headingRef} tabIndex={-1} className="hero__title">
            {t('inputTitle')}
          </h1>
          <p className="hero__lead">{t('inputHint')}</p>
          <ul className="trust">
            <li>
              <Icon name="lock" /> {t('trustPrivate')}
            </li>
            <li>
              <Icon name="shieldCheck" /> {t('trustVerified')}
            </li>
            <li>
              <Icon name="volume" /> {t('trustLanguages')}
            </li>
          </ul>
        </div>
        <AnatomyPreview />
      </section>

      <section className="start card card--raised" aria-label={t('inputTitle')}>
        {props.error && (
          <Notice tone="danger" urgent title={t(props.error.key, props.error.values)} />
        )}
        {liveDisabled && <Notice tone="warning" title={t('aiOffline')} />}

        <div className="start__language">
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

        <div className="tiles">
          <OptionTile
            icon="camera"
            accent="indigo"
            title={t('optionPhoto')}
            hint={t('optionPhotoHint')}
            disabled={liveDisabled}
            onClick={() => photoInput.current?.click()}
          />
          <OptionTile
            icon="upload"
            accent="violet"
            title={t('optionUpload')}
            hint={t('optionUploadHint')}
            extraHint={liveDisabled ? undefined : t('dropHint')}
            disabled={liveDisabled}
            dropActive={dropActive}
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={onDrop}
          />
          <OptionTile
            icon="paste"
            accent="teal"
            title={t('optionPaste')}
            hint={t('optionPasteHint')}
            disabled={liveDisabled}
            expanded={panel === 'paste'}
            controls={ids.paste}
            onClick={() => toggle('paste')}
          />
          <OptionTile
            icon="sparkle"
            accent="saffron"
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
          <form id={ids.paste} className="drawer" onSubmit={onPaste}>
            <label htmlFor={`${ids.paste}-text`} className="drawer__title">
              {t('pasteLabel')}
            </label>
            <textarea
              id={`${ids.paste}-text`}
              value={text}
              rows={9}
              maxLength={LIMITS.maxDocumentChars}
              aria-describedby={ids.count}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="drawer__footer">
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
            </div>
          </form>
        )}

        {panel === 'samples' && (
          <section id={ids.samples} className="drawer" aria-labelledby={`${ids.samples}-title`}>
            <h2 id={`${ids.samples}-title`} className="drawer__title">
              {t('samplesTitle')}
            </h2>
            <ul className="samples">
              {SAMPLES.map((sample) => (
                <li key={sample.id}>
                  <button
                    type="button"
                    className={`sample sample--${sample.id}`}
                    onClick={() => props.onLoadSample(sample.id)}
                  >
                    <span className="sample__icon">
                      <Icon name={sample.id === 'rental' ? 'home' : 'alert'} />
                    </span>
                    <span className="sample__body">
                      <span className="sample__title">{t(sample.titleKey)}</span>
                      <span className="sample__hint">{t(sample.hintKey)}</span>
                    </span>
                    <Icon name="arrowRight" className="sample__arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="privacy-note">
          <Icon name="lock" /> {t('privacyNote')}
        </p>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          {t('howTitle')}
        </h2>
        <ol className="how__steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="how__step">
              <span className="how__number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="how__icon">
                <Icon name={step.icon} />
              </span>
              <strong>{t(step.title)}</strong>
              <span className="muted">{t(step.hint)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
