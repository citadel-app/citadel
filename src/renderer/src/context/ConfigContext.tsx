import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { EntryTypeConfig, DEFAULT_WORKSPACE_CONFIG, SectionConfig, WorkspaceConfig } from '../config/entry-types';
import { dataManager } from '../lib/data-manager';

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

    const loadConfig = async (path?: string) => {
        try {
            const initContext = await window.api.app.getInitContext();
            const storedPath = localStorage.getItem('codex-vault-path');
            const currentPath = path || initContext.workspacePath || storedPath || vaultPath;

            if (!currentPath) {
                console.log('[ConfigProvider] No workspace path found. Entering non-workspace mode.');
                setIsLoading(false);
                return;
            }

            // Sync with main process for guardrails
            await window.api.app.setActiveWorkspace(currentPath);

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
        return config.entries[type] || config.entries['paper']; // Fallback to paper or safe default
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
        recentVaults, // Expose this
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
