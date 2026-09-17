import { VIEW_META } from '../../app/navigation';
import { DOCUMENT_VIEWS, type View, type WorkspaceState } from '../../app/workspace';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nProvider';

export interface SidebarProps {
  state: WorkspaceState;
  onNavigate: (view: View, docId?: string) => void;
  onOpenSettings: () => void;
  /** Icon-only rail on large screens. Labels stay available to screen readers. */
  collapsed?: boolean;
  /** Called after any navigation (the phone drawer closes itself). */
  onAfterNavigate?: () => void;
}

/**
 * The workspace rail: numbered sections for the open paper and the session library.
 * A fixed sidebar (full or collapsed) on large screens, and the menu drawer on phones
 * and tablets. Preferences live in the settings dialog, not here.
 */
export function Sidebar({
  state,
  onNavigate,
  onOpenSettings,
  collapsed = false,
  onAfterNavigate,
}: SidebarProps) {
  const { t } = useI18n();
  const activeDoc = state.docs.find((doc) => doc.id === state.activeId) ?? null;
  const go = (view: View, docId?: string): void => {
    onNavigate(view, docId);
    onAfterNavigate?.();
  };
  // Collapsed buttons show a native tooltip with their name.
  const tip = (label: string): string | undefined => (collapsed ? label : undefined);

  const navButton = (view: View, disabled = false, badge?: string | number) => {
    const meta = VIEW_META[view];
    const label = t(meta.labelKey);
    return (
      <button
        type="button"
        className="rail__link"
        aria-current={state.view === view ? 'page' : undefined}
        disabled={disabled}
        title={tip(label)}
        onClick={() => go(view)}
      >
        <span className="rail__number" aria-hidden="true">
          {meta.number}
        </span>
        <Icon name={meta.icon} />
        <span className="rail__label">{label}</span>
        {badge !== undefined && <span className="rail__badge">{badge}</span>}
      </button>
    );
  };

  return (
    <div className={`rail${collapsed ? ' rail--collapsed' : ''}`}>
      <a className="rail__brand" href="#/" title={tip(t('footerHome'))}>
        <Logo size={collapsed ? 34 : 38} />
        <span className="rail__brand-text">
          <span className="rail__name">{t('appName')}</span>
          <span className="rail__tagline">{t('brandTagline')}</span>
        </span>
      </a>

      <nav className="rail__nav" aria-label={t('navMainLabel')}>
        <ul className="rail__list">
          <li>{navButton('home')}</li>
        </ul>

        <p className="rail__section" id="rail-document">
          {t('navDocumentSection')}
        </p>
        {!collapsed &&
          (activeDoc ? (
            <p className="rail__doc" lang={activeDoc.loaded.analysis.language}>
              {activeDoc.loaded.analysis.documentType}
            </p>
          ) : (
            <p className="rail__empty">{t('navNoDocument')}</p>
          ))}
        <ul className="rail__list" aria-labelledby="rail-document">
          {DOCUMENT_VIEWS.map((view) => (
            <li key={view}>
              {navButton(
                view,
                !activeDoc,
                view === 'clauses' && activeDoc
                  ? activeDoc.loaded.analysis.points.length
                  : undefined,
              )}
            </li>
          ))}
        </ul>

        {state.docs.length > 0 && (
          <>
            <p className="rail__section" id="rail-library">
              {t('navLibrarySection')}
            </p>
            <ul className="rail__list" aria-labelledby="rail-library">
              {state.docs.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    className="rail__link rail__link--doc"
                    aria-current={doc.id === state.activeId ? 'true' : undefined}
                    title={tip(doc.loaded.analysis.documentType)}
                    onClick={() => go('overview', doc.id)}
                    lang={doc.loaded.analysis.language}
                  >
                    <Icon name="document" />
                    <span className="rail__label">{doc.loaded.analysis.documentType}</span>
                  </button>
                </li>
              ))}
              <li>{navButton('compare', state.docs.length < 2)}</li>
            </ul>
          </>
        )}
      </nav>

      <div className="rail__footer">
        <button
          type="button"
          className="rail__link rail__link--tool"
          title={tip(t('openSettings'))}
          onClick={() => {
            onAfterNavigate?.();
            onOpenSettings();
          }}
        >
          <Icon name="sliders" />
          <span className="rail__label">{t('openSettings')}</span>
        </button>
        <a className="rail__link rail__link--aid" href="tel:15100" title={tip(t('legalAidShort'))}>
          <Icon name="phone" />
          <span className="rail__label">{t('legalAidShort')}</span>
        </a>
      </div>
    </div>
  );
}
