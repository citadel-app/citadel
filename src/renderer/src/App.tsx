import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { SplashScreen } from './components/SplashScreen';
import { LoadingPlaceholder } from './components/LoadingPlaceholder';
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
import { ToastProvider } from './context/ToastContext';
import './assets/main.css';

import { SafeCloseHandler } from './components/SafeCloseHandler';
import { useLocation } from 'react-router-dom';
import { ToastViewport } from './components/ui/toast';

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
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })));

const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const LoadingFallback = () => (
  <LoadingPlaceholder fullScreen />
);

const AppContent = () => {
  const { vaultPath, isLoading, setVaultPath, pendingDeepLink, setPendingDeepLink } = useConfig();
  const [stepResolved, setStepResolved] = useState(false);

  // Resolve initial step for WelcomePage when no vault is set
  useEffect(() => {
    if (!isLoading && !vaultPath && !stepResolved) {
      const resolveStep = async () => {
        // PRIORITY 1: Check if we have a pending deep link from startup handled by ConfigContext
        // We just need to make sure we resolve the step to show the WelcomePage
        if (pendingDeepLink) {
          console.log('[App] Startup deep link detected in context');
          setStepResolved(true);
          return;
        }

        // PRIORITY 2: Check standard auth state
        const authPromise = (async () => {
          try {
            const token = await window.api.secrets.get('github_token');
            if (token) {
              const user = await window.api.github.getUser(token);
              if (user) {
                // Resolved authenticated state
              }
            }
          } catch (e) {
            console.warn('[App] Auth resolution failed or timed out:', e);
          }
        })();

        // Safety timeout: if auth check takes > 5s, just proceed to default (auth-gate)
        await Promise.race([
          authPromise,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);

        setStepResolved(true);
      };
      resolveStep();
    } else if (!isLoading && vaultPath) {
      setStepResolved(true);
    }
  }, [isLoading, vaultPath, stepResolved, pendingDeepLink]);

  // When we have a vault path, switch window to main (resizable) mode
  useEffect(() => {
    if (vaultPath) {
      window.api.window.setupMain();
    }
  }, [vaultPath]);

  // Global Deep Link Handler (for subsequent links while app is open)
  useEffect(() => {
    const cleanup = window.api.app.onDeepLink((url: string) => {
      console.log('[App] Received live deep link:', url);
      try {
        if (url.startsWith('citadel://') || url.startsWith('codex://')) {
          const urlObj = new URL(url);
          if (urlObj.hostname === 'clone' || urlObj.pathname.includes('clone')) {
            const targetUrl = urlObj.searchParams.get('url');
            if (targetUrl) {
              localStorage.setItem('citadel-pending-clone-url', targetUrl);
              setPendingDeepLink(url); // Store the full URL in context

              // If we are currently in a workspace, close it to show the WelcomePage
              if (vaultPath) {
                console.log('[App] Deep link received while in workspace: switching to WelcomePage');
                setVaultPath(null);
              }
            }
          }
        }
      } catch (e) {
        console.error('[App] Failed to parse live deep link:', e);
      }
    });
    return cleanup;
  }, [setVaultPath, vaultPath, setPendingDeepLink]);

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
                <Route path="/" element={<WelcomePage />} />
                <Route path="/workspace-builder" element={<WorkspaceBuilderPage />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <Route element={<MainLayout />}>
                <Route path="/design-system" element={<DesignSystemPage />} />
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
        <ToastProvider>
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
                                  <ToastViewport />
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
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
