import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * A live, animated demonstration of the core idea on the first screen: one hard
 * sentence and the plain-language parts it is broken into. Real text, so screen
 * readers get the same explanation.
 */
export function AnatomyPreview() {
  const { t } = useI18n();
  return (
    <figure className="preview" aria-labelledby="preview-caption">
      <div className="preview__paper">
        <span className="preview__label">
          <Icon name="document" /> Clause 6
        </span>
        <p className="preview__clause" lang="en">
          “The Lessee <mark className="hl hl--must-not">shall not sublet</mark> the premises{' '}
          <mark className="hl hl--unless">without the prior written consent</mark> of the Lessor,{' '}
          <mark className="hl hl--broken">failing which the deposit shall stand forfeited</mark>.”
        </p>
      </div>
      <ul className="preview__parts">
        <li className="part part--must-not">
          <span className="part__icon">
            <Icon name="ban" />
          </span>
          <span>
            <strong>{t('anatomyYouMustNot')}</strong>
            <span className="part__text">{t('previewMustNot')}</span>
          </span>
        </li>
        <li className="part part--unless">
          <span className="part__icon">
            <Icon name="branch" />
          </span>
          <span>
            <strong>{t('anatomyUnless')}</strong>
            <span className="part__text">{t('previewUnless')}</span>
          </span>
        </li>
        <li className="part part--broken">
          <span className="part__icon">
            <Icon name="alert" />
          </span>
          <span>
            <strong>{t('anatomyIfBroken')}</strong>
            <span className="part__text">{t('previewBroken')}</span>
          </span>
        </li>
      </ul>
      <figcaption id="preview-caption" className="preview__caption">
        <Icon name="sparkle" /> {t('previewCaption')}
      </figcaption>
    </figure>
  );
}
