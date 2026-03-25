import { Suspense, lazy, useState, useEffect, useMemo, useCallback, FC, ReactNode, ComponentType } from 'react';
import { ThemeProvider } from 'next-themes';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { SplashScreen, LoadingPlaceholder, ErrorBoundary, AudioProvider, ToastViewport } from '@citadel-app/ui';
import { LayoutProvider } from './context/LayoutContext';
import { GitProvider } from './context/GitContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { AppSettingsProvider, useAppSettings as useAppSettingsHook } from './context/AppSettingsContext';
import { BackgroundIndexingProvider } from './context/BackgroundIndexingContext';
import { TagCategoryProvider } from './context/TagCategoryContext';
import { PeerProvider } from './context/PeerContext';
import { ToastProvider, useToast as useToastHook } from '@citadel-app/ui';
import { CoreServicesContext } from '@citadel-app/ui';
import { dataManager } from './lib/data-manager';
import { db } from './lib/db';
import { commandRegistry } from './commands/CommandRegistry';
import { SafeCloseHandler } from './components/SafeCloseHandler';
import { buildFeedDb } from '@app/lib/core-services-factory';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const GenericEntryView = lazy(() => import('./pages/GenericEntryView').then(m => ({ default: m.GenericEntryView })));
const SourceControlPage = lazy(() => import('./pages/SourceControlPage').then(m => ({ default: m.SourceControlPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SystemStatusPage = lazy(() => import('./pages/SystemStatusPage').then(m => ({ default: m.SystemStatusPage })));
const EntryBrowserPage = lazy(() => import('./pages/EntryBrowserPage').then(m => ({ default: m.EntryBrowserPage })));
const TagManagerPage = lazy(() => import('./pages/TagManagerPage').then(m => ({ default: m.TagManagerPage })));
const KanbanPage = lazy(() => import('./pages/KanbanPage').then(m => ({ default: m.KanbanPage })));
const DebugDatabasePage = lazy(() => import('./pages/DebugDatabasePage').then(m => ({ default: m.DebugDatabasePage })));
const PluginManagerPage = lazy(() => import('./pages/PluginManagerPage').then(m => ({ default: m.PluginManagerPage })));
const WelcomePage = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const WorkspaceBuilderPage = lazy(() => import('./pages/WorkspaceBuilderPage').then(m => ({ default: m.WorkspaceBuilderPage })));
const NotebookPage = lazy(() => import('./pages/NotebookPage').then(m => ({ default: m.NotebookPage })));
const NotesPage = lazy(() => import('./pages/NotesPage').then(m => ({ default: m.NotesPage })));
const TagGraphPage = lazy(() => import('./pages/TagGraphPage'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })));

// The shell's module registry is injected into Base Module here implicitly:
// Wait, no. BaseModule can't import `appModuleRegistry` from `@renderer/...` easily without circular deps.
// Actually, it can! Because `appModuleRegistry` is explicitly in `src/renderer/src/lib/module-registry`.
import { appModuleRegistry } from './host-services';
// We'll define `@app/*` alias in tsconfig mapping back to `src/renderer/src/*`.
import { hostApi as __hostApi } from './host-services';

// Utility to nest multiple providers dynamically
const GlobalProviderChain: FC<{ providers: ComponentType<any>[]; children: ReactNode }> = ({ providers, children }) => {
  return providers.reduce((acc, Provider) => <Provider>{acc}</Provider>, <>{children}</>);
};

const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const LoadingFallback = ({ logoSrc }: { logoSrc?: string }) => <LoadingPlaceholder fullScreen bannerImgSrc={logoSrc} />;

const CoreServicesBridge: FC<{ children: ReactNode }> = ({ children }) => {
  const { vaultPath, config } = useConfig();
  const { settings, updateSetting: updateSettingFn } = useAppSettingsHook();
  const { toast } = useToastHook();

  const storage = useMemo(() => {
    const resolve = (relativePath: string) => {
      if (!vaultPath) throw new Error('No workspace open');
      return `${vaultPath}/${relativePath}`;
    };

    return {
      readJSON: async <T = unknown>(relativePath: string): Promise<T | null> => {
        const path = resolve(relativePath);
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', path))) return null;
        try {
          const content = await __hostApi.module.invoke('@citadel-app/base', 'fs.readFile', path);
          return JSON.parse(content) as T;
        } catch { return null; }
      },
      writeJSON: async <T = unknown>(relativePath: string, data: T): Promise<void> => {
        const path = resolve(relativePath);
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', dir))) {
          await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', dir);
        }
        await __hostApi.module.invoke('@citadel-app/base', 'fs.writeFile', path, JSON.stringify(data, null, 2));
      },
      readFile: async (relativePath: string): Promise<string | null> => {
        const path = resolve(relativePath);
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', path))) return null;
        try { return await __hostApi.module.invoke('@citadel-app/base', 'fs.readFile', path); }
        catch { return null; }
      },
      writeFile: async (relativePath: string, content: string): Promise<void> => {
        const path = resolve(relativePath);
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', dir))) {
          await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', dir);
        }
        await __hostApi.module.invoke('@citadel-app/base', 'fs.writeFile', path, content);
      },
      exists: async (relativePath: string): Promise<boolean> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.exists', resolve(relativePath));
      },
      subscribe: (callback: (event: string, data: any) => void) => {
        return dataManager.subscribe(callback);
      },
    };
  }, [vaultPath]);
  
    const feedDb = useMemo(() => buildFeedDb({ module: __hostApi.module } as any), []);

 

  const removeRelatedLinks = useCallback(
    (targetIds: string[], linkType: string) => dataManager.removeRelatedLinks(targetIds, linkType),
    []
  );

  const createLocalEntry = useCallback(
    (data: any) => dataManager.createEntry(data),
    []
  );

  useEffect(() => {
    appModuleRegistry.setHostDeps({
      getVaultPath: () => vaultPath,
      getConfig: () => config,
      getSettings: () => settings,
      getUpdateSetting: () => updateSettingFn,
      getToast: () => toast,
      getCreateLocalEntry: () => createLocalEntry,
      getRemoveRelatedLinks: () => removeRelatedLinks,
      getCommandRegistry: () => commandRegistry,
      getSubscribe: () => (callback: (event: string, data: any) => void) => dataManager.subscribe(callback),
    });
  }, [vaultPath, config, settings, updateSettingFn, toast, createLocalEntry, removeRelatedLinks]);

    const getPluginModules = useCallback(() => {
      return appModuleRegistry.getContentModules();
    }, []);

    const services = useMemo(() => ({
      vaultPath,
      config,
      settings,
      toast,
      storage,
      removeRelatedLinks,
      commandRegistry,
      createLocalEntry,
      updateSetting: updateSettingFn,
      db,
      dataManager,
      feedDb,
      hostApi: __hostApi,
      getPluginModules,
    }), [vaultPath, config, settings, toast, storage, feedDb, removeRelatedLinks, createLocalEntry, updateSettingFn, getPluginModules]);

  return (
    <CoreServicesContext.Provider value={services}>
      {children}
    </CoreServicesContext.Provider>
  );
};

