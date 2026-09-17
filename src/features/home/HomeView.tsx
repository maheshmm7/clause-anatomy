import { useId, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { LIMITS } from '../../../shared/limits';
import type { FlowError, PendingUpload } from '../../app/flow';
import { useWorkspace } from '../../app/WorkspaceContext';
import { ExplanationLanguageSelect } from '../../components/controls';
import { Icon, type IconName } from '../../components/Icon';
import { Notice, Panel } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { needsAttention } from '../../lib/perspective';
import { SAMPLES, type SampleId } from '../../samples';
import { ConsentPanel } from './ConsentPanel';

type Drawer = 'paste' | 'samples' | null;

export interface HomeViewProps {
  aiAvailable: boolean | null;
  error: FlowError | null;
  pending: PendingUpload | null;
  onSubmitText: (text: string) => void;
  onSubmitFile: (file: File) => void;
  onLoadSample: (id: SampleId) => void;
  onConfirmConsent: (pending: PendingUpload) => void;
  onCancelConsent: () => void;
}

interface TileProps {
  index: string;
  icon: IconName;
  title: string;
  hint: string;
  tone: 'yellow' | 'blue' | 'mint' | 'paper';
  disabled?: boolean;
  expanded?: boolean;
  controls?: string;
  dropActive?: boolean;
  extra?: string;
  onClick: () => void;
  onDragOver?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent<HTMLButtonElement>) => void;
}

