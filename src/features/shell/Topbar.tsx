import { VIEW_META } from '../../app/navigation';
import type { View, WorkspaceDoc } from '../../app/workspace';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * Top bar: sidebar toggle, breadcrumb (workspace / paper / section), the paper's status,
 * search, settings and "new paper". The toggle collapses the sidebar on large screens and
 * opens the menu drawer on phones and tablets; small screens also show the brand.
 */
export function Topbar({
  view,
  doc,
  wide,
  sidebarExpanded,
  onToggleSidebar,
  onOpenPalette,
  onOpenSettings,
  onNavigate,
}: {
  view: View;
  doc: WorkspaceDoc | null;
  /** Large screen: the sidebar is part of the page rather than a drawer. */
  wide: boolean;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
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
      <button
        type="button"
        className="icon-btn topbar__toggle"
        aria-expanded={sidebarExpanded}
        aria-controls={wide ? 'workspace-sidebar' : 'workspace-drawer'}
        onClick={onToggleSidebar}
      >
        <Icon name={wide ? 'sidebar' : 'menu'} />
        <span className="visually-hidden">
          {wide ? t(sidebarExpanded ? 'collapseSidebar' : 'expandSidebar') : t('openMenu')}
        </span>
      </button>
      {!wide && (
        <a className="topbar__brand" href="#/">
          <Logo size={32} />
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
