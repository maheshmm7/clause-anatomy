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
    <section className="card consent stack" aria-labelledby="consent-title">
      <h1 id="consent-title" ref={headingRef} tabIndex={-1}>
        <Icon name="shield" /> {t('consentTitle')}
      </h1>
      {pending.previewUrl ? (
        <img className="consent__preview" src={pending.previewUrl} alt={t('photoPreviewAlt')} />
      ) : (
        <p className="muted">
          <Icon name="document" /> {t('selectedFile', { name: pending.fileName })}
        </p>
      )}
      <p>{t('consentBody')}</p>
      <div className="button-row">
        <button
          type="button"
          className="button button--primary button--large"
          onClick={() => onConfirm(pending)}
        >
          <Icon name="check" /> {t('consentAccept')}
        </button>
        <button type="button" className="button button--secondary button--large" onClick={onCancel}>
          {t('consentCancel')}
        </button>
      </div>
    </section>
  );
}
