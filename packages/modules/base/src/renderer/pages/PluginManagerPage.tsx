import { useState, useEffect } from 'react';
import { Icon, Button, Switch } from '@citadel-app/ui';
import { hostApi as __hostApi } from '../host-services';

export const PluginManagerPage = () => {
    const [plugins, setPlugins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlugins = async () => {
            try {
                const list = await __hostApi.module.invoke('@citadel-app/base', 'plugins.list');
                setPlugins(list || []);
            } catch (e) {
                console.error("Failed to fetch plugins", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPlugins();
    }, []);

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

    if (loading) return <div className="p-6">Loading plugins...</div>;

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
                                        <span className="text-sm font-medium">{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
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
    );
};
