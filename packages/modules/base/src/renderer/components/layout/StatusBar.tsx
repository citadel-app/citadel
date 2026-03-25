import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import { useState, useEffect } from 'react';
import { useGit } from '../../context/GitContext';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';

import { useAppSettings } from '../../context/AppSettingsContext';
import { hostApi as __hostApi } from '../../host-services';


export const StatusBar = () => {
    const { status, isRepo, loading: gitLoading, refreshStatus } = useGit();
    const { vaultPath, config } = useConfig();
    const { settings: appSettings, updateSetting } = useAppSettings();

    const defaultBranch = config?.settings?.defaultBranch || appSettings.defaultBranch || 'main';

    const navigate = useNavigate();
    const [isSyncing, setIsSyncing] = useState(false);
    const [logSeverity, setLogSeverity] = useState<'none' | 'warning' | 'error'>('none');
    const [ollamaConnected, setOllamaConnected] = useState(false);
    const [qdrantConnected, setQdrantConnected] = useState(false);
    const [localZoom, setLocalZoom] = useState(appSettings.zoomFactor || 1.0);
    const [appVersion, setAppVersion] = useState<string>('');

    // Fetch App Version
    useEffect(() => {
        __hostApi.app.getInitContext().then((ctx: any) => {
            if (ctx?.appVersion) setAppVersion(ctx.appVersion);
        }).catch(console.error);
    }, []);

    // Sync local zoom with app settings (for resets/loads)
    useEffect(() => {
        setLocalZoom(appSettings.zoomFactor || 1.0);
    }, [appSettings.zoomFactor]);

    useEffect(() => {
        return __hostApi.app.onLog((log) => {
            setLogSeverity(prev => {
                if (log.severity === 'error') return 'error';
                if (prev === 'error') return 'error';
                return 'warning';
            });
        });
    }, []);

    const handleLogClick = () => {
        (__hostApi.system as any).openDevTools();
        setLogSeverity('none');
    };

    useEffect(() => {
        if (!appSettings.ai?.enabled) return;

        const pollServices = async () => {
            try {
                const results = await __hostApi.module.invoke('@citadel-app/base', 'ai.isAvailable');
                setOllamaConnected(results.services?.ollama || false);
                setQdrantConnected(results.services?.ragAvailable || false);
            } catch (e) {
                // Silently handle errors in status polling
            }
        };

        pollServices(); // Initial check

        const intervalMs = appSettings.system?.statusPollInterval || 5000;
        const interval = setInterval(pollServices, intervalMs);

        return () => clearInterval(interval);
    }, [appSettings.ai?.enabled, appSettings.ai?.ollama?.baseUrl, appSettings.ai?.qdrant?.baseUrl, appSettings.system?.statusPollInterval]);

    const handleServiceClick = () => {
        navigate('/settings/system');
    };

    const handleBranchClick = async () => {
        if (!isRepo || !vaultPath) {
            navigate('/source-control');
            return;
        }
        navigate('/source-control');
    };

    const handleSyncClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!vaultPath || !isRepo) return;

        setIsSyncing(true);
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.pull', vaultPath);
            await __hostApi.module.invoke('@citadel-app/base', 'git.push', vaultPath);
            await refreshStatus();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="h-6 w-full bg-muted/40 border-t border-border flex items-center justify-between px-3 text-[11px] select-none text-muted-foreground">
            {/* Left Section: Git, Errors, Sync */}
            <div className="flex items-center gap-4">
                <div
                    className="flex items-center gap-1.5 hover:bg-muted/50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    title={isRepo ? "Current Branch (Click to Manage)" : "Initialize Bastion"}
                    onClick={handleBranchClick}
                >
                    <Icon name="GitBranch" size={12} />
                    <span>{isRepo ? `${status?.current || defaultBranch}${status?.files?.length ? '*' : ''}` : 'No Bastion'}</span>
                    {status?.ahead ? <span className="text-xs">↑{status.ahead}</span> : null}
                    {status?.behind ? <span className="text-xs">↓{status.behind}</span> : null}
                </div>

                {isRepo && (
                    <div
                        className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors"
                        title="Synchronize Bastion"
                        onClick={handleSyncClick}
                    >
                        <Icon name="RefreshCw" size={12} className={cn((isSyncing || gitLoading) && "animate-spin")} />
                    </div>
                )}

                {logSeverity !== 'none' && (
                    <div
                        className={cn(
                            "flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors",
                            logSeverity === 'error' ? "text-red-500" : "text-yellow-500"
                        )}
                        title={logSeverity === 'error' ? "Critical Error in Main Process (Click to open DevTools)" : "Warning in Main Process (Click to open DevTools)"}
                        onClick={handleLogClick}
                    >
                        <Icon name="AlertTriangle" size={12} />
                    </div>
                )}

                {appSettings.ai?.enabled && (
                    <div className="flex items-center gap-3 border-l border-border/50 pl-3">
                        <div
                            className={cn(
                                "flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors",
                                ollamaConnected ? "text-green-500" : "text-red-500"
                            )}
                            title={`Ollama: ${ollamaConnected ? 'Connected' : 'Disconnected'} (Click for System Status)`}
                            onClick={handleServiceClick}
                        >
                            <Icon name="Bot" size={12} />
                        </div>
                        <div
                            className={cn(
                                "flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors",
                                qdrantConnected ? "text-green-500" : "text-red-500"
                            )}
                            title={`Qdrant: ${qdrantConnected ? 'Connected' : 'Disconnected'} (Click for System Status)`}
                            onClick={handleServiceClick}
                        >
                            <Icon name="Database" size={12} />
                        </div>

                    </div>
                )}
            </div>

            {/* Right Section: Language, Zoom, Layout, Notifications */}
            <div className="flex items-center gap-4">
                {/* Zoom Slider */}
                <div className="flex items-center gap-2 border-r border-border/50 pr-4 mr-1">
                    <Icon name="Search" size={10} className="shrink-0 opacity-50" />
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={localZoom}
                        onChange={(e) => setLocalZoom(parseFloat(e.target.value))}
                        onPointerUp={() => updateSetting('zoomFactor', localZoom)}
                        className="w-24 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        title="Zoom Scale"
                    />
                    <span
                        className="min-w-[35px] text-right font-mono cursor-pointer"
                        title="Double-click to reset"
                        onDoubleClick={() => {
                            setLocalZoom(1.0);
                            updateSetting('zoomFactor', 1.0);
                        }}
                    >
                        {Math.round(localZoom * 100)}%
                    </span>
                </div>

                {/* Zen Mode Toggle */}
                <button
                    onClick={() => updateSetting('zenMode', !appSettings.zenMode)}
                    className={cn(
                        "flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors border-r border-border/50 pr-4 mr-1",
                        appSettings.zenMode ? "text-primary" : "text-muted-foreground"
                    )}
                    title={appSettings.zenMode ? "Exit Zen Mode" : "Enter Zen Mode (Ctrl+Alt+Z)"}
                >
                    <Icon name="Maximize" size={12} />
                    <span className="text-[10px] font-medium">Zen</span>
                </button>

                <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors" title="Notifications">
                    <Icon name="Bell" size={12} />
                </div>

                {/* App Version */}
                {appVersion && (
                    <div className="flex items-center pl-3 border-l border-border/50 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-default" title={`Citadel v${appVersion}`}>
                        v{appVersion}
                    </div>
                )}
            </div>
        </div>
    );
};
