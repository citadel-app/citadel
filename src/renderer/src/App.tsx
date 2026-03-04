import React, { Suspense, lazy } from 'react';
import { ThemeProvider } from 'next-themes';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { SplashScreen } from './components/SplashScreen';
import { LayoutProvider } from '@renderer/context/LayoutContext';
import { GitProvider } from '@renderer/context/GitContext';
import { RSSProvider } from '@renderer/context/RSSContext';
import { ConfigProvider, useConfig } from '@renderer/context/ConfigContext';
import { AppSettingsProvider } from '@renderer/context/AppSettingsContext';
import { YouTubeProvider } from '@renderer/context/YouTubeContext';
import { YouTubePlayerProvider } from '@renderer/context/YouTubePlayerContext';
import { FloatingYouTubePlayer } from './components/youtube/FloatingYouTubePlayer';
import { BackgroundIndexingProvider } from '@renderer/context/BackgroundIndexingContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AudioProvider } from '@renderer/context/AudioContext';
import { ReplProvider } from '@renderer/context/ReplContext';
import { TagCategoryProvider } from '@renderer/context/TagCategoryContext';
import { PeerProvider } from '@renderer/context/PeerContext';
import './assets/main.css';

import { SafeCloseHandler } from './components/SafeCloseHandler';
import { useLocation } from 'react-router-dom';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const GenericEntryView = lazy(() => import('./pages/GenericEntryView').then(m => ({ default: m.GenericEntryView })));
const WhiteboardPage = lazy(() => import('./pages/WhiteboardPage').then(m => ({ default: m.WhiteboardPage })));
const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })));
const RSSPage = lazy(() => import('./pages/RSSPage').then(m => ({ default: m.RSSPage })));
const SourceControlPage = lazy(() => import('./pages/SourceControlPage').then(m => ({ default: m.SourceControlPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SystemStatusPage = lazy(() => import('./pages/SystemStatusPage').then(m => ({ default: m.SystemStatusPage })));
const EntryBrowserPage = lazy(() => import('./pages/EntryBrowserPage').then(m => ({ default: m.EntryBrowserPage })));
const TagManagerPage = lazy(() => import('./pages/TagManagerPage').then(m => ({ default: m.TagManagerPage })));
const KanbanPage = lazy(() => import('./pages/KanbanPage').then(m => ({ default: m.KanbanPage })));
const DebugDatabasePage = lazy(() => import('./pages/DebugDatabasePage').then(m => ({ default: m.DebugDatabasePage })));
const WelcomePage = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const WorkspaceBuilderPage = lazy(() => import('./pages/WorkspaceBuilderPage').then(m => ({ default: m.WorkspaceBuilderPage })));
const NotebookPage = lazy(() => import('./pages/NotebookPage').then(m => ({ default: m.NotebookPage })));
const LatexEditorPage = lazy(() => import('./pages/LatexEditorPage').then(m => ({ default: m.LatexEditorPage })));
const NotesPage = lazy(() => import('./pages/NotesPage').then(m => ({ default: m.NotesPage })));
const YouTubePage = lazy(() => import('./pages/YouTubePage').then(m => ({ default: m.YouTubePage })));
const ReplPage = lazy(() => import('./pages/ReplPage').then(m => ({ default: m.ReplPage })));
const TagGraphPage = lazy(() => import('./pages/TagGraphPage'));

const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
  </div>
);

const AppContent = () => {
  const { vaultPath, isLoading, setVaultPath } = useConfig();
  const [initialStep, setInitialStep] = React.useState<'auth-gate' | 'logged-in-setup' | undefined>(undefined);
  const [stepResolved, setStepResolved] = React.useState(false);

  // Resolve initial step for WelcomePage when no vault is set
  React.useEffect(() => {
    if (!isLoading && !vaultPath && !stepResolved) {
      const resolveStep = async () => {
        try {
          const token = await window.api.secrets.get('github_token');
          if (token) {
            const user = await window.api.github.getUser(token);
            if (user) {
              setInitialStep('logged-in-setup');
            }
          }
        } catch {
          // Token invalid or no token — default to auth-gate
        }
        setStepResolved(true);
      };
      resolveStep();
    } else if (!isLoading && vaultPath) {
      setStepResolved(true);
    }
  }, [isLoading, vaultPath, stepResolved]);

  // When we have a vault path, switch window to main (resizable) mode
  React.useEffect(() => {
    if (vaultPath) {
      window.api.window.setupMain();
    }
  }, [vaultPath]);

  // Global Deep Link Handler
  React.useEffect(() => {
    const cleanup = window.api.app.onDeepLink((url: string) => {
      console.log('[App] Received global deep link:', url);
      try {
        if (url.startsWith('citadel://') || url.startsWith('codex://')) {
          const urlObj = new URL(url);
          if (urlObj.hostname === 'clone') {
            const targetUrl = urlObj.searchParams.get('url');
            if (targetUrl) {
              window.localStorage.setItem('citadel-pending-clone-url', targetUrl);
              window.dispatchEvent(new CustomEvent('citadel-deeplink-clone', { detail: targetUrl }));
              if (setVaultPath && vaultPath) {
                setVaultPath('');
              }
            }
          }
        }
      } catch (e) {
        console.error('[App] Failed to parse deep link:', e);
      }
    });
    return cleanup;
  }, [setVaultPath, vaultPath]);

  if (isLoading || (!vaultPath && !stepResolved)) {
    return <SplashScreen />;
  }

  return (
    <>
      <SafeCloseHandler />
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {!vaultPath ? (
              <>
                <Route path="/" element={<WelcomePage initialStep={initialStep || 'auth-gate'} />} />
                <Route path="/workspace-builder" element={<WorkspaceBuilderPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <Route element={<MainLayout />}>
                <Route path="/notebooks" element={<NotebookPage />} />
                <Route path="/codex" element={<HomePage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/whiteboard" element={<WhiteboardPage />} />
                <Route path="/source-control" element={<SourceControlPage />} />
                <Route path="/rss" element={<RSSPage />} />
                <Route path="/youtube" element={<YouTubePage />} />
                <Route path="/repl" element={<ReplPage />} />
                <Route path="/settings" element={<SettingsPage />}>
                  <Route path="intelligence" element={null} />
                  <Route path="execution" element={null} />
                  <Route path="workspace" element={null} />
                  <Route path="networking" element={null} />
                  <Route path="system" element={<SystemStatusPage />} />
                  <Route path="database" element={<DebugDatabasePage />} />
                </Route>
                <Route path="/browser" element={<RedirectWithSearch to="/" />} />
                <Route path="/system" element={<RedirectWithSearch to="/settings/system" />} />
                <Route path="/" element={<EntryBrowserPage />} />
                <Route path="/tags" element={<TagManagerPage />} />
                <Route path="/tag-graph" element={<TagGraphPage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/latex" element={<LatexEditorPage />} />
                <Route path="/:type/:id" element={<GenericEntryView />} />
              </Route>
            )}
          </Routes>
        </Suspense>
        <FloatingYouTubePlayer />
      </HashRouter>
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AppSettingsProvider>
          <ConfigProvider>
            <TagCategoryProvider>
              <GitProvider>
                <LayoutProvider>
                  <RSSProvider>
                    <YouTubeProvider>
                      <YouTubePlayerProvider>
                        <BackgroundIndexingProvider>
                          <AudioProvider>
                            <ReplProvider>
                              <PeerProvider>
                                <AppContent />
                              </PeerProvider>
                            </ReplProvider>
                          </AudioProvider>
                        </BackgroundIndexingProvider>
                      </YouTubePlayerProvider>
                    </YouTubeProvider>
                  </RSSProvider>
                </LayoutProvider>
              </GitProvider>
            </TagCategoryProvider>
          </ConfigProvider>
        </AppSettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
