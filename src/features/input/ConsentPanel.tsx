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
    <section className="consent screen" aria-labelledby="consent-title">
      <div className="consent__badge">
        <Icon name="shieldCheck" />
      </div>
      <h1 id="consent-title" ref={headingRef} tabIndex={-1}>
        {t('consentTitle')}
      </h1>
      {pending.previewUrl ? (
        <img className="consent__preview" src={pending.previewUrl} alt={t('photoPreviewAlt')} />
      ) : (
        <p className="consent__file">
          <Icon name="document" /> {t('selectedFile', { name: pending.fileName })}
        </p>
      )}
      <p className="consent__body">{t('consentBody')}</p>
      <div className="button-row button-row--center">
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
