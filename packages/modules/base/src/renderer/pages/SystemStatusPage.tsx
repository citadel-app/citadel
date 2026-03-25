import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@citadel-app/ui';
import { ConfirmDialog } from '@citadel-app/ui';
import { db, CodexEntry } from '../lib/db';
import { useAppSettings } from '../context/AppSettingsContext';
import { useBackgroundIndexing } from '../context/BackgroundIndexingContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { cn } from '@citadel-app/ui';
import { hostApi as __hostApi } from '../host-services';
import { appModuleRegistry } from '../host-services';

interface HardwareSpecs {
    totalMemory: number;
    gpus: { model: string; vram: number }[];
    cpu: { flags: string; cores: number };
    storage: number;
}

interface CollectionInfo {
    name: string;
    pointsCount: number;
    vectorsCount: number;
    segmentsCount: number;
    status: string;
}



// Humanized time helper
const timeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return new Date(date).toLocaleDateString();
};

// Humanized future time helper
const timeUntil = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((new Date(date).getTime() - now.getTime()) / 1000);

    if (seconds < 0) return 'now';
    if (seconds < 60) return 'in <1m';
    if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `in ${Math.floor(seconds / 3600)}h`;
    return `in ${Math.floor(seconds / 86400)}d`;
};

export const SystemStatusPage = () => {
    // console.log('[SystemStatusPage] Rendering...');

    const { settings } = useAppSettings();
    const { status: backgroundStatus, runNow } = useBackgroundIndexing();
    const { getEntryTypeConfig } = useConfig();
    const navigate = useNavigate();
    const pollInterval = settings?.system?.statusPollInterval || 5000;


    // Ollama State
    const [ollamaConnected, setOllamaConnected] = useState(false);
    const [ollamaModels, setOllamaModels] = useState<import('@citadel-app/core').AIModel[]>([]);
    const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');

    // Hardware State
    const [hardware, setHardware] = useState<HardwareSpecs | null>(null);

    // Qdrant State
    const [qdrantConnected, setQdrantConnected] = useState(false);
    const [qdrantVersion, setQdrantVersion] = useState<string | null>(null);
    const [qdrantUrl, setQdrantUrl] = useState('http://localhost:6333');
    const [collections, setCollections] = useState<CollectionInfo[]>([]);


    // Execution State (Moved to CodeStatusWidget)
    // Docker Containers (Moved to CodeStatusWidget)

    const [isIndexing, setIsIndexing] = useState(false);
    const [indexProgress, setIndexProgress] = useState({ current: 0, total: 0 });


    // ... (rest of state stays same)

    // Service Transition State
    const [transitioningServices, setTransitioningServices] = useState<Set<string>>(new Set());

    // Process Stats State
    const [processStats, setProcessStats] = useState<Record<string, { cpu: number; memory: number; memoryMB: number } | null>>({});

    // Entry Selection State
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchFilter, setSearchFilter] = useState('');



    // Live Query for Entries and Index Status (projected to save memory)
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            ...e,
            content: undefined,
            highlights: undefined,
            whiteboard: undefined,
            code: undefined
        }));
    }, []) || [];
    const allIndexStatus = useLiveQuery(() => db.indexStatus.toArray(), []) || [];

    // Note: Batch indexing inside handleBatchIndex still fetches the full entry via db.entries.get(id)

    // Map entryId -> IndexStatus
    const indexStatusMap = useMemo(() => {
        const map = new Map<string, (typeof allIndexStatus)[0]>();
        allIndexStatus.forEach(s => map.set(s.entryId, s));
        return map;
    }, [allIndexStatus]);

    // Grouped & Filtered Entries
    const groupedEntries = useMemo(() => {
        const filtered = allEntries.filter(e => {
            if (typeFilter !== 'all' && e.type !== typeFilter) return false;
            if (searchFilter && !e.title.toLowerCase().includes(searchFilter.toLowerCase())) return false;
            return true;
        });

        const groups: Record<string, CodexEntry[]> = {};
        for (const entry of filtered) {
            if (!groups[entry.type]) groups[entry.type] = [];
            groups[entry.type].push(entry);
        }
        return groups;
    }, [allEntries, typeFilter, searchFilter]);

    const entryTypes = useMemo(() => {
        const types = new Set(allEntries.map(e => e.type));
        return ['all', ...Array.from(types)];
    }, [allEntries]);


    // Refresh Functions
    const refreshOllama = useCallback(async () => {
        const connectedRes = await __hostApi.module.invoke('@citadel-app/base', 'ai.isAvailable');
        setOllamaConnected(connectedRes.available);
        if (connectedRes.available) {
            const models = await __hostApi.module.invoke('@citadel-app/base', 'ai.getModels');
            setOllamaModels(models);
        } else {
            setOllamaModels([]);
        }
    }, []);

    const refreshHardware = useCallback(async () => {
        // Hardware specs are now part of system status or available via system API
        try {
            const stats = await __hostApi.module.invoke('@citadel-app/base', 'system.getProcessStats', ['codex']);
            // If we need more detailed hardware specs, we could add a dedicated IPC
            // For now, let's assume we use what's available
        } catch (e) { }
    }, []);

    const refreshQdrant = useCallback(async () => {
        const status = await __hostApi.module.invoke('@citadel-app/base', 'ai.isAvailable');
        setQdrantConnected(status.available && !!settings.ai?.qdrant?.baseUrl);
        // We could add more detailed Qdrant status IPC if needed
        setQdrantVersion('Managed');
        setCollections([]); // Could be populated via a new IPC if critical
    }, [settings]);



    // Docker and Execution Refresh (Moved to CodeStatusWidget)

    const refreshProcessStats = useCallback(async () => {
        try {
            const stats = await __hostApi.module.invoke('@citadel-app/base', 'system.getProcessStats', ['ollama', 'qdrant', 'codex']);
            setProcessStats(stats);
            return stats;
        } catch (e) {
            console.error('[SystemStatusPage] Failed to get process stats:', e);
            return {};
        }
    }, []);

    const refreshAll = useCallback(async () => {
        await refreshProcessStats();

        await Promise.all([
            refreshOllama(),
            refreshHardware(),
            refreshQdrant()
        ]);
    }, [refreshOllama, refreshHardware, refreshQdrant, refreshProcessStats]);

    // Service Control Handlers
    const handleStartService = async (name: string) => {
        setTransitioningServices(prev => new Set(prev).add(name));
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'service.start', name);
            // Rapid refresh initially
            setTimeout(refreshAll, 1000);
            setTimeout(refreshAll, 3000);
        } catch (e) {
            console.error(`[SystemStatusPage] Failed to start ${name}:`, e);
            setTransitioningServices(prev => {
                const next = new Set(prev);
                next.delete(name);
                return next;
            });
        }
    };

    const handleStopService = async (name: string) => {
        setTransitioningServices(prev => new Set(prev).add(name));
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'service.stop', name);
            setTimeout(refreshAll, 1000);
        } catch (e) {
            console.error(`[SystemStatusPage] Failed to stop ${name}:`, e);
            setTransitioningServices(prev => {
                const next = new Set(prev);
                next.delete(name);
                return next;
            });
        }
    };

    // Auto-clear transition state when service status matches goal
    useEffect(() => {
        const checkTransitions = () => {
            if (transitioningServices.size === 0) return;

            setTransitioningServices(prev => {
                const next = new Set(prev);
                let changed = false;

                if (next.has('ollama') && ollamaConnected) { next.delete('ollama'); changed = true; }
                if (next.has('qdrant') && qdrantConnected) { next.delete('qdrant'); changed = true; }

                return changed ? next : prev;
            });
        };

        checkTransitions();
    }, [ollamaConnected, qdrantConnected, transitioningServices]);

    // Safety timeout to clear transitions after 5 mins (e.g. build failure)
    useEffect(() => {
        if (transitioningServices.size === 0) return;
        const timer = setTimeout(() => {
            setTransitioningServices(new Set());
        }, 300000); // 5 minutes
        return () => clearTimeout(timer);
    }, [transitioningServices]);

    // Selection Handlers
    const toggleEntry = (id: string) => {
        setSelectedEntries(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const allIds = Object.values(groupedEntries).flat().map(e => e.id);
        setSelectedEntries(new Set(allIds));
    };

    const selectNone = () => {
        setSelectedEntries(new Set());
    };

    const selectByType = (type: string) => {
        const ids = (groupedEntries[type] || []).map(e => e.id);
        setSelectedEntries(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
    };

    // Batch Indexing
    const handleBatchIndex = async () => {
        if (selectedEntries.size === 0) return;
        setIsIndexing(true);
        const ids = Array.from(selectedEntries);
        setIndexProgress({ current: 0, total: ids.length });

        try {
            for (let i = 0; i < ids.length; i++) {
                const entry = await db.entries.get(ids[i]);
                if (entry) await __hostApi.module.invoke('@citadel-app/base', 'ai.indexEntry', entry);
                setIndexProgress({ current: i + 1, total: ids.length });
            }
            await refreshQdrant();
        } catch (e) {
            console.error('[SystemStatusPage] Batch indexing failed:', e);
        } finally {
            setIsIndexing(false);
            setSelectedEntries(new Set());
        }
    };

    // Purge All Indexes
    const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
    const [purging, setPurging] = useState(false);

    const handlePurgeIndexes = async () => {
        setShowPurgeConfirm(true);
    };

    const confirmPurge = async () => {
        setShowPurgeConfirm(false);
        setPurging(true);
        try {
            // Need to add purgeAllIndexes to AIAPI if we really want to support this button
            // For now, let's just log it or provide a placeholder
            console.warn('Purge All Indexes not yet implemented in Main Process IPC');
            await refreshQdrant();
        } catch (e) {
            console.error('[SystemStatusPage] Purge failed:', e);
        } finally {
            setPurging(false);
        }
    };

    useEffect(() => {
        refreshHardware();
        refreshOllama();
        refreshQdrant();

        const interval = setInterval(() => {
            refreshOllama();
            refreshQdrant();
        }, pollInterval);

        return () => clearInterval(interval);
    }, [refreshOllama, refreshHardware, refreshQdrant, pollInterval]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!__hostApi) {
        return (
            <div className="h-full overflow-y-auto bg-background p-6">
                <div className="max-w-[1600px] mx-auto p-8 text-red-500 border border-red-500/20 bg-red-500/5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <Icon name="AlertTriangle" size={24} />
                        <h2 className="text-xl font-bold">System API Not Available</h2>
                    </div>
                    <p>Citadel cannot communicate with the core processes. This usually happens if the application was not started correctly or if a critical foundation service failed to initialize.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-background p-6 custom-scrollbar">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <h1 className="text-3xl font-extrabold tracking-tight">The Watchtower</h1>
                        </div>
                        <p className="text-muted-foreground max-w-2xl">
                            Real-time monitoring and control of Citadel's AI infrastructure, local services, and data pipelines.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={refreshAll}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all"
                        >
                            <Icon name="RefreshCw" size={16} />
                            Status Refresh
                        </button>
                    </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                    {/* --- CORE INTELLIGENCE --- */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                            <Icon name="Brain" size={14} />
                            Core Intelligence
                        </h3>

                        {/* Ollama Card */}
                        <div className="group p-5 bg-card/50 border border-border rounded-2xl hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        ollamaConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                        <Icon name="Bot" size={20} />
                                    </div>
                                    <h2 className="font-bold text-lg text-card-foreground">Ollama</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                        ollamaConnected ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                    )}>
                                        {ollamaConnected ? 'Connected' : 'Offline'}
                                    </span>
                                    <button
                                        onClick={() => ollamaConnected ? handleStopService('ollama') : handleStartService('ollama')}
                                        disabled={transitioningServices.has('ollama')}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                    >
                                        <Icon name={transitioningServices.has('ollama') ? 'Loader2' : (ollamaConnected ? 'Square' : 'Play')} size={14} className={transitioningServices.has('ollama') ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">Endpoint</span>
                                    <span className="font-mono text-[10px] opacity-70">{ollamaUrl}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">Models</span>
                                    <span className="font-semibold">{ollamaModels?.length || 0} loaded</span>
                                </div>
                                {ollamaConnected && ollamaModels?.length > 0 && (
                                    <div className="mt-2 pt-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {ollamaModels.slice(0, 5).map(m => (
                                                <span key={m.name} className="px-2 py-0.5 bg-muted/50 rounded-md text-[10px] font-mono border border-border/50">{m.name.split(':')[0]}</span>
                                            ))}
                                            {ollamaModels.length > 5 && <span className="text-[10px] text-muted-foreground font-medium flex items-center px-1">+{ollamaModels.length - 5} more</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Qdrant Card */}
                        <div className="p-5 bg-card/50 border border-border rounded-2xl hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        qdrantConnected ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                        <Icon name="Database" size={20} />
                                    </div>
                                    <h2 className="font-bold text-lg text-card-foreground">Qdrant</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                        qdrantConnected ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                    )}>
                                        {qdrantConnected ? 'Active' : 'Offline'}
                                    </span>
                                    <button
                                        onClick={() => qdrantConnected ? handleStopService('qdrant') : handleStartService('qdrant')}
                                        disabled={transitioningServices.has('qdrant')}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                    >
                                        <Icon name={transitioningServices.has('qdrant') ? 'Loader2' : (qdrantConnected ? 'Square' : 'Play')} size={14} className={transitioningServices.has('qdrant') ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">Version</span>
                                    <span className="font-mono text-[11px] font-bold">{qdrantVersion || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">Collections</span>
                                    <span className="font-semibold">{collections?.length || 0} Vector Spaces</span>
                                </div>
                                {collections?.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                        {collections.slice(0, 3).map(col => (
                                            <div key={col.name} className="flex justify-between text-[11px] bg-muted/30 p-1.5 rounded-lg border border-border/50">
                                                <span className="font-mono truncate max-w-[120px]">{col.name}</span>
                                                <span className="text-muted-foreground">{col.pointsCount.toLocaleString()} pts • {col.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hardware Stats */}
                        <div className="p-5 bg-card/50 border border-border rounded-2xl shadow-sm">
                            <h2 className="font-bold flex items-center gap-3 mb-4 text-primary">
                                <Icon name="Cpu" size={18} />
                                Resource Monitoring
                            </h2>
                            {hardware ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">RAM Cache</div>
                                        <div className="text-lg font-bold">{formatBytes(processStats.codex?.memoryMB ? processStats.codex.memoryMB * 1024 * 1024 : 0)} / {formatBytes(hardware.totalMemory)}</div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">CPU Cores</div>
                                        <div className="text-lg font-bold">{hardware.cpu?.cores || 0}</div>
                                    </div>
                                    {hardware.gpus?.map((gpu, i) => (
                                        <div key={i} className="col-span-2 p-3 bg-muted/40 rounded-xl border border-border/50 flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <div className="text-[10px] text-muted-foreground uppercase font-bold">GPU {i + 1}</div>
                                                <div className="text-[10px] font-mono opacity-60 truncate ml-4">{gpu.model}</div>
                                            </div>
                                            <div className="text-sm font-bold">{gpu.vram > 0 ? formatBytes(gpu.vram * 1024 * 1024) : 'Integrated/Shared'}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-4 animate-pulse flex flex-col gap-2">
                                    <div className="h-4 bg-muted rounded w-full" />
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- INFRASTRUCTURE --- */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                            <Icon name="Layers" size={14} />
                            Cloud & Local Stack
                        </h3>

                        {/* Rendering dynamic status widgets for Cloud & Local Stack */}
                        {appModuleRegistry.getStatusWidgets()
                            .filter(w => w.group === 'Cloud & Local Stack')
                            .map(w => <w.component key={w.id} />)}


                    </div>

                    {/* --- MANAGEMENT & DATA --- */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                            <Icon name="Activity" size={14} />
                            Pipeline & Management
                        </h3>

                        {/* Background Task Monitoring */}
                        <div className="p-5 bg-card/50 border border-border rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-lg flex items-center gap-3 text-card-foreground">
                                    <Icon name="Zap" size={20} className="text-yellow-500" />
                                    Scroll Preservation
                                </h2>
                                <button
                                    onClick={runNow}
                                    disabled={backgroundStatus?.state === 'running'}
                                    className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:shadow-lg active:scale-95"
                                >
                                    {backgroundStatus?.state === 'running' ? 'Running...' : 'Force Run'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 bg-background rounded-xl border border-border/50">
                                        <div className="text-[9px] text-muted-foreground font-black uppercase mb-0.5">Total Corpus</div>
                                        <div className="text-lg font-black">{allEntries?.length || 0}</div>
                                    </div>
                                    <div className="p-2.5 bg-background rounded-xl border border-border/50">
                                        <div className="text-[9px] text-muted-foreground font-black uppercase mb-0.5">Indexed</div>
                                        <div className="text-lg font-black text-primary">{allIndexStatus?.length || 0}</div>
                                    </div>
                                </div>

                                {backgroundStatus?.state === 'running' && (
                                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] font-bold text-primary uppercase">Current Progress</span>
                                            <span className="text-[10px] font-mono font-bold">{backgroundStatus.progress?.current || 0} / {backgroundStatus.progress?.total || 0}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500 ease-out"
                                                style={{ width: `${(backgroundStatus.progress?.current / backgroundStatus.progress?.total) * 100 || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1 text-xs text-muted-foreground font-medium bg-muted/20 p-3 rounded-xl">
                                    <div className="flex justify-between">
                                        <span>Last Sync</span>
                                        <span className="text-foreground">{backgroundStatus?.lastRunTime ? timeAgo(backgroundStatus.lastRunTime) : 'Never'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Next Scheduled</span>
                                        <span className="text-foreground">{backgroundStatus?.nextRunTime && backgroundStatus.state !== 'disabled' ? timeUntil(backgroundStatus.nextRunTime) : 'Paused'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Batch Management */}
                        <div className="p-5 bg-card/50 border border-border rounded-2xl shadow-sm flex flex-col min-h-[400px]">
                            <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                                <h2 className="font-bold text-lg flex items-center gap-3 text-card-foreground">
                                    <Icon name="Settings2" size={20} className="text-purple-500" />
                                    Batch Control
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBatchIndex}
                                        disabled={selectedEntries.size === 0 || isIndexing || !qdrantConnected || !ollamaConnected}
                                        className="p-1 px-3 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-black uppercase disabled:opacity-40"
                                    >
                                        Index {selectedEntries.size > 0 ? `(${selectedEntries.size})` : ''}
                                    </button>
                                    <button
                                        onClick={handlePurgeIndexes}
                                        disabled={purging}
                                        className="p-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md hover:bg-destructive/20 transition-all shadow-sm"
                                    >
                                        <Icon name="Trash2" size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 py-2 mb-2 overflow-x-auto pb-4 no-scrollbar">
                                <div className="relative flex-1 min-w-[140px]">
                                    <Icon name="Search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60" />
                                    <input
                                        type="text"
                                        placeholder="Filter entries..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
                                    />
                                </div>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-primary outline-none font-medium"
                                >
                                    {entryTypes.map(t => (
                                        <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar space-y-4">
                                {Object.entries(groupedEntries || {}).map(([type, entries]) => (
                                    <div key={type}>
                                        <div className="flex items-center justify-between py-1 mb-2 px-1">
                                            <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider font-mono">{type} ({entries.length})</span>
                                            <button onClick={() => selectByType(type)} className="text-[9px] font-bold text-primary hover:underline transition-all">Select all</button>
                                        </div>
                                        <div className="space-y-1">
                                            {entries.map(entry => (
                                                <div
                                                    key={entry.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-2 rounded-xl transition-all border outline-none cursor-pointer",
                                                        selectedEntries.has(entry.id) ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                                    )}
                                                    onClick={() => toggleEntry(entry.id)}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        selectedEntries.has(entry.id) ? "bg-primary border-primary text-primary-foreground shadow-sm" : "border-border bg-background"
                                                    )}>
                                                        {selectedEntries.has(entry.id) && <Icon name="Check" size={10} strokeWidth={4} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-bold truncate leading-tight text-card-foreground">{entry.title}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className={cn(
                                                                "w-1 h-1 rounded-full",
                                                                indexStatusMap.has(entry.id) ? "bg-green-500" : "bg-muted-foreground/30"
                                                            )} />
                                                            <span className="text-[9px] text-muted-foreground font-medium uppercase">{indexStatusMap.has(entry.id) ? 'Indexed' : 'Pending'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {allEntries.length > 0 && Object.keys(groupedEntries).length === 0 && (
                                    <div className="py-8 text-center text-[10px] text-muted-foreground font-bold italic">No matches found</div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border opacity-50 grayscale hover:grayscale-0 transition-all group">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                        <Icon name="Info" size={12} />
                        Dynamic Polling Active: {pollInterval / 1000}s Interval
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium max-w-[400px] text-center md:text-right italic">
                        Infrastructure status is monitored in real-time. Changes to services can take up to 30 seconds to propagate depending on system load and Docker response times.
                    </p>
                </div>
            </div>

            <ConfirmDialog
                open={showPurgeConfirm}
                onOpenChange={setShowPurgeConfirm}
                title="Purge All Vector Indexes?"
                description="This will permanently delete all indexed data in Qdrant. Original notes are safe, but search will be disabled until re-indexing is complete. Proceed with caution."
                confirmLabel="Purge Everything"
                variant="destructive"
                onConfirm={confirmPurge}
            />
        </div>);
};
