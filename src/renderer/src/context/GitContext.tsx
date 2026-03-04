import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useConfig } from '@renderer/context/ConfigContext';
import { useAppSettings } from '@renderer/context/AppSettingsContext';
import { Liquid } from 'liquidjs';

const liquid = new Liquid();

interface GitStatus {
    current: string;
    tracking: string;
    ahead: number;
    behind: number;
    files: Array<{
        path: string;
        index: string;
        working_dir: string;
    }>;
}

interface GitContextType {
    status: GitStatus | null;
    isRepo: boolean | null;
    loading: boolean;
    refreshStatus: () => Promise<void>;
    commit: (message: string) => Promise<void>;
    push: () => Promise<void>;
}

const GitContext = createContext<GitContextType | null>(null);

export const useGit = () => {
    const context = useContext(GitContext);
    if (!context) {
        throw new Error('useGit must be used within a GitProvider');
    }
    return context;
};

export const GitProvider = ({ children }: { children: React.ReactNode }) => {
    const { vaultPath } = useConfig();
    const { settings } = useAppSettings();
    const [status, setStatus] = useState<GitStatus | null>(null);
    const statusRef = useRef<GitStatus | null>(null);
    const [isRepo, setIsRepo] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOperationPending, setIsOperationPending] = useState(false);
    const operationLock = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Keep ref in sync
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    const performGitOperation = async (operationName: string, operation: () => Promise<void>) => {
        if (operationLock.current) {
            console.warn(`[GitProvider] Skipping ${operationName} because another operation is in progress.`);
            throw new Error(`Operation ${operationName} blocked: Another git operation is in progress.`);
        }

        operationLock.current = true;
        setIsOperationPending(true);
        console.log(`[GitProvider] Starting ${operationName}...`);

        try {
            await operation();
            console.log(`[GitProvider] Completed ${operationName}.`);
        } catch (error) {
            console.error(`[GitProvider] Error during ${operationName}:`, error);
            throw error; // Re-throw to let caller handle it
        } finally {
            operationLock.current = false;
            setIsOperationPending(false);
        }
    };

    const commit = async (message: string) => {
        if (!vaultPath) throw new Error("No vault path");
        await performGitOperation('Commit', async () => {
            // 1. Stage all (safer to ensuring everything is captured)
            await window.api.git.add(vaultPath, ['.']);
            await window.api.git.commit(vaultPath, message);
            await checkStatus(true);
        });
    };

    const push = async () => {
        if (!vaultPath) throw new Error("No vault path");
        await performGitOperation('Push', async () => {
            const currentStatus = statusRef.current; // Use ref for latest
            const branch = currentStatus?.current;
            if (!branch) throw new Error("No active branch");

            const remote = settings.defaultRemote || 'origin';
            await window.api.git.push(vaultPath, remote, branch);
            await checkStatus(true);
        });
    };

    // ... existing code ...

    const refreshStatus = async () => {
        await checkStatus(false);
    };

    const checkStatus = useCallback(async (silent = false) => {
        if (!vaultPath) {
            setStatus(null);
            setIsRepo(null);
            return;
        }

        if (!silent) setLoading(true);
        try {
            const isGit = await window.api.git.checkIsRepo(vaultPath);
            setIsRepo(isGit);
            if (isGit) {
                const s = await window.api.git.status(vaultPath);
                // Simple equality check to avoid re-renders if nothing changed?
                // For now, just set it. React matches by reference, but deep equality might be expensive to check every 5s.
                // However, setting state triggers re-render. 
                // Let's rely on React's diffing or just set it.
                setStatus(s);
            } else {
                setStatus(null);
            }
        } catch (error) {
            console.error('[GitProvider] Failed to check status:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [vaultPath]);

    // Initial load and polling
    useEffect(() => {
        checkStatus();

        if (settings.gitPollingEnabled === false) return;

        // Poll every X ms
        timerRef.current = setInterval(() => {
            checkStatus(true); // Silent update
        }, settings.gitPollingInterval || 10000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [checkStatus, settings.gitPollingEnabled, settings.gitPollingInterval]);

    // Re-check when window gets focus
    useEffect(() => {
        const handleFocus = () => checkStatus(true);
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [checkStatus]);

    // Auto-Sync (Periodically)
    useEffect(() => {
        if (!settings.autoSave || !vaultPath || !isRepo) return;

        const intervalMs = settings.autoSaveInterval || 300000;
        console.log(`[GitProvider] Auto-sync enabled. Schedule: ${intervalMs}ms`);

        const interval = setInterval(() => {
            performGitOperation('Auto-Sync', async () => {
                try {
                    const currentStatus = statusRef.current;
                    const branch = currentStatus?.current;

                    if (!branch) {
                        console.warn('[GitProvider] Auto-sync skipped: No active branch detected.');
                        return;
                    }

                    const remote = settings.defaultRemote || 'origin';
                    console.log(`[GitProvider] Auto-sync using ${remote}/${branch}`);
                    await window.api.git.pull(vaultPath, remote, branch);
                    await window.api.git.push(vaultPath, remote, branch);
                    await checkStatus(true);
                } catch (err: any) {
                    console.error('[GitProvider] Auto-sync failed:', err);
                }
            });
        }, intervalMs);

        return () => clearInterval(interval);
    }, [settings.autoSave, settings.autoSaveInterval, vaultPath, isRepo, checkStatus]);

    // Auto-Commit (Periodically)
    useEffect(() => {
        if (!settings.autoCommitEnabled || !vaultPath || !isRepo) return;

        const intervalMs = settings.autoCommitInterval || 300000;
        console.log(`[GitProvider] Auto-commit enabled. Schedule: ${intervalMs}ms`);

        const interval = setInterval(() => {
            performGitOperation('Auto-Commit', async () => {
                try {
                    const currentStatus = statusRef.current;

                    // 0. Check for changes
                    if (!currentStatus?.files || currentStatus.files.length === 0) {
                        // console.log('[GitProvider] Auto-commit skipped: No changes.');
                        return;
                    }

                    // 1. Stage all
                    await window.api.git.add(vaultPath, ['.']);

                    // 2. Render message
                    const template = settings.autoCommitMessage || "Auto-commit: {{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}";
                    const message = await liquid.parseAndRender(template, { now: new Date() });

                    // 3. Commit
                    await window.api.git.commit(vaultPath, message);

                    // 4. Sync (Pull/Push)
                    const branch = currentStatus?.current;
                    if (branch) {
                        const remote = settings.defaultRemote || 'origin';
                        console.log(`[GitProvider] Auto-commit sync using ${remote}/${branch}`);
                        await window.api.git.pull(vaultPath, remote, branch);
                        await window.api.git.push(vaultPath, remote, branch);
                    } else {
                        console.warn('[GitProvider] Auto-commit sync skipped: No active branch.');
                    }

                    // 5. Refresh status
                    await checkStatus(true);
                } catch (err: any) {
                    console.error('[GitProvider] Auto-commit failed:', err);
                }
            });
        }, intervalMs);

        return () => clearInterval(interval);
    }, [settings.autoCommitEnabled, settings.autoCommitInterval, settings.autoCommitMessage, vaultPath, isRepo, checkStatus]);

    const value = {
        status,
        isRepo,
        loading,
        refreshStatus,
        commit,
        push
    };

    return (
        <GitContext.Provider value={value}>
            {children}
        </GitContext.Provider>
    );
};
