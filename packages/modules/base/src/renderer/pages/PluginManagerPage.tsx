import { useState, useEffect } from 'react';
import { Icon, Button, Switch, MarkdownViewer } from '@citadel-app/ui';
import { hostApi as __hostApi, appModuleRegistry } from '../host-services';
import { useAppSettings } from '../context/AppSettingsContext';
import { cn } from '@citadel-app/ui';

const PluginSettingsView = ({ pluginId }: { pluginId: string }) => {
    const { settings, updateSetting } = useAppSettings();
    const config = appModuleRegistry.getPluginSettingsConfig(pluginId);

    if (!config) return <div className="p-6 text-muted-foreground italic border border-dashed border-border m-6 rounded-lg text-center">This extension does not provide any configuration options.</div>;

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
            const el = document.getElementById(`secret-${fieldId}`) as HTMLInputElement;
            if (el) el.value = '';
            __hostApi.module.invoke('@citadel-app/base', 'toast.show', 'Secret saved securely.');
        } catch (e) {
            console.error("Failed to save secret", e);
        }
    };

    return (
        <div className="p-10 max-w-3xl space-y-8 animate-in fade-in duration-300">
            <div>
                <h3 className="text-xl font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-primary rounded-full"/> {config.title || 'Settings'}</h3>
                <p className="text-sm text-muted-foreground mt-2">Configure behavior for {pluginId}</p>
            </div>

            <div className="space-y-6">
                {config.fields.map(field => {
                    const val = pluginSettings[field.id] ?? field.defaultValue ?? '';
                    return (
                        <div key={field.id} className="space-y-1.5 pb-6 border-b border-border/40 last:border-0 hover:bg-muted/10 p-4 -mx-4 rounded-xl transition-colors">
                            <label className="text-sm font-semibold">{field.label}</label>
                            {field.description && <p className="text-xs text-muted-foreground mb-3">{field.description}</p>}

                            {field.type === 'string' && (
                                <input type="text" className="w-full max-w-md bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder} value={val} onChange={e => handleUpdate(field.id, e.target.value)} />
                            )}
                            {field.type === 'number' && (
                                <input type="number" className="w-32 bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder} value={val} onChange={e => handleUpdate(field.id, Number(e.target.value))} />
                            )}
                            {field.type === 'boolean' && (
                                <div className="mt-2">
                                    <Switch checked={!!val} onCheckedChange={c => handleUpdate(field.id, c)} />
                                </div>
                            )}
                            {field.type === 'textarea' && (
                                <textarea className="w-full max-w-2xl bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none min-h-[120px]" placeholder={field.placeholder} value={val} onChange={e => handleUpdate(field.id, e.target.value)} />
                            )}
                            {field.type === 'password' && (
                                <input type="password" className="w-full max-w-md bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder || '••••••••'} value={val} onChange={e => handleUpdate(field.id, e.target.value)} />
                            )}
                            {field.type === 'secret' && (
                                <div className="flex gap-2 max-w-md">
                                    <input type="password" id={`secret-${field.id}`} className="flex-1 bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder || '•••••••• (Secure Store)'} />
                                    <Button size="sm" variant="secondary" onClick={() => {
                                        const el = document.getElementById(`secret-${field.id}`) as HTMLInputElement;
                                        if (el) handleSecretUpdate(field.id, el.value);
                                    }}>Save</Button>
                                </div>
                            )}
                            {field.type === 'select' && (
                                <select className="w-full max-w-xs bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" value={val} onChange={e => handleUpdate(field.id, e.target.value)}>
                                    {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            )}
                            {field.type === 'string-array' && (
                                <input type="text" className="w-full max-w-2xl bg-muted/50 border border-input rounded px-3 py-2 text-sm focus:border-primary outline-none" placeholder={field.placeholder || 'item1, item2, item3'} value={Array.isArray(val) ? val.join(', ') : val} onChange={e => handleUpdate(field.id, e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
                            )}
                        </div>
                    );
                })}
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

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<'readme' | 'settings' | 'permissions'>('readme');
    const [citadelVersion, setCitadelVersion] = useState<string>('1.1.1');
    const [isCompatible, setIsCompatible] = useState<boolean>(true);

    const isVersionNewer = (remote?: string, local?: string) => {
        if (!remote || !local) return false;
        try {
            const r = remote.split('.').map(Number);
            const l = local.split('.').map(Number);
            for (let i = 0; i < Math.max(r.length, l.length); i++) {
                if ((r[i] || 0) > (l[i] || 0)) return true;
                if ((r[i] || 0) < (l[i] || 0)) return false;
            }
        } catch {
            return remote !== local;
        }
        return false;
    };

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
        __hostApi.module.invoke('@citadel-app/base', 'plugins.getCitadelVersion').then(setCitadelVersion).catch(console.error);
    }, []);

    useEffect(() => {
        const fetchMarketplace = async () => {
            setLoadingMarketplace(true);
            try {
                const res = await fetch('https://api.github.com/repos/citadel-app/citadel-marketplace/contents/directory');
                if (!res.ok) throw new Error("Failed to fetch marketplace directory");
                const files = await res.json();

                const pluginEntries: { name: string, path: string }[] = [];

                await Promise.all(files.map(async (file: any) => {
                    if (file.type !== 'dir' || file.name.startsWith('.')) return;

                    if (file.name.startsWith('@')) {
                        try {
                            const scopeRes = await fetch(file.url);
                            if (scopeRes.ok) {
                                const scopeFiles = await scopeRes.json();
                                scopeFiles.forEach((sf: any) => {
                                    if (sf.type === 'dir' && !sf.name.startsWith('.')) {
                                        pluginEntries.push({ name: sf.name, path: `${file.name}/${sf.name}` });
                                    }
                                });
                            }
                        } catch (e) {
                            console.error(`Failed to fetch scope ${file.name}`, e);
                        }
                    } else {
                        pluginEntries.push({ name: file.name, path: file.name });
                    }
                }));

                const loaded = await Promise.all(
                    pluginEntries.map(async (entry) => {
                        try {
                            const pkgUrl = `https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/directory/${entry.path}/package.json`;
                            const pRes = await fetch(pkgUrl);
                            if (!pRes.ok) return null;
                            const pkg = await pRes.json();

                            let readme = '';
                            try {
                                const readmeUrl = `https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/directory/${entry.path}/README.md`;
                                const rRes = await fetch(readmeUrl);
                                if (rRes.ok) readme = await rRes.text();
                            } catch {}

                            return {
                                ...pkg,
                                _marketplacePath: entry.path,
                                author: pkg.citadel?.author || (typeof pkg.author === 'object' ? pkg.author.name : pkg.author),
                                authorUrl: pkg.citadel?.authorUrl || (typeof pkg.author === 'object' ? pkg.author.url : undefined),
                                verified: pkg.citadel?.verified === true,
                                readme
                            };
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
            window.location.reload();
        } catch (e) {
            console.error("Failed to toggle plugin", e);
        }
    };

    const handleUninstall = async (pluginId: string) => {
        if (!window.confirm("Are you sure you want to uninstall this extension?")) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'plugins.uninstall', pluginId);
            window.location.reload();
        } catch (e) {
            console.error("Failed to uninstall plugin", e);
        }
    };

    const handleInstall = async (plugin: any) => {
        try {
            const bundleUrl = plugin.citadel?.bundleUrl;
            if (!bundleUrl) {
                alert("This extension is improperly configured (missing bundleUrl).");
                return;
            }
            await __hostApi.module.invoke('@citadel-app/base', 'plugins.install', plugin.name, bundleUrl);
            window.location.reload();
        } catch (e) {
            console.error("Install logic failed", e);
            alert("Failed to install extension: " + String(e));
        }
    };

    const activeList = activeTab === 'installed' ? plugins : marketplacePlugins;
    const filteredList = activeList.filter(p => {
        const title = p.citadel?.title || p.name || '';
        const desc = p.description || '';
        const q = searchQuery.toLowerCase();
        return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    });

    const selectedPluginObj = plugins.find(p => p.id === selectedPluginId || p.name === selectedPluginId)
        || marketplacePlugins.find(p => (p.citadel?.id || p.name) === selectedPluginId);

    useEffect(() => {
        if (selectedPluginObj) {
            __hostApi.module.invoke('@citadel-app/base', 'plugins.validateCompatibility', selectedPluginObj.engines || (selectedPluginObj.citadel?.engines))
                .then(setIsCompatible)
                .catch(() => setIsCompatible(true));
        }
    }, [selectedPluginObj?.id, selectedPluginObj?.version]);

    const isInstalledSelected = selectedPluginObj && plugins.some(p =>
        p.id === selectedPluginObj.id ||
        p.id === selectedPluginObj.citadel?.id ||
        p.name === selectedPluginObj.name
    );
    const hasSettings = isInstalledSelected && appModuleRegistry.getPluginSettingsConfig(selectedPluginObj?.id || selectedPluginId!);

    const marketplaceMatch = marketplacePlugins.find(m => m.name === selectedPluginObj?.id || m.name === selectedPluginObj?.name || m.citadel?.id === selectedPluginObj?.id);
    const updateAvailable = isInstalledSelected && marketplaceMatch && isVersionNewer(marketplaceMatch.version, selectedPluginObj.version);

    const { settings, updateSetting } = useAppSettings();
    const pluginSettings = settings.plugins?.[selectedPluginObj?.id || selectedPluginId!] || {};
    const autoUpdateEnabled = !!pluginSettings.autoUpdate;

    const handleToggleAutoUpdate = (enabled: boolean) => {
        const id = selectedPluginObj?.id || selectedPluginId!;
        updateSetting('plugins', {
            ...settings.plugins,
            [id]: {
                ...pluginSettings,
                autoUpdate: enabled
            }
        });
    };

    return (
        <div className="flex-1 flex h-full w-full bg-background overflow-hidden text-foreground">
            <div className="w-[300px] flex flex-col border-r border-border bg-muted/10 shrink-0 shadow-xl z-20">
                <div className="p-4 border-b border-border/50 shrink-0">
                    <div className="flex justify-between items-center mb-4 mt-2 px-1">
                        <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                            <Icon name="Puzzle" size={14} /> EXTENSIONS
                        </h2>
                    </div>

                    <div className="bg-muted/50 p-1 rounded-md flex mb-4">
                        <button
                            onClick={() => setActiveTab('installed')}
                            className={cn("flex-1 text-xs font-medium py-1.5 rounded transition-all", activeTab === 'installed' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            Installed
                        </button>
                        <button
                            onClick={() => setActiveTab('marketplace')}
                            className={cn("flex-1 text-xs font-medium py-1.5 rounded transition-all", activeTab === 'marketplace' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            Marketplace
                        </button>
                    </div>

                    <div className="relative">
                        <Icon name="Search" size={14} className="absolute left-2.5 top-[7px] text-muted-foreground/70" />
                        <input
                            type="text"
                            placeholder="Search extensions by name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-background border border-border/60 rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-background/50">
                    {(activeTab === 'installed' && loading) || (activeTab === 'marketplace' && loadingMarketplace) ? (
                        <div className="text-center py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <span className="animate-spin"><Icon name="Loader" size={14} /></span> Loading catalog...
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground italic">No extensions found.</div>
                    ) : (
                        filteredList.map(plugin => {
                            const isSelected = selectedPluginId === (plugin.id || plugin.name);
                            const iconVal = plugin.citadel?.icon || plugin.icon;
                            const iconSrc = iconVal
                                ? (plugin._absolutePath
                                    ? `codex://${plugin._absolutePath.replace(/\\/g, '/')}/${iconVal}`
                                    : `https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/directory/${plugin._marketplacePath || plugin.name}/${iconVal}`)
                                : null;
                            return (
                                <div
                                    key={plugin.citadel?.id || plugin.id || plugin.name}
                                    onClick={() => { setSelectedPluginId(plugin.citadel?.id || plugin.id || plugin.name); setDetailTab('readme'); }}
                                    className={cn(
                                        "flex gap-3 p-2.5 rounded-lg cursor-pointer transition-all items-center -mx-1",
                                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                    )}
                                >
                                    {iconSrc ? (
                                        <>
                                            <img src={iconSrc} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); e.currentTarget.nextElementSibling?.classList.add('flex'); }} className="w-9 h-9 rounded shrink-0 object-cover bg-muted border border-border/50 shadow-sm" alt="" />
                                            <div className={cn("hidden items-center justify-center w-9 h-9 rounded shrink-0 bg-muted/40 border border-border/50 shadow-sm text-muted-foreground", isSelected && "bg-primary/20 text-primary border-primary/30")}><Icon name="Package" size={18} /></div>
                                        </>
                                    ) : (
                                        <div className={cn("w-9 h-9 flex items-center justify-center rounded shrink-0 bg-muted/40 border border-border/50 shadow-sm text-muted-foreground", isSelected && "bg-primary/20 text-primary border-primary/30")}><Icon name="Package" size={18} /></div>
                                    )}
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="text-[13px] font-semibold truncate leading-tight tracking-tight mb-0.5 flex items-center gap-2">
                                            {plugin.citadel?.title || plugin.name}
                                            {activeTab === 'marketplace' && plugins.some(p => p.id === (plugin.citadel?.id || plugin.id) || p.name === plugin.name) && (
                                                <span className="text-[9px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.25 rounded font-bold">Installed</span>
                                            )}
                                            {(() => {
                                                const installed = plugins.find(p => p.id === (plugin.citadel?.id || plugin.id) || p.name === plugin.name);
                                                if (installed && isVersionNewer(plugin.version, installed.version)) {
                                                    return <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.25 rounded font-bold">Update Available</span>;
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <div className={cn("text-[11px] truncate max-w-full opacity-80", isSelected ? "text-primary/70" : "text-muted-foreground")}>{plugin.description || 'Extension bundle'}</div>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center pl-1 text-[10px] text-muted-foreground font-mono bg-muted/30 px-1 rounded opacity-60">v{plugin.version}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden shrink relative bg-card shadow-inner border-l border-white/5 dark:border-white/0">
                {!selectedPluginObj ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 pointer-events-none select-none z-0">
                        <div style={{opacity: 0.8}}><Icon name="Puzzle" size={120} /></div>
                        <h2 className="mt-4 text-xl tracking-widest font-bold opacity-50 uppercase">Extensions</h2>
                        <p className="opacity-50 text-sm mt-2">Select an extension to view details.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 z-10 animate-in fade-in zoom-in-95 duration-200 origin-center bg-background">
                        <div className="px-10 py-10 shrink-0 border-b border-border/60 bg-muted/5 shadow-sm">
                            <div className="flex gap-6 items-start">
                                {selectedPluginObj.citadel?.icon || selectedPluginObj.icon ? (
                                    <>
                                        <img src={selectedPluginObj.citadel?.icon || selectedPluginObj.icon ? (selectedPluginObj._absolutePath
                                            ? `codex://${selectedPluginObj._absolutePath.replace(/\\/g, '/')}/${selectedPluginObj.citadel?.icon || selectedPluginObj.icon}`
                                            : `https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/directory/${selectedPluginObj._marketplacePath || selectedPluginObj.name}/${selectedPluginObj.citadel?.icon || selectedPluginObj.icon}`
                                        ) : undefined} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); e.currentTarget.nextElementSibling?.classList.add('flex'); }} className="w-24 h-24 rounded-2xl object-cover bg-background border border-border overflow-hidden shadow-md" alt="" />
                                        <div className="hidden w-24 h-24 rounded-2xl items-center justify-center bg-background border border-border text-muted-foreground shadow-md shrink-0">
                                            <div style={{opacity: 0.8}}><Icon name="Package" size={48} /></div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-background border border-border text-muted-foreground shadow-md shrink-0">
                                        <div style={{opacity: 0.8}}><Icon name="Package" size={48} /></div>
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 pt-1">
                                    <h1 className="text-3xl font-bold truncate tracking-tight flex items-center gap-3">
                                        {selectedPluginObj.citadel?.title || selectedPluginObj.name}
                                    </h1>
                                    <div className="flex items-center gap-3 mt-2 text-[13px] text-muted-foreground">
                                        {selectedPluginObj.authorUrl ? (
                                            <a
                                                href={selectedPluginObj.authorUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-semibold text-foreground flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    window.open(selectedPluginObj.authorUrl, '_blank');
                                                }}
                                            >
                                                <Icon name="User" size={12} /> {selectedPluginObj.author || 'Unknown Publisher'}
                                            </a>
                                        ) : (
                                            <span className="font-semibold text-foreground flex items-center gap-1.5"><Icon name="User" size={12} /> {selectedPluginObj.author || 'Unknown Publisher'}</span>
                                        )}
                                        {selectedPluginObj.verified && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                                <Icon name="Check" size={10} /> Verified
                                            </span>
                                        )}
                                        <span className="opacity-40">&bull;</span>
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] shadow-sm tracking-wider">v{selectedPluginObj.version || '1.0.1'}</span>
                                        {updateAvailable && (
                                            <span className="text-amber-500 font-bold text-[11px] animate-pulse">
                                                (Update Available: v{marketplaceMatch.version})
                                            </span>
                                        )}
                                        <span className="opacity-40">&bull;</span>
                                        <span className="font-mono text-muted-foreground/70">{selectedPluginObj.id || selectedPluginObj.name}</span>
                                    </div>

                                    {!isCompatible && (
                                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 items-center animate-in slide-in-from-top-2 duration-300">
                                            <div className="text-destructive shrink-0"><Icon name="ShieldAlert" size={18} /></div>
                                            <div className="text-sm font-semibold text-destructive">
                                                Incompatible with Citadel v{citadelVersion}. Requires: {selectedPluginObj.engines?.citadel || selectedPluginObj.citadel?.engines?.citadel || 'Unknown Version'}
                                            </div>
                                        </div>
                                    )}

                                    <p className="mt-4 text-sm max-w-2xl leading-relaxed text-muted-foreground/90 font-medium">{selectedPluginObj.description || 'No description provided.'}</p>

                                    <div className="flex items-center gap-3 mt-6">
                                        {!isInstalledSelected ? (
                                            <Button onClick={() => handleInstall(selectedPluginObj)} disabled={!isCompatible} className="gap-2 px-8 font-semibold shadow-md whitespace-nowrap">
                                                <Icon name="Download" size={16} /> {isCompatible ? 'Install Extension' : 'Incompatible'}
                                            </Button>
                                        ) : (
                                            <>
                                                {updateAvailable ? (
                                                    <Button onClick={() => handleInstall(marketplaceMatch)} disabled={!isCompatible} className="gap-2 px-8 font-semibold shadow-md whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white border-0">
                                                        <Icon name="RefreshCw" size={16} className="animate-spin-slow" /> {isCompatible ? `Update to v${marketplaceMatch.version}` : 'Update Incompatible'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant={selectedPluginObj.enabled ? 'outline' : 'default'}
                                                        className="gap-2 w-[140px] font-semibold"
                                                        onClick={() => handleToggle(selectedPluginObj.id, !selectedPluginObj.enabled)}
                                                    >
                                                        <Icon name={selectedPluginObj.enabled ? "PowerOff" : "Power"} size={16} />
                                                        {selectedPluginObj.enabled ? 'Disable' : 'Enable'}
                                                    </Button>
                                                )}

                                                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:border-destructive/30 border border-transparent font-semibold gap-2 transition-all" onClick={() => handleUninstall(selectedPluginObj.id)}>
                                                    <Icon name="Trash2" size={16} /> Uninstall
                                                </Button>

                                                <div className="ml-auto flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                                    <span className="text-xs font-medium text-muted-foreground">Stay Up to Date</span>
                                                    <Switch checked={autoUpdateEnabled} onCheckedChange={handleToggleAutoUpdate} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-10 border-b border-border shadow-sm shrink-0 bg-background relative z-20">
                            <div className="flex gap-8">
                                <button className={cn("py-3 text-sm font-semibold border-b-2 transition-all relative overflow-hidden group", detailTab === 'readme' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')} onClick={() => setDetailTab('readme')}>
                                    Details
                                    {detailTab === 'readme' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary animate-in slide-in-from-left duration-300"/>}
                                </button>
                                {isInstalledSelected && hasSettings && (
                                    <button className={cn("py-3 text-sm font-semibold border-b-2 transition-all relative overflow-hidden group", detailTab === 'settings' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')} onClick={() => setDetailTab('settings')}>
                                        Settings
                                        {detailTab === 'settings' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary animate-in slide-in-from-left duration-300"/>}
                                    </button>
                                )}
                                <button className={cn("py-3 text-sm font-semibold border-b-2 transition-all relative overflow-hidden group", detailTab === 'permissions' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')} onClick={() => setDetailTab('permissions')}>
                                    Dependencies & Security
                                    {detailTab === 'permissions' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary animate-in slide-in-from-left duration-300"/>}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-background">
                            {detailTab === 'readme' && (
                                <div className="px-10 py-10 max-w-4xl animate-in fade-in duration-300">
                                    <div className="prose prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-sm">
                                        {selectedPluginObj.readme ? (
                                            <MarkdownViewer content={selectedPluginObj.readme} />
                                        ) : (
                                            <div className="text-muted-foreground italic flex flex-col items-center justify-center p-12 bg-muted/10 border border-dashed border-border rounded-xl">
                                                <div className="mb-4 opacity-50"><Icon name="FileText" size={32} /></div>
                                                No README details provided for this extension.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'settings' && isInstalledSelected && (
                                <PluginSettingsView pluginId={selectedPluginId!} />
                            )}

                            {detailTab === 'permissions' && (
                                <div className="p-10 max-w-3xl space-y-10 animate-in fade-in duration-300">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-3"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"/> Capabilities Provided</h3>
                                        <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">System-level capabilities this extension registers into the application framework upon activation.</p>
                                        {selectedPluginObj.citadel?.capabilities?.length ? (
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                {selectedPluginObj.citadel.capabilities.map((cap: string) => (
                                                    <div key={cap} className="px-4 py-3 bg-card border border-border/80 rounded-xl flex items-center font-mono text-[13px] shadow-sm font-medium">{cap}</div>
                                                ))}
                                            </div>
                                        ) : <div className="p-6 bg-muted/10 border border-dashed border-border rounded-xl text-sm text-muted-foreground font-medium text-center">No capabilities declared.</div>}
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"/> Extrinsic Permissions</h3>
                                        <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">Protected Node.js backend IPC channels this module requires authorization to invoke.</p>
                                        {selectedPluginObj.citadel?.permissions?.length ? (
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                {selectedPluginObj.citadel.permissions.map((perm: string) => (
                                                    <div key={perm} className="px-4 py-3 bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl flex items-center font-mono text-[13px] shadow-sm font-medium">{perm}</div>
                                                ))}
                                            </div>
                                        ) : <div className="p-6 bg-muted/10 border border-dashed border-border rounded-xl text-sm text-muted-foreground font-medium text-center">No external permissions requested.</div>}
                                    </div>

                                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-4 mt-12 items-start shadow-sm">
                                        <div className="text-amber-500 shrink-0 mt-0.5"><Icon name="ShieldAlert" size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-amber-500 mb-1 leading-tight tracking-tight">System Access Warning</h4>
                                            <p className="text-xs text-amber-500/80 leading-relaxed">
                                                Extensions are evaluated locally and have absolute access to your filesystem, shell payload bindings, and background processes. Only install extensions from publishers you implicitly trust.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
