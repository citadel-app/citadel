import { MainRegistrar } from '@citadel-app/core';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
// import { download } from 'electron-dl'; // if we need HTTP downloading later

export interface PluginManifest {
    id: string;
    version: string;
    name: string;
    description: string;
    author: string;
    main?: string;       // Path to node process entry
    renderer?: string;   // Path to renderer process entry
    enabled: boolean;
}

export class PluginManagerService {
    private pluginsDir: string;
    private plugins: Map<string, PluginManifest> = new Map();

    constructor(private registrar: MainRegistrar<'@citadel-app/base'>) {
        this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
        this.ensurePluginsDir();
        this.registerIpcs();
        this.loadPlugins();
    }

    private ensurePluginsDir() {
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirpSync(this.pluginsDir);
        }
    }

    private registerIpcs() {
        this.registrar.handle('plugins.list', async () => {
            return Array.from(this.plugins.values());
        });

        this.registrar.handle('plugins.install', async (pluginId: string, downloadUrl: string) => {
            // Implementation for downloading zip and extracting would go here
            // For now, assume it's done via another mechanism or we mock it
            throw new Error("Install not fully implemented yet");
        });

        this.registrar.handle('plugins.uninstall', async (pluginId: string) => {
            const pluginPath = path.join(this.pluginsDir, pluginId.replace(/[^a-zA-Z0-9_-]/g, ''));
            if (fs.existsSync(pluginPath)) {
                await fs.remove(pluginPath);
                this.plugins.delete(pluginId);
            }
        });

        this.registrar.handle('plugins.toggle', async (pluginId: string, enabled: boolean) => {
            const plugin = this.plugins.get(pluginId);
            if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
            
            plugin.enabled = enabled;
            const manifestPath = path.join(this.pluginsDir, pluginId.replace(/[^a-zA-Z0-9_-]/g, ''), 'manifest.json');
            
            if (fs.existsSync(manifestPath)) {
                await fs.writeJSON(manifestPath, plugin, { spaces: 2 });
            }
        });

        this.registrar.handle('plugins.readRenderer', async (pluginId: string) => {
            const plugin = this.plugins.get(pluginId);
            if (!plugin || !plugin.renderer) return null;
            
            const scriptPath = path.join(this.pluginsDir, pluginId.replace(/[^a-zA-Z0-9_-]/g, ''), plugin.renderer);
            if (fs.existsSync(scriptPath)) {
                return await fs.readFile(scriptPath, 'utf8');
            }
            return null;
        });
    }

    public async loadPlugins() {
        this.plugins.clear();
        
        const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const pluginPath = path.join(this.pluginsDir, entry.name);
                const manifestPath = path.join(pluginPath, 'manifest.json');
                
                try {
                    if (await fs.pathExists(manifestPath)) {
                        const manifest: PluginManifest = await fs.readJSON(manifestPath);
                        this.plugins.set(manifest.id, manifest);
                        
                        // Load backend script if enabled
                        if (manifest.enabled && manifest.main) {
                            this.executePluginMain(manifest, pluginPath);
                        }
                    }
                } catch (e) {
                    console.error(`Failed to load plugin at ${pluginPath}:`, e);
                }
            }
        }
    }

    private executePluginMain(manifest: PluginManifest, pluginPath: string) {
        try {
            const mainScriptPath = path.join(pluginPath, manifest.main!);
            if (fs.existsSync(mainScriptPath)) {
                // Warning: dynamic require of unbundled external script
                const pluginExports = require(mainScriptPath);
                
                if (pluginExports && typeof pluginExports.activateMain === 'function') {
                    // We'd pass a newly scoped MainRegistrar to the plugin, but for now we pass the base one 
                    // or a mock to prevent it polluting everything indiscriminately.
                    // Wait, the real architecture handles creating a scoped registrar via `MainModuleRegistry.createRegistrar(id)`.
                    // We need to fetch that from the global registry, or just pass `null` for now.
                    console.log(`Plugin ${manifest.id} backend loaded`);
                }
            }
        } catch (e) {
            console.error(`Error executing main script for plugin ${manifest.id}:`, e);
        }
    }
}
