import type { PendingUpload } from '../../app/flow';
import { Icon } from '../../components/Icon';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * Photos and scans cannot be redacted before the AI reads them, so we ask first,
 * in plain words, and let the reader back out.
 */
export function ConsentPanel({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingUpload;
  onConfirm: (pending: PendingUpload) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <section className="consent" aria-labelledby="consent-title">
      <p className="kicker">
        <span className="kicker__number">
          <Icon name="shieldCheck" />
        </span>
        <span>{t('privacyNote')}</span>
      </p>
      <h1 id="consent-title" ref={headingRef} tabIndex={-1} className="consent__title">
        {t('consentTitle')}
      </h1>
      <div className="consent__grid">
        {pending.previewUrl ? (
          <img className="consent__preview" src={pending.previewUrl} alt={t('photoPreviewAlt')} />
        ) : (
          <p className="consent__file">
            <Icon name="document" /> {t('selectedFile', { name: pending.fileName })}
          </p>
        )}
        <div className="consent__text">
          <p>{t('consentBody')}</p>
          <div className="button-row">
            <button
              type="button"
              className="btn btn--primary btn--large"
              onClick={() => onConfirm(pending)}
            >
              <Icon name="check" /> {t('consentAccept')}
            </button>
            <button type="button" className="btn btn--large" onClick={onCancel}>
              {t('consentCancel')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
