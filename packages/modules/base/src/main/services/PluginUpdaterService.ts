import { app } from 'electron';
import { PluginManagerService } from './PluginManagerService';
import { AppSettingsService } from './AppSettingsService';

export class PluginUpdaterService {
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly CHECK_PERIOD = 6 * 60 * 60 * 1000; // 6 hours

    constructor(
        private pluginManager: PluginManagerService,
        private settings: AppSettingsService
    ) {
        if (app.isPackaged) {
            console.log('[PluginUpdater] Initializing background update polling...');
            this.startPolling();
        } else {
            console.log('[PluginUpdater] Background polling disabled in development mode.');
        }
    }

    private startPolling() {
        // Initial delay to let the app settle
        setTimeout(() => this.checkForUpdates(), 10000);
        this.checkInterval = setInterval(() => this.checkForUpdates(), this.CHECK_PERIOD);
    }

    private async checkForUpdates() {
        if (!app.isPackaged) return;
        console.log('[PluginUpdater] Checking for extension updates...');
        try {
            const marketplace = await this.fetchMarketplaceMetadata();
            const installed = this.pluginManager.getInstalledPlugins();

            for (const plugin of installed) {
                const remote = marketplace.find(m => m.name === plugin.id || m.name === plugin.name);
                if (remote && this.isVersionNewer(remote.version, plugin.version)) {
                    // Check compatibility with current Citadel version
                    const manifestForRemote = {
                        id: remote.citadel?.id || remote.name,
                        version: remote.version,
                        engines: remote.engines || (remote.citadel?.engines)
                    } as any;

                    if (!this.pluginManager.validateCompatibility(manifestForRemote)) {
                        console.log(`[PluginUpdater] Skipping update for ${plugin.id} to v${remote.version} (Incompatible with Citadel v${this.pluginManager.getCitadelVersion()}).`);
                        continue;
                    }

                    const pluginSettings = this.settings.getSettings().plugins?.[plugin.id] || {};
                    if (pluginSettings.autoUpdate) {
                        const bundleUrl = remote.citadel?.bundleUrl;
                        if (bundleUrl) {
                            console.log(`[PluginUpdater] Auto-updating ${plugin.id} (v${plugin.version} -> v${remote.version})`);
                            await this.pluginManager.installPlugin(plugin.id, bundleUrl);
                        }
                    } else {
                        console.log(`[PluginUpdater] Update available for ${plugin.id} (v${remote.version}), but auto-update is disabled.`);
                    }
                }
            }
        } catch (e) {
            console.error('[PluginUpdater] Failed to check for plugin updates:', e);
        }
    }

    private async fetchMarketplaceMetadata(): Promise<any[]> {
        const baseUrl = 'https://raw.githubusercontent.com/citadel-app/citadel-marketplace/main/directory';
        try {
            const res = await fetch('https://api.github.com/repos/citadel-app/citadel-marketplace/contents/directory');
            if (!res.ok) throw new Error("Failed to fetch marketplace directory");
            const files = await res.json() as any[];

            const pluginEntries: string[] = [];
            for (const file of files) {
                if (file.type === 'dir' && !file.name.startsWith('.')) {
                    if (file.name.startsWith('@')) {
                        const scopeRes = await fetch(file.url);
                        if (scopeRes.ok) {
                            const scopeFiles = await scopeRes.json() as any[];
                            scopeFiles.forEach(sf => {
                                if (sf.type === 'dir' && !sf.name.startsWith('.')) {
                                    pluginEntries.push(`${file.name}/${sf.name}`);
                                }
                            });
                        }
                    } else {
                        pluginEntries.push(file.name);
                    }
                }
            }

            const metadataList = await Promise.all(
                pluginEntries.map(async (path) => {
                    try {
                        const pkgRes = await fetch(`${baseUrl}/${path}/package.json`);
                        if (!pkgRes.ok) return null;
                        return await pkgRes.json();
                    } catch {
                        return null;
                    }
                })
            );

            return metadataList.filter(Boolean);
        } catch (e) {
            console.error('[PluginUpdater] Marketplace fetch error:', e);
            return [];
        }
    }

    private isVersionNewer(remote: string, local: string): boolean {
        // Basic version comparison logic
        try {
            const r = remote.split('.').map(Number);
            const l = local.split('.').map(Number);
            for (let i = 0; i < Math.max(r.length, l.length); i++) {
                const rv = r[i] || 0;
                const lv = l[i] || 0;
                if (rv > lv) return true;
                if (rv < lv) return false;
            }
        } catch {
            return remote !== local;
        }
        return false;
    }
}
