import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { THEMES, getThemeById, AppSettings, DEFAULT_APP_SETTINGS } from '@shared';



interface AppSettingsContextType {
    settings: AppSettings;
    isLoading: boolean;
    updateSetting: (key: string, value: any) => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within a AppSettingsProvider');
    }
    return context;
};

interface AppSettingsProviderProps {
    children: ReactNode;
}


export const AppSettingsProvider = ({ children }: AppSettingsProviderProps) => {
    const { setTheme: setNextTheme } = useTheme();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    // Sync theme mode (light/dark/system)
    useEffect(() => {
        if (settings.theme) {
            setNextTheme(settings.theme);
        }
    }, [settings.theme, setNextTheme]);

    // Apply color theme variables
    const { resolvedTheme } = useTheme();
    useEffect(() => {
        const themeDef = getThemeById(settings.colorTheme || 'vscode');
        const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
        const vars = themeDef[mode];

        const root = document.documentElement;
        root.style.setProperty('--primary', vars.primary);
        root.style.setProperty('--primary-foreground', vars.primaryForeground);
        root.style.setProperty('--primary-rgb', vars.primaryRgb);
        root.style.setProperty('--ring', vars.primary); // Matching ring to primary

        console.log(`[AppSettings] Applied color theme: ${themeDef.name} (${mode})`);
    }, [settings.colorTheme, resolvedTheme]);

    // Apply zoom factor
    useEffect(() => {
        if (window.api?.window?.setZoom) {
            window.api.window.setZoom(settings.zoomFactor || 1.0);
        }
    }, [settings.zoomFactor]);

    const loadSettings = async () => {
        try {
            if (!window.api?.appSettings) {
                console.warn('[AppSettingsContext] window.api.appSettings is not defined. Restart the app if you just added this feature.');
                return;
            }
            const loaded = await window.api.appSettings.getSettings();

            // Merge loaded settings with defaults
            const mergedSettings = { ...DEFAULT_APP_SETTINGS, ...loaded };

            if (loaded.executionEnvironments) {
                mergedSettings.executionEnvironments = {
                    ...DEFAULT_APP_SETTINGS.executionEnvironments,
                    ...loaded.executionEnvironments
                };
            }

            setSettings(mergedSettings);

            // Configure AI provider registry
            // Re-configuration now handled by Main process via IPC side-effects
        } catch (error) {
            console.error('Failed to load app settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        try {
            const updated = await window.api.appSettings.updateSetting(key, value);
            setSettings(prev => ({ ...prev, ...updated }));

            // Re-configure providers when AI settings change
            // Re-configuration handled by Main process
        } catch (error) {
            console.error('Failed to update app setting:', error);
            // Optimistic update fallback? For now just log error.
        }
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const updated = await window.api.appSettings.updateSettings(newSettings);
            setSettings(prev => ({ ...prev, ...updated }));
        } catch (error) {
            console.error('Failed to update app settings:', error);
        }
    };

    return (
        <AppSettingsContext.Provider value={{ settings, isLoading, updateSetting, updateSettings }}>
            {children}
        </AppSettingsContext.Provider>
    );
};
