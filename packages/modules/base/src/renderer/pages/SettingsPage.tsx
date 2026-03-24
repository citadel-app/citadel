import { useConfig } from '../context/ConfigContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { usePeer } from '../context/PeerContext';
import { Icon } from '@citadel-app/ui';
import { Tabs } from '@citadel-app/ui';
import { ConfigEditor } from '../components/settings/ConfigEditor';
import { ConfirmDialog } from '@citadel-app/ui';

import { ModelSelect } from '../components/settings/ModelSelect';
import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useToast } from '@citadel-app/ui';
import { THEMES } from '@citadel-app/core';
import { cn } from '@citadel-app/ui';
import { TagCategorySettings } from '../components/settings/TagCategorySettings';
import { appModuleRegistry } from '../host-services';
import { hostApi as __hostApi } from '../host-services';

export const SettingsPage = () => {
    const { vaultPath } = useConfig();
    const { toast } = useToast();
    const { settings, updateSetting } = useAppSettings();
    const { connect, send } = usePeer();
    const navigate = useNavigate();
    const location = useLocation();

    const modulePanels = appModuleRegistry.getSettingsPanels();
    const knownTabs = ['system', 'database', 'intelligence', 'workspace', 'networking', 'plugins', ...modulePanels.map(p => p.id)];
    const currentPath = location.pathname.split('/').pop() || 'app';
    const activeTab = knownTabs.includes(currentPath) ? currentPath : 'app';

    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [pullStatus, setPullStatus] = useState<string>('idle');
    const [availableModels, setAvailableModels] = useState<import('@citadel-app/core').AIModel[]>([]);
    const [testRemoteId, setTestRemoteId] = useState('');
    const [confirmRemoveEnv, setConfirmRemoveEnv] = useState<string | null>(null);
    const [showRegenPeerConfirm, setShowRegenPeerConfirm] = useState(false);

    // Qdrant state
    const [qdrantConnectionStatus, setQdrantConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [embeddingPullStatus, setEmbeddingPullStatus] = useState<string>('idle');
    const [hasEmbeddingModel, setHasEmbeddingModel] = useState<boolean>(false);



    useEffect(() => {
        const fetchModels = async () => {
            if (settings.ai?.enabled) {
                try {
                    const models = await __hostApi.module.invoke('@citadel-app/base', 'ai.getModels');
                    setAvailableModels(models);
                } catch (e) {
                    console.warn("[SettingsPage] Could not fetch models:", e);
                    setAvailableModels([]);
                }
            }
        };
        fetchModels();
    }, [settings.ai?.enabled, settings.ai?.provider, settings.ai?.ollama?.baseUrl]);

    const handleTabChange = (value: string) => {
        if (value === 'app') {
            navigate('/settings');
        } else {
            navigate(`/settings/${value}`);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            <div className="p-6 border-b border-border">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Icon name="Settings" size={24} />
                    Settings
                </h1>
            </div>

            <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <Tabs.List className="flex border-b border-border px-6 sticky top-0 bg-background z-10 shrink-0 overflow-x-auto scrollbar-none">
                    <Tabs.Trigger
                        value="app"
                        className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all whitespace-nowrap"
                    >
                        User
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="intelligence"
                        className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Icon name="Sparkles" size={14} />
                        Intelligence
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="workspace"
                        className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Icon name="Archive" size={14} />
                        Keep
                    </Tabs.Trigger>

                    {settings.developerMode && (
                        <>
                            <Tabs.Trigger
                                value="networking"
                                className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Icon name="Network" size={14} />
                                Networking
                            </Tabs.Trigger>

                            <Tabs.Trigger
                                value="system"
                                className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Icon name="Telescope" size={14} />
                                The WatchTower
                            </Tabs.Trigger>
                            <Tabs.Trigger
                                value="database"
                                className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Icon name="Database" size={14} />
                                Database
                            </Tabs.Trigger>
                        </>
                    )}

                    {modulePanels.map((panel) => (
                        <Tabs.Trigger
                            key={panel.id}
                            value={panel.id}
                            className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            {panel.icon && <Icon name={panel.icon as any} size={14} />}
                            {panel.title}
                        </Tabs.Trigger>
                    ))}

                    <Tabs.Trigger
                        value="plugins"
                        className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Icon name="Puzzle" size={14} />
                        Plugins
                    </Tabs.Trigger>
                </Tabs.List>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <Tabs.Content
                        value="app"
                        className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <section className="space-y-4">
                                <h2 className="text-lg font-semibold border-b border-border pb-2">General</h2>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Locale</label>
                                    <select
                                        className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                        value={settings.locale}
                                        onChange={(e) => updateSetting('locale', e.target.value)}
                                    >
                                        <option value="en-US">English (US)</option>
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Theme</label>
                                    <select
                                        className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                        value={settings.theme}
                                        onChange={(e) => updateSetting('theme', e.target.value)}
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="system">System</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">Select your preferred appearance mode.</p>
                                </div>

                                <div className="grid gap-4">
                                    <label className="text-sm font-medium">Color Theme</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {THEMES.map((theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => updateSetting('colorTheme', theme.id)}
                                                className={cn(
                                                    "relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all group overflow-hidden",
                                                    settings.colorTheme === theme.id
                                                        ? "border-primary bg-primary/5 shadow-md"
                                                        : "border-border hover:border-border-foreground/20 bg-muted/30"
                                                )}
                                            >
                                                {/* Color Swatch */}
                                                <div className="flex items-center gap-1.5 h-6">
                                                    <div
                                                        className="w-4 h-4 rounded-full shadow-inner"
                                                        style={{ backgroundColor: `hsl(${theme.dark.primary})` }}
                                                    />
                                                    <div
                                                        className="w-4 h-4 rounded-full shadow-inner -ml-1.5 opacity-60"
                                                        style={{ backgroundColor: `hsl(${theme.light.primary})` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-semibold text-left truncate">{theme.name}</span>

                                                {/* Active Indicator */}
                                                {settings.colorTheme === theme.id && (
                                                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                                        <Icon name="Check" size={10} strokeWidth={3} />
                                                    </div>
                                                )}

                                                {/* Hover Glow */}
                                                <div
                                                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                                                    style={{ backgroundColor: `hsl(${theme.dark.primary})` }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Choose a color palette for the application's accent colors.</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="devMode"
                                        checked={settings.developerMode}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        onChange={(e) => updateSetting('developerMode', e.target.checked)}
                                    />
                                    <div>
                                        <label htmlFor="devMode" className="text-sm font-medium block">Developer Mode</label>
                                        <p className="text-xs text-muted-foreground">Enable advanced features and debugging tools.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="zenMode"
                                        checked={settings.zenMode}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        onChange={(e) => updateSetting('zenMode', e.target.checked)}
                                    />
                                    <div>
                                        <label htmlFor="zenMode" className="text-sm font-medium block flex items-center gap-2">
                                            Zen Mode
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Atmospheric</span>
                                        </label>
                                        <p className="text-xs text-muted-foreground">Hide sidebars and status bars for a focused experience. Press <code className="bg-muted px-1 rounded">Ctrl+Alt+Z</code> to toggle.</p>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">System Status Poll Interval</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none"
                                            value={(settings.system?.statusPollInterval || 5000) / 1000}
                                            onChange={(e) => updateSetting('system', {
                                                ...settings.system,
                                                statusPollInterval: Number(e.target.value) * 1000
                                            })}
                                        />
                                        <span className="text-sm text-muted-foreground">seconds</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">How often the System Status page refreshes (1-60s).</p>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Icon name="Castle" size={20} />
                                    <span>The Bastion</span>
                                </h2>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="autoSave"
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={settings.autoSave}
                                        onChange={(e) => updateSetting('autoSave', e.target.checked)}
                                    />
                                    <div>
                                        <label htmlFor="autoSave" className="text-sm font-medium block">Auto-Sync (Bastion)</label>
                                        <p className="text-xs text-muted-foreground">Automatically pull and push changes.</p>
                                    </div>
                                </div>
                                {settings.autoSave && (
                                    <div className="grid gap-2 pl-7">
                                        <label className="text-sm font-medium">Sync Interval</label>
                                        <select
                                            className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                            value={settings.autoSaveInterval || 300000}
                                            onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
                                        >
                                            <option value={60000}>1 minute</option>
                                            <option value={300000}>5 minutes (Default)</option>
                                            <option value={600000}>10 minutes</option>
                                            <option value={900000}>15 minutes</option>
                                            <option value={1800000}>30 minutes</option>
                                        </select>
                                    </div>
                                )}



                                <div className="flex items-center gap-3 pt-4">
                                    <input
                                        type="checkbox"
                                        id="autoCommit"
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={settings.autoCommitEnabled ?? false}
                                        onChange={(e) => updateSetting('autoCommitEnabled', e.target.checked)}
                                    />
                                    <div>
                                        <label htmlFor="autoCommit" className="text-sm font-medium block">Auto-Commit</label>
                                        <p className="text-xs text-muted-foreground">Periodically commit and sync changes using a template.</p>
                                    </div>
                                </div>
                                {settings.autoCommitEnabled && (
                                    <div className="grid gap-4 pl-7">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Commit Interval</label>
                                            <select
                                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                value={settings.autoCommitInterval || 300000}
                                                onChange={(e) => updateSetting('autoCommitInterval', parseInt(e.target.value))}
                                            >
                                                <option value={60000}>1 minute</option>
                                                <option value={300000}>5 minutes (Default)</option>
                                                <option value={600000}>10 minutes</option>
                                                <option value={900000}>15 minutes</option>
                                                <option value={1800000}>30 minutes</option>
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Commit Message Template (Liquid)</label>
                                            <textarea
                                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full h-20 focus:ring-1 focus:ring-primary outline-none font-mono"
                                                value={settings.autoCommitMessage || "Auto-commit: {{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}"}
                                                onChange={(e) => updateSetting('autoCommitMessage', e.target.value)}
                                                placeholder="Auto-commit: {{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}"
                                            />
                                            <p className="text-xs text-muted-foreground">Supports liquid tags. Available: <code>now</code></p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-4 pt-4">
                                    <h3 className="text-sm font-medium">Defaults</h3>
                                    <div className="grid gap-4 pl-7">
                                        <div className="w-full max-w-xs grid gap-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Remote</label>
                                                <input
                                                    type="text"
                                                    className="bg-muted border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                    value={settings.defaultRemote || 'origin'}
                                                    onChange={(e) => updateSetting('defaultRemote', e.target.value)}
                                                    placeholder="origin"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Branch</label>
                                                <input
                                                    type="text"
                                                    className="bg-muted border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                    value={settings.defaultBranch || 'main'}
                                                    onChange={(e) => updateSetting('defaultBranch', e.target.value)}
                                                    placeholder="main"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Used for new bastions if not specified in Keep config.</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 pt-4">
                                    <h3 className="text-sm font-medium">Background Polling</h3>
                                    <div className="flex items-center gap-3">
                                        <input
                                            disabled
                                            type="checkbox"
                                            id="pollingEnabled"
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={settings.gitPollingEnabled ?? true}
                                            onChange={(e) => updateSetting('gitPollingEnabled', e.target.checked)}
                                        />
                                        <div>
                                            <label htmlFor="pollingEnabled" className="text-sm font-medium block">Enable Polling</label>
                                            <p className="text-xs text-muted-foreground">Check for local changes periodically.</p>
                                        </div>
                                    </div>
                                    {settings.gitPollingEnabled !== false && (
                                        <div className="grid gap-4 pl-7">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Interval</label>
                                                <select
                                                    className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                    value={settings.gitPollingInterval || 10000}
                                                    onChange={(e) => updateSetting('gitPollingInterval', parseInt(e.target.value))}
                                                >
                                                    <option value={2000}>2 seconds</option>
                                                    <option value={5000}>5 seconds</option>
                                                    <option value={10000}>10 seconds (Default)</option>
                                                    <option value={30000}>30 seconds</option>
                                                    <option value={60000}>1 minute</option>
                                                    <option value={300000}>5 minutes</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>
                    </Tabs.Content>

                    <Tabs.Content
                        value="intelligence"
                        className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <section className="space-y-6">
                                {/* ═══════════════════ SECTION 0: Master Toggle ═══════════════════ */}
                                <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Icon name="Sparkles" size={20} />
                                        </div>
                                        <div>
                                            <label htmlFor="aiEnabled" className="text-sm font-semibold block cursor-pointer">Enable AI Features</label>
                                            <p className="text-xs text-muted-foreground">Unlock summarization, semantic search, chat, and more.</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            id="aiEnabled"
                                            className="sr-only"
                                            checked={settings.ai?.enabled ?? false}
                                            onChange={(e) => {
                                                const currentAI = settings.ai || { provider: 'ollama', ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' } };
                                                updateSetting('ai', { ...currentAI, enabled: e.target.checked });
                                            }}
                                        />
                                        <div className={cn("w-10 h-5 rounded-full transition-colors cursor-pointer", settings.ai?.enabled ? "bg-primary" : "bg-muted border border-input")} onClick={() => {
                                            const currentAI = settings.ai || { provider: 'ollama', ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' } };
                                            updateSetting('ai', { ...currentAI, enabled: !(settings.ai?.enabled ?? false) });
                                        }} />
                                        <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm pointer-events-none", settings.ai?.enabled ? "translate-x-5" : "translate-x-0")} />
                                    </div>
                                </div>

                                {settings.ai?.enabled && (
                                    <div className="space-y-6">

                                        {/* ═══════════════════ SECTION 1: LLM Configuration ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Bot" size={18} className="text-primary" />
                                                <h3 className="text-sm font-semibold">Language Model</h3>
                                            </div>

                                            <div className="grid gap-4">
                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">Provider</label>
                                                    <select
                                                        className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                        value={settings.ai.provider || 'ollama'}
                                                        onChange={(e) => {
                                                            const currentAI = settings.ai || { provider: 'ollama', enabled: false, ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' } };
                                                            updateSetting('ai', { ...currentAI, provider: e.target.value, llmProvider: e.target.value });
                                                        }}
                                                    >
                                                        <option value="ollama">Ollama (Local)</option>
                                                        <option value="openai">OpenAI</option>
                                                        <option value="gemini">Gemini API</option>
                                                        <option value="azure-foundry">Azure AI Foundry</option>
                                                    </select>
                                                </div>

                                                {/* ─── Ollama-specific fields ─── */}
                                                {(settings.ai.provider === 'ollama' || !settings.ai.provider) && (
                                                    <>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Base URL</label>
                                                            <input
                                                                type="text"
                                                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                                value={settings.ai.ollama?.baseUrl || ''}
                                                                onChange={(e) => updateSetting('ai', {
                                                                    ...settings.ai!,
                                                                    ollama: { ...settings.ai!.ollama, baseUrl: e.target.value }
                                                                })}
                                                                placeholder="http://127.0.0.1:11434"
                                                            />
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Model</label>
                                                            <div className="flex gap-2">
                                                                <ModelSelect
                                                                    value={settings.ai.ollama?.model || ''}
                                                                    onChange={(val) => updateSetting('ai', {
                                                                        ...settings.ai!,
                                                                        ollama: { ...settings.ai!.ollama, model: val }
                                                                    })}
                                                                    availableModels={availableModels}
                                                                    className="w-full max-w-xs"
                                                                />
                                                                <button
                                                                    onClick={async () => {
                                                                        const model = settings.ai?.ollama?.model || 'llama3';
                                                                        setPullStatus(JSON.stringify({ status: 'starting', progress: 0 }));

                                                                        // Standardize progress from IPC
                                                                        const cleanup = __hostApi.on('ai:pull-progress', (data) => {
                                                                            if (data.model === model) {
                                                                                let progress = 0;
                                                                                if (data.total && data.completed) {
                                                                                    progress = Math.round((data.completed / data.total) * 100);
                                                                                }
                                                                                setPullStatus(JSON.stringify({ status: data.status, progress }));
                                                                            }
                                                                        });

                                                                        try {
                                                                            const success = await __hostApi.module.invoke('@citadel-app/base', 'ai.pullModel', model);
                                                                            if (success) {
                                                                                setPullStatus(JSON.stringify({ status: 'Completed!', progress: 100 }));
                                                                                const models = await __hostApi.module.invoke('@citadel-app/base', 'ai.getModels');
                                                                                setAvailableModels(models);
                                                                                setTimeout(() => setPullStatus('idle'), 3000);
                                                                            } else {
                                                                                setPullStatus(JSON.stringify({ status: 'Failed', progress: 0 }));
                                                                                setTimeout(() => setPullStatus('idle'), 3000);
                                                                            }
                                                                        } finally {
                                                                            cleanup();
                                                                        }
                                                                    }}
                                                                    disabled={pullStatus !== 'idle'}
                                                                    className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] ${availableModels.some(m => m.name === settings.ai?.ollama?.model)
                                                                        ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                                                        : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                                                                        }`}
                                                                >
                                                                    {(() => {
                                                                        if (pullStatus === 'idle') {
                                                                            const isInstalled = availableModels.some(m => m.name === settings.ai?.ollama?.model);
                                                                            const modelName = settings.ai?.ollama?.model || 'Model';
                                                                            if (isInstalled) {
                                                                                return <><Icon name="RotateCw" size={14} /> Redownload</>;
                                                                            }
                                                                            return <><Icon name="Download" size={14} /> Pull {modelName}</>;
                                                                        }
                                                                        let statusObj: { status: string, progress: number } = { status: pullStatus, progress: 0 };
                                                                        try { statusObj = JSON.parse(pullStatus); } catch (e) { }
                                                                        const { status, progress } = statusObj;
                                                                        if (status === 'Completed!') return <span>Completed!</span>;
                                                                        if (status === 'Failed') return <span>Failed</span>;
                                                                        return (
                                                                            <div className="flex flex-col w-full gap-1">
                                                                                <div className="flex justify-between items-center text-[10px]">
                                                                                    <span className="max-w-[80px] truncate" title={status}>{status}</span>
                                                                                    <span>{progress}%</span>
                                                                                </div>
                                                                                <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                                                                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">Select an installed model or type a new name to pull.</p>
                                                        </div>
                                                    </>
                                                )}

                                                {/* ─── OpenAI-specific fields ─── */}
                                                {settings.ai.provider === 'openai' && (
                                                    <>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">API Key</label>
                                                            <input type="password" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.openai?.apiKey || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, openai: { ...settings.ai?.openai, apiKey: e.target.value } })} placeholder="sk-..." />
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Base URL <span className="text-muted-foreground font-normal">(optional)</span></label>
                                                            <input type="text" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.openai?.baseUrl || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, openai: { ...settings.ai?.openai, baseUrl: e.target.value } })} placeholder="https://api.openai.com/v1" />
                                                            <p className="text-xs text-muted-foreground">Override for OpenAI-compatible endpoints (e.g. local proxy).</p>
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Model</label>
                                                            <input type="text" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.openai?.model || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, openai: { ...settings.ai?.openai, model: e.target.value } })} placeholder="gpt-4o-mini" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* ─── Gemini-specific fields ─── */}
                                                {settings.ai.provider === 'gemini' && (
                                                    <>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">API Key</label>
                                                            <input type="password" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.gemini?.apiKey || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, gemini: { ...settings.ai?.gemini, apiKey: e.target.value } })} placeholder="AIza..." />
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Model</label>
                                                            <input type="text" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.gemini?.model || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, gemini: { ...settings.ai?.gemini, model: e.target.value } })} placeholder="gemini-2.0-flash" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* ─── Azure AI Foundry-specific fields ─── */}
                                                {settings.ai.provider === 'azure-foundry' && (
                                                    <>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Endpoint URL</label>
                                                            <input type="text" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.openai?.baseUrl || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, openai: { ...settings.ai?.openai, baseUrl: e.target.value } })} placeholder="https://your-resource.openai.azure.com/openai/deployments/your-deployment" />
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">API Key</label>
                                                            <input type="password" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.openai?.apiKey || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, openai: { ...settings.ai?.openai, apiKey: e.target.value } })} placeholder="Azure API key" />
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <label className="text-sm font-medium">Model / Deployment Name</label>
                                                            <input type="text" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ai.openai?.model || ''} onChange={(e) => updateSetting('ai', { ...settings.ai!, openai: { ...settings.ai?.openai, model: e.target.value } })} placeholder="gpt-4o" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Temperature — always visible */}
                                                <div className="grid gap-1.5 pt-2 border-t border-border/50">
                                                    <div className="flex w-full max-w-xs justify-between items-center">
                                                        <label className="text-sm font-medium">Temperature</label>
                                                        <span className="text-xs font-mono text-muted-foreground">{settings.ai?.aiTemperature ?? 0.7}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.1"
                                                        className="w-full max-w-xs accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                                        value={settings.ai?.aiTemperature ?? 0.7}
                                                        onChange={(e) => updateSetting('ai', { ...settings.ai!, aiTemperature: parseFloat(e.target.value) })}
                                                    />
                                                    <p className="text-xs text-muted-foreground">Lower (0.1) = focused, higher (0.9) = creative.</p>
                                                </div>

                                                {/* Connection test */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            setConnectionStatus('checking');
                                                            const res = await __hostApi.module.invoke('@citadel-app/base', 'ai.isAvailable');
                                                            setConnectionStatus(res.available ? 'success' : 'error');

                                                            if (res.available) {
                                                                toast("Successfully connected to AI provider.", { type: 'success' });
                                                                try {
                                                                    const models = await __hostApi.module.invoke('@citadel-app/base', 'ai.getModels');
                                                                    setAvailableModels(models);
                                                                } catch { }
                                                            } else {
                                                                toast(`Failed to connect to AI provider: ${res.reason || 'Unknown error'}. Please check your settings.`, { type: 'error' });
                                                            }

                                                            setTimeout(() => setConnectionStatus('idle'), 3000);
                                                        }}
                                                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs rounded-md transition-colors flex items-center gap-2"
                                                    >
                                                        {connectionStatus === 'checking' && <Icon name="Loader2" size={12} className="animate-spin" />}
                                                        {connectionStatus === 'idle' && "Check Connection"}
                                                        {connectionStatus === 'success' && "Connected!"}
                                                        {connectionStatus === 'error' && "Connection Failed"}
                                                    </button>
                                                    {connectionStatus === 'success' && <Icon name="Check" size={14} className="text-green-500" />}
                                                    {connectionStatus === 'error' && <Icon name="AlertTriangle" size={14} className="text-red-500" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ═══════════════════ SECTION 2: Embeddings & Vector Store ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Layers" size={18} className="text-blue-500" />
                                                <h3 className="text-sm font-semibold">Embeddings & Vector Store</h3>
                                            </div>

                                            <div className="grid gap-4">
                                                {/* Embedding Provider */}
                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">Embedding Provider</label>
                                                    <select
                                                        className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                        value={settings.ai.embeddingProvider || settings.ai.provider || 'ollama'}
                                                        onChange={(e) => updateSetting('ai', { ...settings.ai!, embeddingProvider: e.target.value })}
                                                    >
                                                        <option value="ollama">Ollama (nomic-embed-text)</option>
                                                        <option value="openai">OpenAI (text-embedding-3-small)</option>
                                                        <option value="gemini">Gemini (text-embedding-004)</option>
                                                        <option value="azure-foundry">Azure AI Foundry</option>
                                                    </select>
                                                    <p className="text-[10px] text-amber-500 flex items-center gap-1">
                                                        <Icon name="AlertTriangle" size={10} />
                                                        Changing the embedding provider after indexing will require re-indexing all entries.
                                                    </p>
                                                </div>

                                                {/* Embedding Model — conditional on provider */}
                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">Embedding Model</label>
                                                    {(settings.ai.embeddingProvider || settings.ai.provider || 'ollama') === 'ollama' ? (
                                                        <>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                                    value={settings.ai?.embeddingModel || 'nomic-embed-text'}
                                                                    onChange={(e) => {
                                                                        const currentAI = settings.ai || { provider: 'ollama', enabled: false, ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' } };
                                                                        updateSetting('ai', { ...currentAI, embeddingModel: e.target.value });
                                                                    }}
                                                                    placeholder="nomic-embed-text"
                                                                />
                                                                <button
                                                                    onClick={async () => {
                                                                        const model = settings.ai?.embeddingModel || 'nomic-embed-text';
                                                                        setEmbeddingPullStatus(JSON.stringify({ status: 'starting', progress: 0 }));

                                                                        const cleanup = __hostApi.on('ai:pull-progress', (data) => {
                                                                            if (data.model === model) {
                                                                                let progress = 0;
                                                                                if (data.total && data.completed) {
                                                                                    progress = Math.round((data.completed / data.total) * 100);
                                                                                }
                                                                                setEmbeddingPullStatus(JSON.stringify({ status: data.status, progress }));
                                                                            }
                                                                        });

                                                                        try {
                                                                            const success = await __hostApi.module.invoke('@citadel-app/base', 'ai.pullModel', model);
                                                                            if (success) {
                                                                                setEmbeddingPullStatus(JSON.stringify({ status: 'Completed!', progress: 100 }));
                                                                                setHasEmbeddingModel(true);
                                                                                setTimeout(() => setEmbeddingPullStatus('idle'), 3000);
                                                                            } else {
                                                                                setEmbeddingPullStatus(JSON.stringify({ status: 'Failed', progress: 0 }));
                                                                                setTimeout(() => setEmbeddingPullStatus('idle'), 3000);
                                                                            }
                                                                        } finally {
                                                                            cleanup();
                                                                        }
                                                                    }}
                                                                    disabled={embeddingPullStatus !== 'idle'}
                                                                    className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-2 whitespace-nowrap min-w-[100px] ${hasEmbeddingModel
                                                                        ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                                                        : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                                                                        }`}
                                                                >
                                                                    {(() => {
                                                                        if (embeddingPullStatus === 'idle') {
                                                                            return hasEmbeddingModel
                                                                                ? <><Icon name="RotateCw" size={14} /> Redownload</>
                                                                                : <><Icon name="Download" size={14} /> Pull Model</>;
                                                                        }
                                                                        let statusObj: { status: string, progress: number } = { status: embeddingPullStatus, progress: 0 };
                                                                        try { statusObj = JSON.parse(embeddingPullStatus); } catch (e) { }
                                                                        const { status, progress } = statusObj;
                                                                        if (status === 'Completed!') return <span>Completed!</span>;
                                                                        if (status === 'Failed') return <span>Failed</span>;
                                                                        return (
                                                                            <div className="flex flex-col w-full gap-1">
                                                                                <div className="flex justify-between items-center text-[10px]">
                                                                                    <span className="max-w-[60px] truncate">{status}</span>
                                                                                    <span>{progress}%</span>
                                                                                </div>
                                                                                <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                                                                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">Recommended: <code className="bg-muted px-1 rounded">nomic-embed-text</code> (274MB, 768 dims)</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                                                            <Icon name="Info" size={12} className="inline mr-1 text-blue-500" />
                                                            {(settings.ai.embeddingProvider || settings.ai.provider) === 'openai' && 'Using text-embedding-3-small (1536 dims). Set via OpenAI account.'}
                                                            {(settings.ai.embeddingProvider || settings.ai.provider) === 'gemini' && 'Using text-embedding-004 (768 dims). Set via Gemini account.'}
                                                            {(settings.ai.embeddingProvider || settings.ai.provider) === 'azure-foundry' && 'Using your Azure deployment embedding model. Configured via Azure portal.'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Vector Store (Qdrant) */}
                                                <div className="pt-4 border-t border-border/50 grid gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="Database" size={14} className="text-blue-500" />
                                                        <label className="text-sm font-semibold">Vector Store (Qdrant)</label>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Qdrant enables semantic search (RAG) across your entries. <a href="https://qdrant.tech/documentation/quick-start/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Installation guide</a>
                                                    </p>
                                                    <div className="grid gap-1.5">
                                                        <label className="text-sm font-medium">Qdrant URL</label>
                                                        <input
                                                            type="text"
                                                            className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                            value={settings.ai?.qdrant?.baseUrl || 'http://localhost:6333'}
                                                            onChange={(e) => {
                                                                const currentAI = settings.ai || { provider: 'ollama', enabled: false, ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' } };
                                                                updateSetting('ai', { ...currentAI, qdrant: { ...currentAI.qdrant, baseUrl: e.target.value } });
                                                            }}
                                                            placeholder="http://localhost:6333"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                setQdrantConnectionStatus('checking');
                                                                const res = await __hostApi.module.invoke('@citadel-app/base', 'ai.isAvailable');
                                                                // Rough check for Qdrant if we really want to isolate it
                                                                setQdrantConnectionStatus(res.available ? 'success' : 'error');
                                                                setTimeout(() => setQdrantConnectionStatus('idle'), 3000);
                                                            }}
                                                            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs rounded-md transition-colors flex items-center gap-2"
                                                        >
                                                            {qdrantConnectionStatus === 'checking' && <Icon name="Loader2" size={12} className="animate-spin" />}
                                                            {qdrantConnectionStatus === 'idle' && "Test Connection"}
                                                            {qdrantConnectionStatus === 'success' && "Connected!"}
                                                            {qdrantConnectionStatus === 'error' && "Connection Failed"}
                                                        </button>
                                                        {qdrantConnectionStatus === 'success' && <Icon name="Check" size={14} className="text-green-500" />}
                                                        {qdrantConnectionStatus === 'error' && <Icon name="AlertTriangle" size={14} className="text-red-500" />}
                                                    </div>
                                                    <div className="grid gap-1.5 pt-2 border-t border-border/30">
                                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume Persistence</label>
                                                        <label className="text-sm font-medium">Qdrant Data Host Path</label>
                                                        <div className="flex gap-2">
                                                            <input type="text" className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" value={settings.qdrantDataPath || ''} onChange={(e) => updateSetting('qdrantDataPath', e.target.value)} placeholder="e.g. C:\Users\name\qdrant_storage" />
                                                            <button onClick={async () => { const path = await __hostApi.dialog.openDirectory(); if (path) updateSetting('qdrantDataPath', path); }} className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/80">Browse</button>
                                                            {settings.qdrantDataPath && (<button onClick={() => updateSetting('qdrantDataPath', null)} className="px-3 py-2 text-muted-foreground hover:text-foreground text-xs" title="Reset to default">Clear</button>)}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">Host directory for vector database storage. Leave empty for default.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ═══════════════════ SECTION 3: RAG Indexing Preferences ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Clock" size={18} className="text-amber-500" />
                                                <h3 className="text-sm font-semibold">Indexing Preferences</h3>
                                            </div>

                                            <div className="grid gap-4">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" id="ragAutoIndexOnAction" checked={settings.ragAutoIndexOnAction ?? true} onChange={(e) => updateSetting('ragAutoIndexOnAction', e.target.checked)} className="rounded border-border" />
                                                    <label htmlFor="ragAutoIndexOnAction" className="text-sm">Auto-index when using AI actions (Summarize, Q&A)</label>
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">Re-index Interval</label>
                                                    <select className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ragReindexInterval ?? 24} onChange={(e) => updateSetting('ragReindexInterval', parseInt(e.target.value))}>
                                                        <option value={0}>Manual only (never auto-reindex)</option>
                                                        <option value={1}>Every hour</option>
                                                        <option value={6}>Every 6 hours</option>
                                                        <option value={12}>Every 12 hours</option>
                                                        <option value={24}>Every 24 hours (default)</option>
                                                        <option value={72}>Every 3 days</option>
                                                        <option value={168}>Every week</option>
                                                    </select>
                                                    <p className="text-xs text-muted-foreground">Entries will be re-indexed if their last index is older than this.</p>
                                                </div>

                                                {/* Content Sources */}
                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">Content Sources to Index</label>
                                                    <div className="flex flex-col gap-2 pl-2">
                                                        <div className="flex items-center gap-2">
                                                            <input type="checkbox" id="ragIndexPdf" checked={settings.ragIndexPdf ?? true} onChange={(e) => updateSetting('ragIndexPdf', e.target.checked)} className="rounded border-border" />
                                                            <label htmlFor="ragIndexPdf" className="text-sm">PDF files (extracted text)</label>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input type="checkbox" id="ragIndexUrl" checked={settings.ragIndexUrl ?? true} onChange={(e) => updateSetting('ragIndexUrl', e.target.checked)} className="rounded border-border" />
                                                            <label htmlFor="ragIndexUrl" className="text-sm">Web URLs (via Readability)</label>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input type="checkbox" id="ragIndexMarkdown" checked={settings.ragIndexMarkdown ?? true} onChange={(e) => updateSetting('ragIndexMarkdown', e.target.checked)} className="rounded border-border" />
                                                            <label htmlFor="ragIndexMarkdown" className="text-sm">Markdown content (notes/sections)</label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Text Chunking */}
                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">Text Chunking</label>
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-xs text-muted-foreground">Chunk Size (chars)</label>
                                                            <input type="number" className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none" value={settings.ragChunkSize ?? 1000} onChange={(e) => updateSetting('ragChunkSize', parseInt(e.target.value) || 1000)} min={200} max={4000} step={100} />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-xs text-muted-foreground">Overlap (chars)</label>
                                                            <input type="number" className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none" value={settings.ragChunkOverlap ?? 100} onChange={(e) => updateSetting('ragChunkOverlap', parseInt(e.target.value) || 100)} min={0} max={500} step={50} />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">Larger chunks = more context per embedding. Overlap helps maintain continuity.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ═══════════════════ SECTION 4: Background Indexing ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Activity" size={18} className="text-green-500" />
                                                <h3 className="text-sm font-semibold">Background Indexing</h3>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" id="backgroundIndexingEnabledIntelligence" className="rounded border-gray-300 text-primary focus:ring-primary" checked={settings.backgroundIndexingEnabled ?? true} onChange={(e) => updateSetting('backgroundIndexingEnabled', e.target.checked)} />
                                                <div>
                                                    <label htmlFor="backgroundIndexingEnabledIntelligence" className="text-sm font-medium block">Enable Background Indexing</label>
                                                    <p className="text-xs text-muted-foreground">Automatically index entries for search while you work.</p>
                                                </div>
                                            </div>

                                            {settings.backgroundIndexingEnabled && (
                                                <div className="grid gap-4 pl-7">
                                                    <div className="grid gap-1.5">
                                                        <label className="text-sm font-medium">Indexing Interval</label>
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" min={1} max={60} className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none" value={settings.backgroundIndexingInterval || 5} onChange={(e) => updateSetting('backgroundIndexingInterval', Number(e.target.value))} />
                                                            <span className="text-sm text-muted-foreground">minutes</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <label className="text-sm font-medium">Batch Size</label>
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" min={1} max={50} className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none" value={settings.backgroundIndexingBatchSize || 5} onChange={(e) => updateSetting('backgroundIndexingBatchSize', Number(e.target.value))} />
                                                            <span className="text-sm text-muted-foreground">entries per cycle</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ═══════════════════ SECTION 5: Indexing Restrictions ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Lock" size={18} className="text-orange-500" />
                                                <h3 className="text-sm font-semibold">Indexing Restrictions</h3>
                                            </div>

                                            <p className="text-xs text-muted-foreground">By default, all entries are indexed. Add folders to the whitelist to restrict indexing to specific locations.</p>

                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-2">
                                                    {(settings.ragFolderWhitelist || []).map((folder, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 group">
                                                            <div className="flex-1 overflow-hidden">
                                                                <div className="bg-muted border border-border rounded px-3 py-1.5 text-xs truncate font-mono" title={folder}>{folder}</div>
                                                            </div>
                                                            <button onClick={() => { const newList = [...(settings.ragFolderWhitelist || [])]; newList.splice(idx, 1); updateSetting('ragFolderWhitelist', newList); }} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-destructive/10" title="Remove folder">
                                                                <Icon name="X" size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={async () => { const folder = await __hostApi.dialog.openDirectory(); if (folder) { const current = settings.ragFolderWhitelist || []; if (!current.includes(folder)) { updateSetting('ragFolderWhitelist', [...current, folder]); } } }} className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium rounded transition-colors">
                                                    <Icon name="Plus" size={14} /> Add Whitelisted Folder
                                                </button>
                                                {(settings.ragFolderWhitelist || []).length > 0 && (
                                                    <p className="text-[10px] text-amber-500 font-medium">
                                                        <Icon name="AlertTriangle" size={10} className="inline mr-1" />
                                                        Only entries within these folders will be indexed.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* ═══════════════════ SECTION 6: Text-to-Speech ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Volume2" size={18} className="text-purple-500" />
                                                <h3 className="text-sm font-semibold">Text-to-Speech</h3>
                                            </div>

                                            <div className="grid gap-4">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" id="ttsEnabled2" checked={settings.ttsEnabled ?? false} onChange={(e) => updateSetting('ttsEnabled', e.target.checked)} className="rounded border-border" />
                                                    <label htmlFor="ttsEnabled2" className="text-sm font-medium">Enable TTS Features</label>
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <label className="text-sm font-medium">TTS Server URL</label>
                                                    <input type="text" className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none" value={settings.ttsUrl || 'http://localhost:5050'} onChange={(e) => updateSetting('ttsUrl', e.target.value)} placeholder="http://localhost:5050" />
                                                    <p className="text-xs text-muted-foreground">URL of the local Python TTS server (Kokoro).</p>
                                                </div>

                                                <div className="grid gap-1.5 pt-2 border-t border-border/30">
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume Persistence</label>
                                                    <label className="text-sm font-medium">TTS Data Host Path</label>
                                                    <div className="flex gap-2">
                                                        <input type="text" className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" value={settings.ttsDataPath || ''} onChange={(e) => updateSetting('ttsDataPath', e.target.value)} placeholder="e.g. C:\Users\name\tts_data" />
                                                        <button onClick={async () => { const path = await __hostApi.dialog.openDirectory(); if (path) updateSetting('ttsDataPath', path); }} className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/80">Browse</button>
                                                        {settings.ttsDataPath && (<button onClick={() => updateSetting('ttsDataPath', null)} className="px-3 py-2 text-muted-foreground hover:text-foreground text-xs" title="Reset to default">Clear</button>)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">Host directory for TTS models and cache. Leave empty for default.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ═══════════════════ SECTION 7: Infrastructure Deploy ═══════════════════ */}
                                        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
                                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                                <Icon name="Container" size={18} className="text-cyan-500" />
                                                <h3 className="text-sm font-semibold">Infrastructure Deploy</h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Deploy Docker containers for local services. Requires Docker Desktop to be running.</p>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={async () => {
                                                        if (!window.api?.system?.deployStack) { toast("Deploy feature not available in this build.", { type: 'error' }); return; }
                                                        const btn = document.getElementById('btn-deploy-qdrant-2') as HTMLButtonElement;
                                                        if (btn) { btn.disabled = true; btn.textContent = "Deploying..."; }
                                                        try {
                                                            const res = await __hostApi.module.invoke('@citadel-app/base', 'system.deployStack', 'qdrant');
                                                            if (res.success) { toast("Qdrant vector database is starting up!", { type: 'success' }); }
                                                            else { toast("Qdrant Deploy Failed: " + res.error + ". Make sure Docker Desktop is running.", { type: 'error' }); }
                                                        } catch (e) { toast("Error: " + e, { type: 'error' }); }
                                                        finally { if (btn) { btn.disabled = false; btn.textContent = "Deploy Qdrant"; } }
                                                    }}
                                                    id="btn-deploy-qdrant-2"
                                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 flex items-center gap-2 transition-colors"
                                                >
                                                    <Icon name="Database" size={14} /> Deploy Qdrant
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.api?.system?.deployStack) { toast("Deploy feature not available in this build.", { type: 'error' }); return; }
                                                        const btn = document.getElementById('btn-deploy-tts-2') as HTMLButtonElement;
                                                        if (btn) { btn.disabled = true; btn.textContent = "Deploying..."; }
                                                        try {
                                                            const res = await __hostApi.module.invoke('@citadel-app/base', 'system.deployStack', 'tts-server');
                                                            if (res.success) { toast("TTS server is starting up!", { type: 'success' }); updateSetting('ttsUrl', 'http://localhost:5050'); }
                                                            else { toast("TTS Deploy Failed: " + res.error + ". Make sure Docker Desktop is running.", { type: 'error' }); }
                                                        } catch (e) { toast("Error: " + e, { type: 'error' }); }
                                                        finally { if (btn) { btn.disabled = false; btn.textContent = "Deploy TTS Server"; } }
                                                    }}
                                                    id="btn-deploy-tts-2"
                                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 flex items-center gap-2 transition-colors"
                                                >
                                                    <Icon name="AudioLines" size={14} /> Deploy TTS Server
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </section>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content
                        value="workspace"
                        className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <section className="space-y-4 shrink-0">
                                <h2 className="text-lg font-semibold border-b border-border pb-2">Vault</h2>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-foreground">Location</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={vaultPath || ''}
                                            className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                                            title="To change vault, use File > Open Vault"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Current vault path.</p>
                                </div>
                            </section>
                            <section className="space-y-4 flex-1 flex flex-col min-h-[600px]">
                                <div className="flex-1 min-h-0">
                                    <ConfigEditor />
                                </div>
                            </section>
                            <section className="space-y-4 shrink-0">
                                <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Icon name="Tag" size={20} />
                                    <span>Tag Categories</span>
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Organize your tags into categories with custom colors.
                                </p>
                                <TagCategorySettings />
                            </section>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content
                        value="networking"
                        className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <section className="space-y-4">
                                <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Icon name="Network" size={20} />
                                    <span>Peer-to-Peer Transfer (PeerJS)</span>
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Transfer data directly between application instances using WebRTC.
                                </p>

                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="peerEnabled"
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={settings.peerEnabled}
                                        onChange={(e) => updateSetting('peerEnabled', e.target.checked)}
                                    />
                                    <div>
                                        <label htmlFor="peerEnabled" className="text-sm font-medium block">Enable Peer Transfer</label>
                                        <p className="text-xs text-muted-foreground">Allow this instance to send and receive data bits.</p>
                                    </div>
                                </div>

                                {settings.peerEnabled && (
                                    <div className="grid gap-6 pl-7 pt-2">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Your Peer ID</label>
                                            <div className="flex gap-2 max-w-md">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm font-mono"
                                                    value={settings.peerId}
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(settings.peerId);
                                                        toast("Peer ID copied to clipboard!", { type: 'success' });
                                                    }}
                                                    className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/80"
                                                >
                                                    Copy
                                                </button>
                                                <button
                                                    onClick={() => setShowRegenPeerConfirm(true)}
                                                    className="px-3 py-2 bg-muted border border-border rounded-md text-xs hover:bg-accent"
                                                >
                                                    Regenerate
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Share this ID with another instance to connect.</p>
                                        </div>

                                        <div className="grid gap-2 border-t border-border pt-4">
                                            <label className="text-sm font-medium">ICE Servers (STUN/TURN)</label>
                                            {settings.peerIceServers?.map((server: any, idx: number) => (
                                                <div key={idx} className="flex gap-2 max-w-md">
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                        value={server.urls}
                                                        onChange={(e) => {
                                                            const newServers = [...settings.peerIceServers];
                                                            newServers[idx] = { ...server, urls: e.target.value };
                                                            updateSetting('peerIceServers', newServers);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newServers = settings.peerIceServers.filter((_: any, i: number) => i !== idx);
                                                            updateSetting('peerIceServers', newServers);
                                                        }}
                                                        className="p-2 text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Icon name="Trash2" size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newServers = [...(settings.peerIceServers || []), { urls: '' }];
                                                    updateSetting('peerIceServers', newServers);
                                                }}
                                                className="text-sm text-primary hover:underline flex items-center gap-1 w-fit"
                                            >
                                                <Icon name="Plus" size={14} />
                                                Add ICE Server
                                            </button>
                                            <p className="text-xs text-muted-foreground italic">Default: Google STUN server (stun:stun.l.google.com:19302)</p>
                                        </div>

                                        <div className="grid gap-4 border-t border-border pt-4">
                                            <label className="text-sm font-medium">Test Connection</label>
                                            <div className="flex gap-2 max-w-md">
                                                <input
                                                    type="text"
                                                    placeholder="Enter Remote Peer ID"
                                                    className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                    value={testRemoteId}
                                                    onChange={(e) => setTestRemoteId(e.target.value)}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const targetId = testRemoteId.trim();
                                                        if (!targetId) return toast("Please enter a Peer ID", { type: 'warning' });
                                                        if (targetId === settings.peerId) return toast("You cannot connect to yourself!", { type: 'warning' });

                                                        const btn = document.activeElement as HTMLButtonElement;
                                                        const originalText = btn.textContent;
                                                        btn.disabled = true;
                                                        btn.textContent = "Connecting...";

                                                        try {
                                                            const success = await connect(testRemoteId.trim());
                                                            if (success) {
                                                                toast(`Successfully connected to ${testRemoteId}!`, { type: 'success' });
                                                                send(testRemoteId.trim(), 'ping', { time: Date.now() });
                                                            } else {
                                                                toast(`Failed to connect to ${testRemoteId}. Check if it is online and using the same ICE servers.`, { type: 'error' });
                                                            }
                                                        } finally {
                                                            btn.disabled = false;
                                                            btn.textContent = originalText;
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                                                >
                                                    Connect & Ping
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    </Tabs.Content>
                    {/* Developer Pages */}
                    {
                        settings.developerMode && (
                            <>
                                <Tabs.Content
                                    value="system"
                                    className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                                >
                                    <Outlet />
                                </Tabs.Content>
                                <Tabs.Content
                                    value="database"
                                    className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                                >
                                    <Outlet />
                                </Tabs.Content>
                            </>
                        )
                    }

                    <Tabs.Content
                        value="plugins"
                        className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                    >
                        <Outlet />
                    </Tabs.Content>

                    {modulePanels.map((panel) => (
                        <Tabs.Content
                            key={panel.id}
                            value={panel.id}
                            className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                        >
                            <Suspense fallback={<div className="p-6 text-sm text-muted-foreground flex items-center justify-center h-full">Loading mapping...</div>}>
                                <panel.component />
                            </Suspense>
                        </Tabs.Content>
                    ))}
                </div>
            </Tabs.Root>

            <ConfirmDialog
                open={!!confirmRemoveEnv}
                onOpenChange={(open) => !open && setConfirmRemoveEnv(null)}
                title="Remove Environment"
                description={`Are you sure you want to remove the ${confirmRemoveEnv} environment?`}
                confirmLabel="Remove"
                onConfirm={() => {
                    if (confirmRemoveEnv) {
                        const newEnvs = { ...settings.executionEnvironments };
                        delete newEnvs[confirmRemoveEnv];
                        updateSetting('executionEnvironments', newEnvs);
                    }
                    setConfirmRemoveEnv(null);
                }}
                variant="destructive"
            />

            <ConfirmDialog
                open={showRegenPeerConfirm}
                onOpenChange={setShowRegenPeerConfirm}
                title="Regenerate Peer ID"
                description="This will disconnect you from current peers. Are you sure?"
                confirmLabel="Regenerate"
                onConfirm={() => {
                    const newId = window.crypto.randomUUID();
                    updateSetting('peerId', newId);
                    setShowRegenPeerConfirm(false);
                }}
                variant="destructive"
            />
        </div >
    );
};
