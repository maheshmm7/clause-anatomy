import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/ui';
import { BottomNav } from '../features/shell/BottomNav';
import { Sidebar } from '../features/shell/Sidebar';
import { Topbar } from '../features/shell/Topbar';
import { SiteFooter } from '../features/site/SiteChrome';
import { useMediaQuery } from '../hooks/dom';
import { useI18n } from '../i18n/I18nProvider';
import { readPreference, writePreference } from '../lib/storage';
import { useSettings } from '../settings/SettingsProvider';
import type { useDocumentFlow } from './useDocumentFlow';
import { isDocumentView } from './workspace';
import { useWorkspace } from './WorkspaceContext';

// Sections load on demand: each is its own small chunk.
const OverviewView = lazy(async () => ({
  default: (await import('../features/overview/OverviewView')).OverviewView,
}));
const ClausesView = lazy(async () => ({
  default: (await import('../features/clauses/ClausesView')).ClausesView,
}));
const DocumentView = lazy(async () => ({
  default: (await import('../features/document/DocumentView')).DocumentView,
}));
const RiskView = lazy(async () => ({
  default: (await import('../features/risks/RiskView')).RiskView,
}));
const WhatIfView = lazy(async () => ({
  default: (await import('../features/whatif/WhatIfView')).WhatIfView,
}));
const AskView = lazy(async () => ({ default: (await import('../features/ask/AskView')).AskView }));
const GlossaryView = lazy(async () => ({
  default: (await import('../features/glossary/GlossaryView')).GlossaryView,
}));
const PlanView = lazy(async () => ({
  default: (await import('../features/plan/PlanView')).PlanView,
}));
const CompareView = lazy(async () => ({
  default: (await import('../features/compare/CompareView')).CompareView,
}));
const HomeView = lazy(async () => ({
  default: (await import('../features/home/HomeView')).HomeView,
}));
const WorkingScreen = lazy(async () => ({
  default: (await import('../features/working/WorkingScreen')).WorkingScreen,
}));
const WorkspacePalette = lazy(async () => ({
  default: (await import('../features/shell/CommandPalette')).WorkspacePalette,
}));
const SettingsDialog = lazy(async () => ({
  default: (await import('../features/shell/SettingsDialog')).SettingsDialog,
}));

const SECTION_VIEWS = {
  overview: OverviewView,
  clauses: ClausesView,
  document: DocumentView,
  risks: RiskView,
  whatif: WhatIfView,
  ask: AskView,
  glossary: GlossaryView,
  plan: PlanView,
  compare: CompareView,
} as const;

/** The sidebar's collapsed state on large screens, remembered on this device. */
function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => readPreference('sidebar') === 'collapsed');
  const update = useCallback((next: boolean) => {
    setCollapsed(next);
    writePreference('sidebar', next ? 'collapsed' : 'expanded');
  }, []);
  return [collapsed, update];
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
  );
}

export interface WorkspaceLayoutProps {
  flow: ReturnType<typeof useDocumentFlow>;
  aiAvailable: boolean | null;
  openLanding: () => void;
}

/**
 * The workspace dashboard: sidebar (full, collapsed or drawer), top bar, the current
 * section, bottom bar on phones, search palette and settings. Loaded as its own chunk so
 * the public home page stays light.
 */
export function WorkspaceLayout({ flow, aiAvailable, openLanding }: WorkspaceLayoutProps) {
  const { t } = useI18n();
  const { theme, setTheme } = useSettings();
  const { state, doc, go } = useWorkspace();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Back/Forward closes any open menu.
  useEffect(() => {
    const close = (): void => {
      setMenuOpen(false);
      setPaletteOpen(false);
    };
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  // Ctrl/⌘ + K or "/" opens search.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (combo || (event.key === '/' && !isTyping(event.target))) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Fetch the search and settings chunks when the browser is idle, so they open instantly.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('../features/shell/CommandPalette');
      void import('../features/shell/SettingsDialog');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const Section = state.view === 'home' ? null : SECTION_VIEWS[state.view];
  const showBottomNav = Boolean(doc) && isDocumentView(state.view);
  const railCollapsed = wide && collapsed;
  const drawerOpen = menuOpen && !wide;
  const openSettings = (): void => setSettingsOpen(true);

  return (
    <>
      <div
        className={`app${showBottomNav ? ' app--with-bottom-nav' : ''}${railCollapsed ? ' app--rail-collapsed' : ''}`}
      >
        <aside id="workspace-sidebar" className="app__rail no-print">
          <Sidebar
            state={state}
            collapsed={railCollapsed}
            onToggleCollapsed={() => setCollapsed(!collapsed)}
            onNavigate={(view, docId) => go(view, { docId })}
            onOpenSettings={openSettings}
          />
        </aside>

        <div className="app__main">
          <Topbar
            view={state.view}
            doc={doc}
            wide={wide}
            railCollapsed={railCollapsed}
            menuOpen={drawerOpen}
            onOpenMenu={() => setMenuOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenSettings={openSettings}
            onNavigate={(view) => go(view)}
          />
          <main id="main" className={`workspace workspace--${state.view}`} tabIndex={-1}>
            <Suspense fallback={<Spinner />}>
              {flow.state.stage === 'working' ? (
                <WorkingScreen step={flow.state.step} onCancel={flow.cancel} />
              ) : Section ? (
                <Section key={`${state.view}-${state.activeId}`} />
              ) : (
                <HomeView
                  aiAvailable={aiAvailable}
                  error={flow.state.error}
                  pending={flow.state.pending}
                  onSubmitText={(text) => void flow.submitText(text)}
                  onSubmitFile={(file) => void flow.submitFile(file)}
                  onLoadSample={(id) => void flow.loadSample(id)}
                  onConfirmConsent={(pending) => void flow.confirmConsent(pending)}
                  onCancelConsent={flow.cancelConsent}
                />
              )}
            </Suspense>
          </main>
          <SiteFooter compact />
        </div>

        {showBottomNav && (
          <BottomNav
            view={state.view}
            onNavigate={(view) => go(view)}
            onOpenMenu={() => setMenuOpen(true)}
          />
        )}

        {drawerOpen && (
          <Dialog
            id="workspace-drawer"
            label={t('navMainLabel')}
            className="drawer-panel"
            onClose={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className="icon-btn drawer-panel__close"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="x" />
              <span className="visually-hidden">{t('closeMenu')}</span>
            </button>
            <Sidebar
              state={state}
              onNavigate={(view, docId) => go(view, { docId })}
              onOpenSettings={openSettings}
              onAfterNavigate={() => setMenuOpen(false)}
            />
          </Dialog>
        )}

        {paletteOpen && (
          <Suspense fallback={null}>
            <WorkspacePalette
              state={state}
              handlers={{
                go,
                toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
                openSettings,
                openLanding: () => {
                  setPaletteOpen(false);
                  openLanding();
                },
              }}
              onClose={() => setPaletteOpen(false)}
            />
          </Suspense>
        )}
      </div>
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsDialog onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
