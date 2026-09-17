import { VIEW_META } from '../../app/navigation';
import type { View, WorkspaceDoc } from '../../app/workspace';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * Top bar: breadcrumb (workspace / paper / section), the paper's status, search and
 * "new paper". On small screens it also carries the menu button and the brand.
 */
export function Topbar({
  view,
  doc,
  onOpenMenu,
  onOpenPalette,
  onNavigate,
  menuOpen,
}: {
  view: View;
  doc: WorkspaceDoc | null;
  onOpenMenu: () => void;
  onOpenPalette: () => void;
  onNavigate: (view: View) => void;
  menuOpen: boolean;
}) {
  const { t } = useI18n();
  const meta = VIEW_META[view];
  const analysis = doc?.loaded.analysis;
  const verified = analysis?.points.filter((point) => point.verified).length ?? 0;
  const showDoc = Boolean(analysis) && view !== 'home' && view !== 'compare';

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn topbar__menu"
        aria-expanded={menuOpen}
        aria-controls="workspace-drawer"
        onClick={onOpenMenu}
      >
        <Icon name="menu" />
        <span className="visually-hidden">{t('openMenu')}</span>
      </button>
      <button type="button" className="topbar__brand" onClick={() => onNavigate('home')}>
        <Logo size={30} />
        <span className="visually-hidden">{t('appName')}</span>
      </button>

      <nav className="crumbs" aria-label={t('breadcrumbLabel')}>
        <ol>
          <li>
            <button type="button" className="crumbs__link" onClick={() => onNavigate('home')}>
              {t('navWorkspace')}
            </button>
          </li>
          {showDoc && analysis && (
            <li className="crumbs__doc" lang={analysis.language}>
              <button type="button" className="crumbs__link" onClick={() => onNavigate('overview')}>
                {analysis.documentType}
              </button>
            </li>
          )}
          {view !== 'home' && (
            <li>
              <span aria-current="page">{t(meta.labelKey)}</span>
            </li>
          )}
        </ol>
      </nav>

      <div className="topbar__actions">
        {showDoc && analysis && (
          <ul className="topbar__status">
            <li className="chip chip--ok">
              <Icon name="shieldCheck" />
              {t('statusVerified', { verified, total: analysis.points.length })}
            </li>
            {analysis.urgency.level !== 'none' && (
              <li className={`chip chip--${analysis.urgency.level}`}>
                <Icon name="alert" />
                {t(analysis.urgency.level === 'urgent' ? 'statusUrgent' : 'statusSoon')}
              </li>
            )}
          </ul>
        )}
        <button type="button" className="btn btn--search" onClick={onOpenPalette}>
          <Icon name="search" />
          <span className="btn__label">{t('searchButton')}</span>
          <kbd className="kbd" aria-hidden="true">
            Ctrl K
          </kbd>
        </button>
        {view !== 'home' && (
          <button
            type="button"
            className="btn btn--primary btn--new"
            onClick={() => onNavigate('home')}
          >
            <Icon name="plus" />
            <span className="btn__label">{t('newDocument')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
