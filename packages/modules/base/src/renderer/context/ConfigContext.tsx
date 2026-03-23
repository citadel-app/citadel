import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type EntryTypeConfig, DEFAULT_WORKSPACE_CONFIG, type SectionConfig, type WorkspaceConfig } from '@citadel-app/core';
import { dataManager } from '../lib/data-manager';
import { hostApi as __hostApi } from '../host-services';

interface ConfigContextType {
    config: WorkspaceConfig;
    entryTypes: Record<string, EntryTypeConfig>;
    isLoading: boolean;
    reloadConfig: () => Promise<void>;
    getEntryTypeConfig: (type: string) => EntryTypeConfig;
    getSectionConfig: (type: string) => SectionConfig[];
    findSectionConfig: (type: string, title: string) => SectionConfig | undefined;
    vaultPath: string | null;
    setVaultPath: (path: string | null) => Promise<void>;
    updateConfig: (updates: Partial<WorkspaceConfig>) => Promise<void>;
    recentVaults: string[];
    pendingDeepLink: string | null;
    setPendingDeepLink: (url: string | null) => void;
    clearPendingDeepLink: () => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};

interface ConfigProviderProps {
    children: ReactNode;
}

export const ConfigProvider = ({ children }: ConfigProviderProps) => {
    const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [vaultPath, setVaultPathState] = useState<string | null>(null);
    const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

    const loadConfig = async (path?: string) => {
        try {
            const initContext = await __hostApi.app.getInitContext();
            const storedPath = localStorage.getItem('codex-vault-path');
            let currentPath = path || initContext.workspacePath || storedPath || vaultPath;

            if (initContext.deepLinkUrl) {
                try {
                    const u = initContext.deepLinkUrl;
                    if (u.startsWith('citadel://') || u.startsWith('codex://')) {
                        console.log('[ConfigProvider] Intercepted deep link on startup:', u);
                        setPendingDeepLink(u);
                        // Note: We don't set currentPath to null yet, we just set the pending link.
                        // Actually, we want to force WelcomePage if it's a clone link.
                        const urlObj = new URL(u);
                        if (urlObj.hostname === 'clone' || urlObj.pathname.includes('clone')) {
                            currentPath = null;
                            setVaultPathState(null);
                        }
                    }
                } catch (e) {
                    console.error('[ConfigProvider] Failed to parse initial deep link:', e);
                }
            }

            if (!currentPath) {
                console.log('[ConfigProvider] No workspace path found. Entering non-workspace mode.');
                setVaultPathState(null);
                setIsLoading(false);
                return;
            }

            // Sync with main process for guardrails
            await __hostApi.app.setActiveWorkspace(currentPath);
            await __hostApi.module.invoke('@citadel-app/base', 'fs.allowPath', currentPath);

            setVaultPathState(currentPath);
            await dataManager.init(currentPath);

            const loadedConfig = await dataManager.loadConfig(DEFAULT_WORKSPACE_CONFIG);
            setConfig(loadedConfig);
        } catch (error) {
            console.error('Failed to load config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const [recentVaults, setRecentVaults] = useState<string[]>([]);

    useEffect(() => {
        try {
            const storedStats = localStorage.getItem('codex-recent-vaults');
            if (storedStats) {
                setRecentVaults(JSON.parse(storedStats));
            }
        } catch (e) {
            console.error('Failed to load recent vaults', e);
        }
    }, []);

    const addToRecents = (path: string) => {
        const current = recentVaults.filter(p => p !== path);
        const updated = [path, ...current].slice(0, 5);
        setRecentVaults(updated);
        localStorage.setItem('codex-recent-vaults', JSON.stringify(updated));
    };

    const setVaultPath = async (path: string | null) => {
        setVaultPathState(path);
        if (path) {
            addToRecents(path);
            localStorage.setItem('codex-vault-path', path);
            setIsLoading(true);
            await loadConfig(path);
        } else {
            localStorage.removeItem('codex-vault-path');
            // Reset config to default when closing workspace
            setConfig(DEFAULT_WORKSPACE_CONFIG);
        }
    };

    const getEntryTypeConfig = (type: string): EntryTypeConfig => {
        return config.entries[type] || {
            type: type || 'unknown',
            folder: '00_Unknown',
            label: 'Unknown Type',
            icon: 'FileQuestion',
            accentColor: 'text-muted-foreground',
            accentBg: 'bg-muted',
            accentHover: 'hover:bg-muted/20',
            description: 'An undefined entry type encountered in the vault.',
            fields: [],
            metadata: [],
            sections: [],
            view: { layout: 'single', modules: { primary: 'sections' } }
        };
    };

    const getSectionConfig = (type: string): SectionConfig[] => {
        return getEntryTypeConfig(type).sections;
    };

    const findSectionConfig = (type: string, title: string): SectionConfig | undefined => {
        return getEntryTypeConfig(type).sections.find(s => s.title.toLowerCase() === title.toLowerCase());
    };

    const value: ConfigContextType = {
        config,
        entryTypes: config.entries,
        isLoading,
        reloadConfig: () => loadConfig(),
        getEntryTypeConfig,
        getSectionConfig,
        findSectionConfig,
        vaultPath,
        setVaultPath,
        recentVaults,
        pendingDeepLink,
        setPendingDeepLink: (url: string | null) => setPendingDeepLink(url),
        clearPendingDeepLink: () => setPendingDeepLink(null),
        updateConfig: async (updates) => {
            const newConfig = { ...config, ...updates };
            await dataManager.saveConfig(newConfig);
            setConfig(newConfig);
        }
    };

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
};
