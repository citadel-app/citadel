import { useState, useEffect } from 'react';
import { Icon, Button, Switch, MarkdownViewer } from '@citadel-app/ui';
import { hostApi as __hostApi, appModuleRegistry } from '../host-services';
import { useAppSettings } from '../context/AppSettingsContext';

const PluginSettingsModal = ({ pluginId, onClose }: { pluginId: string, onClose: () => void }) => {
    const { settings, updateSetting } = useAppSettings();
    const config = appModuleRegistry.getPluginSettingsConfig(pluginId);
    
    if (!config) return null;
    
    const pluginSettings = settings.plugins?.[pluginId] || {};

    const handleUpdate = (fieldId: string, value: any) => {
        updateSetting('plugins', {
            ...settings.plugins,
            [pluginId]: {
                ...pluginSettings,
                [fieldId]: value
            }
        });
    };

    const handleSecretUpdate = async (fieldId: string, value: string) => {
        if (!value) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'secrets.set', `${pluginId}.${fieldId}`, value);
            // Optionally clear the input box
            const el = document.getElementById(`secret-${fieldId}`) as HTMLInputElement;
            if (el) el.value = '';
            __hostApi.module.invoke('@citadel-app/base', 'toast.show', 'Secret saved securely.');
        } catch (e) {
            console.error("Failed to save secret", e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end" onClick={onClose}>
            <div className="w-[450px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shadow-sm z-10">
                    <div>
                        <h2 className="text-lg font-semibold">{config.title || 'Settings'}</h2>
                        <p className="text-sm text-muted-foreground">{pluginId}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><Icon name="X" size={18} /></Button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {config.fields.map(field => {
                        const val = pluginSettings[field.id] ?? field.defaultValue ?? '';
                        return (
                            <div key={field.id} className="space-y-1.5">
                                <label className="text-sm font-medium">{field.label}</label>
                                {field.description && <p className="text-xs text-muted-foreground mb-2">{field.description}</p>}
                                
                                {field.type === 'string' && (
                                    <input type="text" className="w-full bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder} value={val} onChange={e => handleUpdate(field.id, e.target.value)} />
                                )}
                                {field.type === 'number' && (
                                    <input type="number" className="w-full bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder} value={val} onChange={e => handleUpdate(field.id, Number(e.target.value))} />
                                )}
                                {field.type === 'boolean' && (
                                    <div className="mt-1">
                                        <Switch checked={!!val} onCheckedChange={c => handleUpdate(field.id, c)} />
                                    </div>
                                )}
                                {field.type === 'textarea' && (
                                    <textarea className="w-full bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none min-h-[100px]" placeholder={field.placeholder} value={val} onChange={e => handleUpdate(field.id, e.target.value)} />
                                )}
                                {field.type === 'password' && (
                                    <input type="password" className="w-full bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder || '••••••••'} value={val} onChange={e => handleUpdate(field.id, e.target.value)} />
                                )}
                                {field.type === 'secret' && (
                                    <div className="flex gap-2">
                                        <input type="password" id={`secret-${field.id}`} className="flex-1 bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder || '•••••••• (Secure Store)'} />
                                        <Button size="sm" variant="secondary" onClick={() => {
                                            const el = document.getElementById(`secret-${field.id}`) as HTMLInputElement;
                                            if (el) handleSecretUpdate(field.id, el.value);
                                        }}>Save</Button>
                                    </div>
                                )}
                                {field.type === 'select' && (
                                    <select className="w-full bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" value={val} onChange={e => handleUpdate(field.id, e.target.value)}>
                                        {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                )}
                                {field.type === 'string-array' && (
                                    <input type="text" className="w-full bg-muted border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder || 'item1, item2, item3'} value={Array.isArray(val) ? val.join(', ') : val} onChange={e => handleUpdate(field.id, e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const PluginInfoModal = ({ plugin, onClose }: { plugin: any, onClose: () => void }) => {
    if (!plugin) return null;
    
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-8" onClick={onClose}>
            <div className="w-full max-w-4xl h-full max-h-[90vh] bg-card border border-border shadow-2xl flex flex-col rounded-xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {plugin.citadel?.icon ? (
                            <img src={`https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/plugins/${plugin.name}/${plugin.citadel.icon}`} alt="icon" className="w-10 h-10 rounded-lg bg-muted object-cover border border-border" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground"><Icon name="Package" size={20} /></div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold">{plugin.citadel?.title || plugin.name}</h2>
                            <p className="text-sm font-mono text-muted-foreground">{plugin.name} &bull; v{plugin.version}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><Icon name="X" size={18} /></Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                    {/* Capabilities & Permissions Row */}
                    {(plugin.citadel?.capabilities?.length > 0 || plugin.citadel?.permissions?.length > 0) && (
                        <div className="grid grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-1.5"><span className="text-amber-500 flex items-center"><Icon name="Zap" size={14} /></span> Capabilities Provided</h3>
                                <p className="text-xs text-muted-foreground mb-2">Native functionalities this plugin exposes to the system.</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {plugin.citadel?.capabilities?.length ? plugin.citadel.capabilities.map((cap: string) => (
                                        <span key={cap} className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-xs font-mono">{cap}</span>
                                    )) : <span className="text-xs text-muted-foreground italic">None explicit</span>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-1.5"><span className="text-blue-500 flex items-center"><Icon name="Shield" size={14} /></span> Permissions Required</h3>
                                <p className="text-xs text-muted-foreground mb-2">Host APIs this plugin is sandboxed to access.</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {plugin.citadel?.permissions?.length ? plugin.citadel.permissions.map((perm: string) => (
                                        <span key={perm} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-xs font-mono">{perm}</span>
                                    )) : <span className="text-xs text-muted-foreground italic">None explicit</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        {plugin.readme ? (
                            <MarkdownViewer content={plugin.readme} />
                        ) : (
                            <div className="text-center py-12 text-muted-foreground italic border border-dashed border-border rounded-xl bg-muted/10">
                                No README provided by the developer.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PluginManagerPage = () => {
    const [plugins, setPlugins] = useState<any[]>([]);
    const [marketplacePlugins, setMarketplacePlugins] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
    const [loading, setLoading] = useState(true);
    const [loadingMarketplace, setLoadingMarketplace] = useState(false);
    const [settingsPluginId, setSettingsPluginId] = useState<string | null>(null);
    const [infoPlugin, setInfoPlugin] = useState<any | null>(null);

    const fetchPlugins = async () => {
        try {
            setLoading(true);
            const list = await __hostApi.module.invoke('@citadel-app/base', 'plugins.list');
            setPlugins(list || []);
        } catch (e) {
            console.error("Failed to fetch plugins", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlugins();
    }, []);

    useEffect(() => {
        const fetchMarketplace = async () => {
            setLoadingMarketplace(true);
            try {
                const res = await fetch('https://api.github.com/repos/citadel-app/citadel-marketplace/contents/plugins');
                if (!res.ok) throw new Error("Failed to fetch marketplace directory");
                const files = await res.json();
                
                const loaded = await Promise.all(
                    files.filter((f: any) => f.type === 'dir' && !f.name.startsWith('.'))
                         .map(async (dir: any) => {
                             try {
                                 const pRes = await fetch(`https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/plugins/${dir.name}/package.json`);
                                 if (!pRes.ok) return null;
                                 const pkg = await pRes.json();
                                 let readme = '';
                                 try {
                                     const rRes = await fetch(`https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/plugins/${dir.name}/README.md`);
                                     if (rRes.ok) readme = await rRes.text();
                                 } catch {}
                                 return { ...pkg, readme };
                             } catch { return null; }
                         })
                );
                setMarketplacePlugins(loaded.filter(Boolean));
            } catch (e) {
                console.error("Marketplace error", e);
            } finally {
                setLoadingMarketplace(false);
            }
        };

        if (activeTab === 'marketplace' && marketplacePlugins.length === 0) {
            fetchMarketplace();
        }
    }, [activeTab]);

    const handleToggle = async (pluginId: string, enabled: boolean) => {
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'plugins.toggle', pluginId, enabled);
            setPlugins(plugins.map(p => p.id === pluginId ? { ...p, enabled } : p));
        } catch (e) {
            console.error("Failed to toggle plugin", e);
        }
    };

    const handleUninstall = async (pluginId: string) => {
        if (!window.confirm("Are you sure you want to uninstall this plugin?")) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'plugins.uninstall', pluginId);
            setPlugins(plugins.filter(p => p.id !== pluginId));
        } catch (e) {
            console.error("Failed to uninstall plugin", e);
        }
    };

    const handleInstall = async (plugin: any) => {
        try {
            const bundleUrl = plugin.citadel?.bundleUrl;
            if (!bundleUrl) {
                alert("This plugin is improperly configured (missing bundleUrl).");
                return;
            }
            await __hostApi.module.invoke('@citadel-app/base', 'plugins.install', plugin.name, bundleUrl);
            await fetchPlugins();
            setActiveTab('installed');
        } catch (e) {
            console.error("Install logic failed", e);
            alert("Failed to install plugin: " + String(e));
        }
    };

    if (loading && activeTab === 'installed') return <div className="p-6">Loading plugins...</div>;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-6 px-6 pt-6 pb-2 border-b border-border">
                <button 
                    onClick={() => setActiveTab('installed')}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'installed' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Installed Plugins
                </button>
                <button 
                    onClick={() => setActiveTab('marketplace')}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'marketplace' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Marketplace
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {activeTab === 'installed' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center border-b border-border pb-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Icon name="Puzzle" size={20} />
                                <span>Installed Plugins</span>
                            </h2>
                            <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/citadel-app/citadel-marketplace', '_blank')}>
                                <span className="mr-2 flex"><Icon name="ExternalLink" size={14} /></span>
                                Marketplace
                            </Button>
                        </div>

                        {plugins.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/20">
                                <div className="mx-auto text-muted-foreground mb-4 opacity-50 w-fit"><Icon name="Puzzle" size={48} /></div>
                                <h3 className="text-lg font-medium">No Plugins Installed</h3>
                                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                                    Plugins extend the capabilities of Citadel. You can discover and install community plugins from the marketplace.
                                </p>
                                <Button className="mt-6" onClick={() => setActiveTab('marketplace')}>Browse Marketplace</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {plugins.map(plugin => (
                                    <div key={plugin.id} className="p-4 bg-card border border-border rounded-xl flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-semibold">{plugin.name || plugin.id}</h3>
                                                <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">v{plugin.version || '1.0.0'}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">{plugin.description || 'No description provided.'}</p>
                                            <div className="text-xs text-muted-foreground/70">
                                                Author: {plugin.author || 'Unknown'} • ID: {plugin.id}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <div className="flex items-center gap-2">
                                                {appModuleRegistry.getPluginSettingsConfig(plugin.id) && (
                                                    <Button variant="outline" size="sm" onClick={() => setSettingsPluginId(plugin.id)}>
                                                        <span className="mr-1.5 flex"><Icon name="Settings" size={14} /></span> Settings
                                                    </Button>
                                                )}
                                                <span className="text-sm font-medium ml-2">{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
                                                <Switch
                                                    checked={plugin.enabled}
                                                    onCheckedChange={(checked) => handleToggle(plugin.id, checked)}
                                                />
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleUninstall(plugin.id)}>
                                                <span className="mr-1.5 flex"><Icon name="Trash2" size={14} /></span> Uninstall
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'marketplace' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center border-b border-border pb-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Icon name="Globe" size={20} />
                                <span>Discover Plugins</span>
                            </h2>
                            <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/citadel-app/citadel-marketplace', '_blank')}>
                                Submit a Plugin
                            </Button>
                        </div>
                        
                        {loadingMarketplace ? (
                            <div className="text-center py-12 text-muted-foreground">Fetching registry directly from GitHub...</div>
                        ) : (
                            <div className="grid gap-4">
                                {marketplacePlugins.map(plugin => {
                                    const isInstalled = plugins.some(p => p.id === plugin.name);
                                    return (
                                        <div key={plugin.name} className="p-4 bg-card border border-border rounded-xl flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-base font-semibold">{plugin.citadel?.title || plugin.name}</h3>
                                                    <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">v{plugin.version || '1.0.0'}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3">{plugin.description || 'No description provided.'}</p>
                                                <div className="text-xs text-muted-foreground/70">
                                                    Author: {plugin.author || 'Unknown'} • ID: {plugin.name}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3 justify-center">
                                                <Button size="sm" variant={isInstalled ? "outline" : "default"} disabled={isInstalled} onClick={() => handleInstall(plugin)}>
                                                    <span className="mr-1.5 flex"><Icon name={isInstalled ? "Check" : "Download"} size={14} /></span> 
                                                    {isInstalled ? 'Installed' : 'Install'}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setInfoPlugin(plugin)}>
                                                    <span className="mr-1.5 flex"><Icon name="Info" size={14} /></span> Details
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                <section className="space-y-4 pt-4">
                    <h2 className="text-sm font-semibold border-b border-border pb-2 text-muted-foreground">Advanced</h2>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-amber-500 flex items-center gap-2 mb-1">
                            <Icon name="AlertTriangle" size={14} /> Security Warning
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Plugins are loaded as local Node.js processes and UI React components. They have full access to your filesystem and Citadel environment. Only install plugins from developers you trust.
                        </p>
                    </div>
                </section>
            </div>
            {settingsPluginId && (
                <PluginSettingsModal 
                    pluginId={settingsPluginId} 
                    onClose={() => setSettingsPluginId(null)} 
                />
            )}
            <PluginInfoModal plugin={infoPlugin} onClose={() => setInfoPlugin(null)} />
        </div>
    );
};