const AppContent = ({ logoSrc }: { logoSrc?: string }) => {
  const { vaultPath, isLoading, setVaultPath, pendingDeepLink, setPendingDeepLink } = useConfig();
  const [stepResolved, setStepResolved] = useState(false);

  useEffect(() => {
    if (!isLoading && !vaultPath && !stepResolved) {
      const resolveStep = async () => {
        if (pendingDeepLink) {
          setStepResolved(true);
          return;
        }

        const authPromise = (async () => {
          try {
            const token = await __hostApi.module.invoke('@citadel-app/base', 'secrets.get', 'github_token');
            if (token) {
              const user = await __hostApi.module.invoke('@citadel-app/base', 'github.getUser', token);
            }
          } catch (e) {}
        })();

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

  useEffect(() => {
    if (vaultPath) {
      __hostApi.window.setupMain();
    }
  }, [vaultPath]);

  useEffect(() => {
    const cleanup = __hostApi.app.onDeepLink((url: string) => {
      try {
        if (url.startsWith('citadel://') || url.startsWith('codex://')) {
          const urlObj = new URL(url);
          if (urlObj.hostname === 'clone' || urlObj.pathname.includes('clone')) {
            const targetUrl = urlObj.searchParams.get('url');
            if (targetUrl) {
              localStorage.setItem('citadel-pending-clone-url', targetUrl);
              setPendingDeepLink(url);
              if (vaultPath) {
                setVaultPath(null);
              }
            }
          }
        }
      } catch (e) {}
    });
    return cleanup;
  }, [setVaultPath, vaultPath, setPendingDeepLink]);

  if (isLoading || (!vaultPath && !stepResolved)) {
    return <SplashScreen logoSrc={logoSrc} />;
  }

  return (
    <>
      <SafeCloseHandler />
      <HashRouter>
        <Suspense fallback={<LoadingFallback logoSrc={logoSrc} />}>
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
                <Route path="/source-control" element={<SourceControlPage />} />
                
                {appModuleRegistry.getRoutes().map((r, i) => (
                  <Route key={i} path={r.path} element={<r.component />} />
                ))}
                
                <Route path="/settings" element={<SettingsPage />}>
                  <Route path="intelligence" element={null} />
                  <Route path="execution" element={null} />
                  <Route path="workspace" element={null} />
                  <Route path="networking" element={null} />
                  <Route path="system" element={<SystemStatusPage />} />
                  <Route path="database" element={<DebugDatabasePage />} />
                </Route>
                <Route path="/plugins" element={<PluginManagerPage />} />
                <Route path="/browser" element={<RedirectWithSearch to="/" />} />
                <Route path="/system" element={<RedirectWithSearch to="/settings/system" />} />
                <Route path="/" element={<EntryBrowserPage />} />
                <Route path="/tags" element={<TagManagerPage />} />
                <Route path="/tag-graph" element={<TagGraphPage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/:type/:id" element={<GenericEntryView />} />
              </Route>
            )}
          </Routes>
        </Suspense>
        {appModuleRegistry.getGlobalComponents('global-overlay').map((Comp, i) => <Comp key={i} />)}
      </HashRouter>
    </>
  );
};

import { initHostServices } from './host-services';

export function BaseAppHost(props: any) {
  useMemo(() => {
    if (props.hostApi && props.appModuleRegistry) {
      initHostServices(props.hostApi, props.appModuleRegistry);
    }
  }, [props.hostApi, props.appModuleRegistry]);

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ToastProvider>
          <AppSettingsProvider>
            <ConfigProvider>
              <CoreServicesBridge>
                <TagCategoryProvider>
                  <GitProvider>
                    <LayoutProvider>
                      <GlobalProviderChain providers={appModuleRegistry.getGlobalProviders()}>
                        <BackgroundIndexingProvider>
                          <AudioProvider>
                              <PeerProvider>
                                <AppContent logoSrc={props.logoSrc} />
                                <ToastViewport />
                              </PeerProvider>
                          </AudioProvider>
                        </BackgroundIndexingProvider>
                      </GlobalProviderChain>
                    </LayoutProvider>
                  </GitProvider>
                </TagCategoryProvider>
              </CoreServicesBridge>
            </ConfigProvider>
          </AppSettingsProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