function IntakeTile(props: TileProps) {
  return (
    <button
      type="button"
      className={`intake intake--${props.tone}${props.dropActive ? ' intake--drop' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-expanded={props.expanded}
      aria-controls={props.controls}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      <span className="intake__index" aria-hidden="true">
        {props.index}
      </span>
      <Icon name={props.icon} className="intake__icon" />
      <span className="intake__title">{props.title}</span>
      <span className="intake__hint">{props.hint}</span>
      {props.extra && <span className="intake__extra">{props.extra}</span>}
    </button>
  );
}

const STEPS: readonly { title: MessageKey; hint: MessageKey }[] = [
  { title: 'howStep1', hint: 'howStep1Hint' },
  { title: 'howStep2', hint: 'howStep2Hint' },
  { title: 'howStep3', hint: 'howStep3Hint' },
];

/** Workspace home: add a paper, reopen papers from this session, try examples. */
export function HomeView(props: HomeViewProps) {
  const { t } = useI18n();
  const { state, go, dispatch } = useWorkspace();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [text, setText] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ids = { paste: useId(), samples: useId(), count: useId() };
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

  const toggle = (next: Exclude<Drawer, null>): void =>
    setDrawer((current) => (current === next ? null : next));

  return (
    <div className="view view--home">
      <header className="masthead">
        <p className="kicker">
          <span className="kicker__number">00</span>
          <span>{t('homeEyebrow')}</span>
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="masthead__title">
          {t('homeTitle')}
        </h1>
        <p className="masthead__lead">{t('homeLead')}</p>
        <dl className="statline">
          <div>
            <dt>{t('statLanguages')}</dt>
            <dd>10</dd>
          </div>
          <div>
            <dt>{t('statStored')}</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>{t('statChecked')}</dt>
            <dd>100%</dd>
          </div>
        </dl>
      </header>

      {props.error && (
        <Notice tone="danger" urgent title={t(props.error.key, props.error.values)} />
      )}
      {liveDisabled && <Notice tone="warning" title={t('aiOffline')} />}

      <div className="home-grid">
        <Panel number="01" title={t('inputTitle')} icon="plus" className="panel--intake">
          <ExplanationLanguageSelect />

          <div className="intake-grid">
            <IntakeTile
              index="A"
              tone="yellow"
              icon="camera"
              title={t('optionPhoto')}
              hint={t('optionPhotoHint')}
              disabled={liveDisabled}
              onClick={() => photoInput.current?.click()}
            />
            <IntakeTile
              index="B"
              tone="blue"
              icon="upload"
              title={t('optionUpload')}
              hint={t('optionUploadHint')}
              extra={liveDisabled ? undefined : t('dropHint')}
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
            <IntakeTile
              index="C"
              tone="mint"
              icon="paste"
              title={t('optionPaste')}
              hint={t('optionPasteHint')}
              disabled={liveDisabled}
              expanded={drawer === 'paste'}
              controls={ids.paste}
              onClick={() => toggle('paste')}
            />
            <IntakeTile
              index="D"
              tone="paper"
              icon="sparkle"
              title={t('optionSample')}
              hint={t('optionSampleHint')}
              expanded={drawer === 'samples'}
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

          {drawer === 'paste' && (
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
                <p id={ids.count} className="mono-note">
                  {t('charCount', {
                    count: text.length.toLocaleString(),
                    max: LIMITS.maxDocumentChars.toLocaleString(),
                  })}
                </p>
                <button
                  type="submit"
                  className="btn btn--primary btn--large"
                  disabled={text.trim().length === 0}
                >
                  <Icon name="sparkle" /> {t('pasteSubmit')}
                </button>
              </div>
            </form>
          )}

          {drawer === 'samples' && (
            <section id={ids.samples} className="drawer" aria-labelledby={`${ids.samples}-title`}>
              <h3 id={`${ids.samples}-title`} className="drawer__title">
                {t('samplesTitle')}
              </h3>
              <ul className="sample-list">
                {SAMPLES.map((sample, index) => (
                  <li key={sample.id}>
                    <button
                      type="button"
                      className="sample-row"
                      onClick={() => props.onLoadSample(sample.id)}
                    >
                      <span className="sample-row__index" aria-hidden="true">
                        D{index + 1}
                      </span>
                      <span className="sample-row__body">
                        <span className="sample-row__title">{t(sample.titleKey)}</span>
                        <span className="sample-row__hint">{t(sample.hintKey)}</span>
                      </span>
                      <Icon name="arrowRight" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="privacy-line">
            <Icon name="lock" /> {t('privacyNote')}
          </p>
        </Panel>

        <Panel
          number="02"
          title={t('libraryTitle')}
          icon="layers"
          className="panel--library"
          actions={
            state.docs.length > 1 ? (
              <button type="button" className="btn btn--small" onClick={() => go('compare')}>
                <Icon name="columns" /> {t('libraryCompare')}
              </button>
            ) : undefined
          }
        >
          {state.docs.length === 0 ? (
            <p className="empty">{t('libraryEmpty')}</p>
          ) : (
            <ul className="library">
              {state.docs.map((doc) => {
                const analysis = doc.loaded.analysis;
                const attention = analysis.points.filter((point) =>
                  needsAttention(point, doc.perspective),
                ).length;
                return (
                  <li key={doc.id} className="library__item">
                    <div className="library__main" lang={analysis.language}>
                      <p className="library__type">{analysis.documentType}</p>
                      <p className="library__meta">
                        <span>{t('libraryClauses', { count: analysis.points.length })}</span>
                        {attention > 0 && (
                          <span className="library__attention">
                            <Icon name="alert" /> {attention}
                          </span>
                        )}
                        {doc.id === state.activeId && (
                          <span className="library__active">{t('libraryActive')}</span>
                        )}
                      </p>
                    </div>
                    <div className="library__actions">
                      <button
                        type="button"
                        className="btn btn--small btn--primary"
                        onClick={() => go('overview', { docId: doc.id })}
                      >
                        {t('libraryOpen')}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => dispatch({ type: 'removeDocument', id: doc.id })}
                      >
                        <Icon name="x" />
                        <span className="visually-hidden">
                          {t('libraryRemove', { name: analysis.documentType })}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel number="03" title={t('howTitle')} icon="list" className="panel--how">
          <ol className="how">
            {STEPS.map((step, index) => (
              <li key={step.title} className="how__step">
                <span className="how__number" aria-hidden="true">
                  0{index + 1}
                </span>
                <span>
                  <strong>{t(step.title)}</strong>
                  <span className="how__hint">{t(step.hint)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
