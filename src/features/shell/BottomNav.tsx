import { MOBILE_PRIMARY_VIEWS, VIEW_META } from '../../app/navigation';
import type { View } from '../../app/workspace';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n/I18nProvider';

/** Thumb-reach navigation for phones when a paper is open; "More" opens the full menu. */
export function BottomNav({
  view,
  onNavigate,
  onOpenMenu,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onOpenMenu: () => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('navDocumentSection')}>
      {MOBILE_PRIMARY_VIEWS.map((item) => {
        const meta = VIEW_META[item];
        return (
          <button
            key={item}
            type="button"
            className="bottom-nav__item"
            aria-current={view === item ? 'page' : undefined}
            onClick={() => onNavigate(item)}
          >
            <Icon name={meta.icon} />
            <span>{t(meta.labelKey)}</span>
          </button>
        );
      })}
      <button type="button" className="bottom-nav__item" onClick={onOpenMenu}>
        <Icon name="menu" />
        <span>{t('navMore')}</span>
      </button>
    </nav>
  );
}
