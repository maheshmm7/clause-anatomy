import { VIEW_META } from '../../app/navigation';
import type { View, WorkspaceDoc } from '../../app/workspace';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * Top bar: breadcrumb (workspace / paper / section), the paper's status, a way back to
 * the home page, search, settings and "new paper". Phones and tablets also get the menu button and the logo; on large
 * screens the brand appears here only while the sidebar is collapsed (the sidebar's own
 * header holds the brand and the collapse toggle otherwise).
 */
export function Topbar({
  view,
  doc,
  wide,
  railCollapsed,
  menuOpen,
  onOpenMenu,
  onOpenPalette,
  onOpenSettings,
  onNavigate,
}: {
  view: View;
  doc: WorkspaceDoc | null;
  /** Large screen: the sidebar is part of the page rather than a drawer. */
  wide: boolean;
  railCollapsed: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  onNavigate: (view: View) => void;
}) {
  const { t } = useI18n();
  const meta = VIEW_META[view];
  const analysis = doc?.loaded.analysis;
  const verified = analysis?.points.filter((point) => point.verified).length ?? 0;
  const showDoc = Boolean(analysis) && view !== 'home' && view !== 'compare';

  return (
    <header className="topbar">
      {!wide && (
        <button
          type="button"
          className="icon-btn"
          aria-expanded={menuOpen}
          aria-controls="workspace-drawer"
          onClick={onOpenMenu}
        >
          <Icon name="menu" />
          <span className="visually-hidden">{t('openMenu')}</span>
        </button>
      )}
      {(!wide || railCollapsed) && (
        <a className="topbar__brand" href="#/">
          <Logo size={32} />
          {railCollapsed && (
            <span className="topbar__name" aria-hidden="true">
              {t('appName')}
            </span>
          )}
          <span className="visually-hidden">{t('appName')}</span>
        </a>
      )}

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
        <a className="icon-btn" href="#/" title={t('actionHomePage')}>
          <Icon name="home" />
          <span className="visually-hidden">{t('actionHomePage')}</span>
        </a>
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
        <button type="button" className="icon-btn" onClick={onOpenSettings}>
          <Icon name="sliders" />
          <span className="visually-hidden">{t('openSettings')}</span>
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
