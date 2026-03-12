import { useConfig } from '../context/ConfigContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { usePeer } from '../context/PeerContext';
import { Icon } from '../components/IconRegistry';
import * as Tabs from '@radix-ui/react-tabs';
import { ConfigEditor } from '../components/settings/ConfigEditor';

import { ModelSelect } from '../components/settings/ModelSelect';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { THEMES } from '@shared';
import { cn } from '../lib/utils';
import { TagCategorySettings } from '../components/settings/TagCategorySettings';

export const SettingsPage = () => {
    const { vaultPath } = useConfig();
    const { toast } = useToast();
    const { settings, updateSetting } = useAppSettings();
    const { connect, send } = usePeer();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine current tab from URL
    const currentPath = location.pathname.split('/').pop() || 'app';
    const activeTab = ['system', 'database', 'intelligence', 'execution', 'workspace', 'networking'].includes(currentPath) ? currentPath : 'app';

    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [pullStatus, setPullStatus] = useState<string>('idle');
    const [availableModels, setAvailableModels] = useState<import('@shared').AIModel[]>([]);
    const [testRemoteId, setTestRemoteId] = useState('');

    // Qdrant state
    const [qdrantConnectionStatus, setQdrantConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [embeddingPullStatus, setEmbeddingPullStatus] = useState<string>('idle');
    const [hasEmbeddingModel, setHasEmbeddingModel] = useState<boolean>(false);



    useEffect(() => {
        const fetchModels = async () => {
            if (settings.ai?.enabled) {
                try {
                    const models = await window.api.ai.getModels();
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
                                value="execution"
                                className="px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Icon name="Flame" size={14} />
                                Code Execution
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
                                <h2 className="text-lg font-semibold border-b border-border pb-2">LaTeX Configuration</h2>
                                <div className="grid gap-2">
                                    <label htmlFor="latexPath" className="text-sm font-medium">
                                        Custom pdflatex Path
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="latexPath"
                                            type="text"
                                            placeholder="e.g. C:\texlive\2024\bin\windows\pdflatex.exe"
                                            className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={settings.latexPath || ''}
                                            onChange={(e) => updateSetting('latexPath', e.target.value)}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (window.api && window.api.latex) {
                                                    const available = await window.api.latex.check();
                                                    alert(available ? "pdflatex found!" : "pdflatex not found.");
                                                }
                                            }}
                                            className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80"
                                        >
                                            Verify
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to attempt auto-detection.
                                    </p>
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

                            <section className="space-y-4">
                                <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Icon name="Rss" size={20} />
                                    <span>Feeds (RSS & YouTube)</span>
                                </h2>

                                <div className="grid gap-6 pl-4">
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">RSS Refresh Interval</label>
                                            <select
                                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                value={settings.rssRefreshInterval || 0}
                                                onChange={(e) => updateSetting('rssRefreshInterval', parseInt(e.target.value))}
                                            >
                                                <option value={0}>Manual Only</option>
                                                <option value={3600000}>Every Hour</option>
                                                <option value={7200000}>Every 2 Hours (Default)</option>
                                                <option value={21600000}>Every 6 Hours</option>
                                                <option value={43200000}>Every 12 Hours</option>
                                                <option value={86400000}>Every 24 Hours</option>
                                            </select>
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">YouTube Refresh Interval</label>
                                            <select
                                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                                value={settings.youtubeRefreshInterval || 0}
                                                onChange={(e) => updateSetting('youtubeRefreshInterval', parseInt(e.target.value))}
                                            >
                                                <option value={0}>Manual Only</option>
                                                <option value={3600000}>Every Hour</option>
                                                <option value={7200000}>Every 2 Hours (Default)</option>
                                                <option value={21600000}>Every 6 Hours</option>
                                                <option value={43200000}>Every 12 Hours</option>
                                                <option value={86400000}>Every 24 Hours</option>
                                            </select>
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Update Batch Size</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={50}
                                                    className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none"
                                                    value={settings.feedRefreshBatchSize || 5}
                                                    onChange={(e) => updateSetting('feedRefreshBatchSize', Number(e.target.value))}
                                                />
                                                <span className="text-sm text-muted-foreground">feeds per render</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Controls how many feeds are processed before the UI updates. Smaller batches prevent interface stutters.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content
                        value="execution"
                        className="flex-1 flex-col min-h-0 outline-none overflow-hidden hidden data-[state=active]:flex"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <section className="space-y-4">
                                <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Icon name="Flame" size={20} />
                                    <span>Code Execution</span>
                                </h2>

                                <div className="grid gap-4 pl-4">
                                    <p className="text-sm text-muted-foreground">
                                        Configure the Docker environments used to execute code safely.
                                    </p>

                                    <div className="grid gap-2 border-b border-border pb-4 mb-2">
                                        <label className="text-sm font-medium">Execution Server URL</label>
                                        <input
                                            type="text"
                                            className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                            value={settings.executionUrl || 'http://localhost:5051'}
                                            onChange={(e) => updateSetting('executionUrl', e.target.value)}
                                            placeholder="http://localhost:5051"
                                        />
                                        <p className="text-xs text-muted-foreground">URL of the local Python Execution server.</p>
                                    </div>

                                    {/* Tabbed Environments UI */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium">Environments</h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Configure Runtimes</p>
                                        </div>

                                        <Tabs.Root
                                            defaultValue={Object.keys(settings.executionEnvironments || {})[0] || 'add-new'}
                                            className="border border-border rounded-xl overflow-hidden bg-card/30 flex flex-col min-h-[400px]"
                                        >
                                            <Tabs.List className="flex bg-muted/50 border-b border-border p-1 gap-1 overflow-x-auto scrollbar-none">
                                                {Object.keys(settings.executionEnvironments || {}).map(lang => (
                                                    <Tabs.Trigger
                                                        key={lang}
                                                        value={lang}
                                                        className="px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap
                                                        data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted text-muted-foreground"
                                                    >
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            settings.executionEnvironments?.[lang]?.image ? "bg-green-400" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                                                        )} />
                                                        <span className="capitalize">{lang}</span>
                                                    </Tabs.Trigger>
                                                ))}
                                                <Tabs.Trigger
                                                    value="add-new"
                                                    className="px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap
                                                    data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=inactive]:hover:bg-muted text-muted-foreground ml-auto border border-dashed border-border"
                                                >
                                                    <Icon name="Plus" size={14} />
                                                    Add New
                                                </Tabs.Trigger>
                                            </Tabs.List>

                                            {/* Environment Settings Content */}
                                            {Object.entries(settings.executionEnvironments || {}).map(([lang, config]) => (
                                                <Tabs.Content key={lang} value={lang} className="p-6 outline-none animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <h4 className="text-lg font-bold capitalize flex items-center gap-2">
                                                                {lang} Environment
                                                            </h4>
                                                            <span className="text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground font-mono font-bold tracking-wider">.{config.extension}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to remove the ${lang} environment?`)) {
                                                                    const newEnvs = { ...settings.executionEnvironments };
                                                                    delete newEnvs[lang];
                                                                    updateSetting('executionEnvironments', newEnvs);
                                                                }
                                                            }}
                                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
                                                            title="Delete Environment"
                                                        >
                                                            <Icon name="Trash2" size={14} />
                                                            Remove
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Docker Image</label>
                                                            <div className="relative">
                                                                <Icon name="Box" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                    value={config.image}
                                                                    onChange={(e) => {
                                                                        const newEnvs = { ...settings.executionEnvironments };
                                                                        newEnvs[lang] = { ...config, image: e.target.value };
                                                                        updateSetting('executionEnvironments', newEnvs);
                                                                    }}
                                                                    placeholder="e.g. python:3.9-slim"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Run Command</label>
                                                            <div className="relative">
                                                                <Icon name="Terminal" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                    value={config.command}
                                                                    onChange={(e) => {
                                                                        const newEnvs = { ...settings.executionEnvironments };
                                                                        newEnvs[lang] = { ...config, command: e.target.value };
                                                                        updateSetting('executionEnvironments', newEnvs);
                                                                    }}
                                                                    placeholder="e.g. python /code/script.py"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="md:col-span-2 space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">LSP Command (Local)</label>
                                                                <div className="relative">
                                                                    <Icon name="Cpu" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                        value={config.lspCommand || ''}
                                                                        onChange={(e) => {
                                                                            const newEnvs = { ...settings.executionEnvironments };
                                                                            newEnvs[lang] = { ...config, lspCommand: e.target.value };
                                                                            updateSetting('executionEnvironments', newEnvs);
                                                                        }}
                                                                        placeholder="e.g. pylsp"
                                                                    />
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground pl-1 italic">Used for providing intellisense features in the workshop.</p>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Default Boilerplate</label>
                                                                <textarea
                                                                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[120px] resize-none"
                                                                    value={config.snippet || ''}
                                                                    onChange={(e) => {
                                                                        const newEnvs = { ...settings.executionEnvironments };
                                                                        newEnvs[lang] = { ...config, snippet: e.target.value };
                                                                        updateSetting('executionEnvironments', newEnvs);
                                                                    }}
                                                                    placeholder="// Initial code for new scrolls..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Tabs.Content>
                                            ))}

                                            {/* Add New Environment Content */}
                                            <Tabs.Content value="add-new" className="p-8 outline-none animate-in fade-in slide-in-from-right-2 duration-300">
                                                <div className="max-w-xl mx-auto space-y-8">
                                                    <div className="text-center space-y-2">
                                                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-xl shadow-primary/5">
                                                            <Icon name="PlusCircle" size={32} />
                                                        </div>
                                                        <h3 className="text-xl font-bold">New Execution Environment</h3>
                                                        <p className="text-sm text-muted-foreground">Add a new language runtime to your Citadel Forge.</p>
                                                    </div>

                                                    <div className="grid gap-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Language (ID)</label>
                                                                <input
                                                                    id="new-env-name"
                                                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                    placeholder="e.g. ruby"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Extension</label>
                                                                <input
                                                                    id="new-env-ext"
                                                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                    placeholder="e.g. rb"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Docker Image</label>
                                                            <input
                                                                id="new-env-image"
                                                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                placeholder="e.g. ruby:alpine"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Run Command</label>
                                                            <input
                                                                id="new-env-cmd"
                                                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                placeholder="ruby /code/script.rb"
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                const nameInput = document.getElementById('new-env-name') as HTMLInputElement;
                                                                const extInput = document.getElementById('new-env-ext') as HTMLInputElement;
                                                                const imageInput = document.getElementById('new-env-image') as HTMLInputElement;
                                                                const cmdInput = document.getElementById('new-env-cmd') as HTMLInputElement;

                                                                const name = nameInput.value.trim().toLowerCase();
                                                                if (!name) return alert("Language name is required");
                                                                if (settings.executionEnvironments?.[name]) return alert("Environment already exists");

                                                                const newEnvs = { ...settings.executionEnvironments };
                                                                newEnvs[name] = {
                                                                    image: imageInput.value.trim() || `${name}:latest`,
                                                                    command: cmdInput.value.trim() || `${name} /code/script.${extInput.value.trim() || 'txt'}`,
                                                                    extension: extInput.value.trim() || 'txt'
                                                                };

                                                                updateSetting('executionEnvironments', newEnvs);

                                                                // Reset form
                                                                nameInput.value = '';
                                                                extInput.value = '';
                                                                imageInput.value = '';
                                                                cmdInput.value = '';
                                                            }}
                                                            className="mt-2 w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                                        >
                                                            Forged Environment
                                                        </button>
                                                    </div>
                                                </div>
                                            </Tabs.Content>
                                        </Tabs.Root>
                                    </div>

                                    <div className="mt-4 p-4 rounded bg-primary/5 border border-primary/20">
                                        <h4 className="text-sm font-medium flex items-center gap-2 text-primary mb-2">
                                            How it works
                                        </h4>
                                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                            <li>Code is executed inside isolated <strong>Docker containers</strong>.</li>
                                            <li>The <strong>Docker Image</strong> must be available locally (run <code>docker pull &lt;image&gt;</code>).</li>
                                            <li>The code file is mounted to <code>/code/script.&lt;ext&gt;</code> inside the container.</li>
                                        </ul>
                                    </div>
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
                                                                        const cleanup = window.api.ai.onPullProgress((data) => {
                                                                            if (data.model === model) {
                                                                                let progress = 0;
                                                                                if (data.total && data.completed) {
                                                                                    progress = Math.round((data.completed / data.total) * 100);
                                                                                }
                                                                                setPullStatus(JSON.stringify({ status: data.status, progress }));
                                                                            }
                                                                        });

                                                                        try {
                                                                            const success = await window.api.ai.pullModel(model);
                                                                            if (success) {
                                                                                setPullStatus(JSON.stringify({ status: 'Completed!', progress: 100 }));
                                                                                const models = await window.api.ai.getModels();
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
                                                            const res = await window.api.ai.isAvailable();
                                                            setConnectionStatus(res.available ? 'success' : 'error');

                                                            if (res.available) {
                                                                toast("Successfully connected to AI provider.", { type: 'success' });
                                                                try {
                                                                    const models = await window.api.ai.getModels();
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

                                                                        const cleanup = window.api.ai.onPullProgress((data) => {
                                                                            if (data.model === model) {
                                                                                let progress = 0;
                                                                                if (data.total && data.completed) {
                                                                                    progress = Math.round((data.completed / data.total) * 100);
                                                                                }
                                                                                setEmbeddingPullStatus(JSON.stringify({ status: data.status, progress }));
                                                                            }
                                                                        });

                                                                        try {
                                                                            const success = await window.api.ai.pullModel(model);
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
                                                                const res = await window.api.ai.isAvailable();
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
                                                            <button onClick={async () => { const path = await window.api.dialog.openDirectory(); if (path) updateSetting('qdrantDataPath', path); }} className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/80">Browse</button>
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
                                                <button onClick={async () => { const folder = await window.api.dialog.openDirectory(); if (folder) { const current = settings.ragFolderWhitelist || []; if (!current.includes(folder)) { updateSetting('ragFolderWhitelist', [...current, folder]); } } }} className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium rounded transition-colors">
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
                                                        <button onClick={async () => { const path = await window.api.dialog.openDirectory(); if (path) updateSetting('ttsDataPath', path); }} className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/80">Browse</button>
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
                                                        if (!window.api?.system?.deployStack) { alert("Deploy feature not available in this build."); return; }
                                                        const btn = document.getElementById('btn-deploy-qdrant-2') as HTMLButtonElement;
                                                        if (btn) { btn.disabled = true; btn.textContent = "Deploying..."; }
                                                        try {
                                                            const res = await window.api.system.deployStack('qdrant');
                                                            if (res.success) { alert("Qdrant vector database is starting up!"); }
                                                            else { alert("Qdrant Deploy Failed: " + res.error + "\n\nMake sure Docker Desktop is running."); }
                                                        } catch (e) { alert("Error: " + e); }
                                                        finally { if (btn) { btn.disabled = false; btn.textContent = "Deploy Qdrant"; } }
                                                    }}
                                                    id="btn-deploy-qdrant-2"
                                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 flex items-center gap-2 transition-colors"
                                                >
                                                    <Icon name="Database" size={14} /> Deploy Qdrant
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.api?.system?.deployStack) { alert("Deploy feature not available in this build."); return; }
                                                        const btn = document.getElementById('btn-deploy-tts-2') as HTMLButtonElement;
                                                        if (btn) { btn.disabled = true; btn.textContent = "Deploying..."; }
                                                        try {
                                                            const res = await window.api.system.deployStack('tts-server');
                                                            if (res.success) { alert("TTS server is starting up!"); updateSetting('ttsUrl', 'http://localhost:5050'); }
                                                            else { alert("TTS Deploy Failed: " + res.error + "\n\nMake sure Docker Desktop is running."); }
                                                        } catch (e) { alert("Error: " + e); }
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
                                                        alert("Peer ID copied to clipboard!");
                                                    }}
                                                    className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs hover:bg-secondary/80"
                                                >
                                                    Copy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Regenerate Peer ID? This will disconnect you from current peers.")) {
                                                            const newId = window.crypto.randomUUID();
                                                            updateSetting('peerId', newId);
                                                        }
                                                    }}
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
                                                        if (!targetId) return alert("Please enter a Peer ID");
                                                        if (targetId === settings.peerId) return alert("You cannot connect to yourself!");

                                                        const btn = document.activeElement as HTMLButtonElement;
                                                        const originalText = btn.textContent;
                                                        btn.disabled = true;
                                                        btn.textContent = "Connecting...";

                                                        try {
                                                            const success = await connect(testRemoteId.trim());
                                                            if (success) {
                                                                alert(`Successfully connected to ${testRemoteId}!`);
                                                                send(testRemoteId.trim(), 'ping', { time: Date.now() });
                                                            } else {
                                                                alert(`Failed to connect to ${testRemoteId}. Check if it is online and using the same ICE servers.`);
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
                </div >
            </Tabs.Root >
        </div >
    );
};
