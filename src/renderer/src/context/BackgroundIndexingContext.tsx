/**
 * Background Indexing Provider
 * Initializes and manages the background indexing service based on app settings.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useConfig } from '@renderer/context/ConfigContext';
import { useAppSettings } from '@renderer/context/AppSettingsContext';
import { backgroundIndexingService, type BackgroundIndexingStatus } from '../services/background-indexing-service';

interface BackgroundIndexingContextType {
    status: BackgroundIndexingStatus;
    runNow: () => Promise<void>;
}

const BackgroundIndexingContext = createContext<BackgroundIndexingContextType | null>(null);

export const useBackgroundIndexing = () => {
    const context = useContext(BackgroundIndexingContext);
    if (!context) {
        throw new Error('useBackgroundIndexing must be used within a BackgroundIndexingProvider');
    }
    return context;
};

interface Props {
    children: ReactNode;
}

export const BackgroundIndexingProvider = ({ children }: Props) => {
    const { settings, isLoading } = useAppSettings();
    const [status, setStatus] = useState<BackgroundIndexingStatus>(backgroundIndexingService.getStatus());

    const { vaultPath } = useConfig();

    // Configure and start service when settings load and vaultPath exists
    useEffect(() => {
        if (isLoading || !vaultPath) {
            backgroundIndexingService.stop();
            return;
        }

        // Configure the service with current settings
        backgroundIndexingService.configure({
            enabled: settings.backgroundIndexingEnabled,
            intervalMinutes: settings.backgroundIndexingInterval,
            batchSize: settings.backgroundIndexingBatchSize,
            reindexIntervalHours: settings.ragReindexInterval,
            folderWhitelist: settings.ragFolderWhitelist
        });

        // Start if enabled
        if (settings.backgroundIndexingEnabled) {
            backgroundIndexingService.start();
        }

        // Subscribe to status updates
        const unsubscribe = backgroundIndexingService.onStatusChange(setStatus);

        return () => {
            unsubscribe();
            backgroundIndexingService.stop();
        };
    }, [isLoading, vaultPath]);

    // Reconfigure when settings change
    useEffect(() => {
        if (isLoading) return;

        backgroundIndexingService.configure({
            enabled: settings.backgroundIndexingEnabled,
            intervalMinutes: settings.backgroundIndexingInterval,
            batchSize: settings.backgroundIndexingBatchSize,
            reindexIntervalHours: settings.ragReindexInterval,
            folderWhitelist: settings.ragFolderWhitelist
        });
    }, [
        settings.backgroundIndexingEnabled,
        settings.backgroundIndexingInterval,
        settings.backgroundIndexingBatchSize,
        settings.ragReindexInterval,
        settings.ragFolderWhitelist,
        isLoading
    ]);

    const runNow = useCallback(async () => {
        await backgroundIndexingService.runOnce();
    }, []);

    return (
        <BackgroundIndexingContext.Provider value={{ status, runNow }}>
            {children}
        </BackgroundIndexingContext.Provider>
    );
};
