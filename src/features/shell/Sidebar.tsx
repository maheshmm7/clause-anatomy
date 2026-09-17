import { DOCUMENT_VIEWS, type View, type WorkspaceState } from '../../app/workspace';
import { VIEW_META } from '../../app/navigation';
import { LanguageSwitch, TextSizeSwitch, ThemeSwitch } from '../../components/controls';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nProvider';

export interface SidebarProps {
  state: WorkspaceState;
  onNavigate: (view: View, docId?: string) => void;
  onOpenLanguagePage: () => void;
  /** Called after any navigation (the phone drawer closes itself). */
  onAfterNavigate?: () => void;
}

/**
 * The workspace rail: numbered sections for the open paper, the session library,
 * and display settings. Used as a fixed sidebar on large screens and inside the
 * menu drawer on phones and tablets.
 */
export function Sidebar({ state, onNavigate, onOpenLanguagePage, onAfterNavigate }: SidebarProps) {
  const { t } = useI18n();
  const activeDoc = state.docs.find((doc) => doc.id === state.activeId) ?? null;
  const go = (view: View, docId?: string): void => {
    onNavigate(view, docId);
    onAfterNavigate?.();
  };

  const navButton = (view: View, disabled = false, badge?: string | number) => {
    const meta = VIEW_META[view];
    const current = state.view === view;
    return (
      <button
        type="button"
        className="rail__link"
        aria-current={current ? 'page' : undefined}
        disabled={disabled}
        onClick={() => go(view)}
      >
        <span className="rail__number" aria-hidden="true">
          {meta.number}
        </span>
        <Icon name={meta.icon} />
        <span className="rail__label">{t(meta.labelKey)}</span>
        {badge !== undefined && <span className="rail__badge">{badge}</span>}
      </button>
    );
  };

  return (
    <div className="rail">
      <button type="button" className="rail__brand" onClick={() => go('home')}>
        <Logo size={38} />
        <span className="rail__brand-text">
          <span className="rail__name">{t('appName')}</span>
          <span className="rail__tagline">{t('brandTagline')}</span>
        </span>
      </button>

      <nav className="rail__nav" aria-label={t('navMainLabel')}>
        <ul className="rail__list">
          <li>{navButton('home')}</li>
        </ul>

        <p className="rail__section" id="rail-document">
          {t('navDocumentSection')}
        </p>
        {activeDoc ? (
          <p className="rail__doc" lang={activeDoc.loaded.analysis.language}>
            {activeDoc.loaded.analysis.documentType}
          </p>
        ) : (
          <p className="rail__empty">{t('navNoDocument')}</p>
        )}
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
        <div className="rail__settings" role="group" aria-label={t('settingsLabel')}>
          <LanguageSwitch />
          <ThemeSwitch />
          <TextSizeSwitch />
        </div>
        <button type="button" className="rail__small-link" onClick={onOpenLanguagePage}>
          <Icon name="globe" /> {t('languagePage')}
        </button>
        <a className="rail__aid" href="tel:15100">
          <Icon name="phone" /> {t('legalAidShort')}
        </a>
      </div>
    </div>
  );
}
