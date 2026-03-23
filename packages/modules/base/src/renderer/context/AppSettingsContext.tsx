import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { THEMES, getThemeById, AppSettings, DEFAULT_APP_SETTINGS } from '@citadel-app/core';
import { hostApi as __hostApi } from '../host-services';



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
            // Only set if different from actual window zoom to avoid loops
            __hostApi.window.getZoom().then((currentFactor: number) => {
                const roundedNew = Math.round((settings.zoomFactor || 1.0) * 100) / 100;
                const roundedCurrent = Math.round(currentFactor * 100) / 100;
                if (roundedNew !== roundedCurrent) {
                    __hostApi.window.setZoom(settings.zoomFactor || 1.0);
                }
            });
        }
    }, [settings.zoomFactor]);

    const lastZoomRef = useRef(settings.zoomFactor || 1.0);
    useEffect(() => {
        lastZoomRef.current = settings.zoomFactor || 1.0;
    }, [settings.zoomFactor]);

    // Handle native zoom events from Main process
    useEffect(() => {
        if (!window.api?.window?.onZoomChange) return;

        return __hostApi.window.onZoomChange((newFactor: number) => {
            // Only update if it's different to prevent loops
            // Round to 2 decimal places to ignore floating point noise
            const roundedNew = Math.round(newFactor * 100) / 100;
            const roundedCurrent = Math.round(lastZoomRef.current * 100) / 100;

            if (roundedNew !== roundedCurrent) {
                console.log(`[AppSettings] Native zoom detected: ${roundedNew}`);
                updateSetting('zoomFactor', roundedNew);
            }
        });
    }, []); // Empty deps to keep listener stable

    const loadSettings = async () => {
        try {
            if (!window.api?.appSettings) {
                console.warn('[AppSettingsContext] __hostApi.appSettings is not defined. Restart the app if you just added this feature.');
                return;
            }
            const loaded = await __hostApi.module.invoke('@citadel-app/base', 'appSettings.getSettings');

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

    const updateSetting = useCallback(async (key: string, value: any) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: value }));

        try {
            const updated = await __hostApi.module.invoke('@citadel-app/base', 'appSettings.updateSetting', key, value);
            // Sync with actual server response if different
            setSettings(prev => ({ ...prev, ...updated }));
        } catch (error) {
            console.error('Failed to update app setting:', error);
            // Rollback optimistic update on failure (reload from memory/server)
            loadSettings();
        }
    }, []);

    const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, ...newSettings }));

        try {
            const updated = await __hostApi.module.invoke('@citadel-app/base', 'appSettings.updateSettings', newSettings);
            setSettings(prev => ({ ...prev, ...updated }));
        } catch (error) {
            console.error('Failed to update app settings:', error);
            loadSettings();
        }
    }, []);

    return (
        <AppSettingsContext.Provider value={{ settings, isLoading, updateSetting, updateSettings }}>
            {children}
        </AppSettingsContext.Provider>
    );
};
