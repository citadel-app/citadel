import { MainRegistrar } from '@citadel-app/core';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface PluginManifest {
    id: string;
    version: string;
    name: string;
    description: string;
    author: string;
    authorUrl?: string;
    verified?: boolean;
    main?: string;       // Path to node process entry
    renderer?: string;   // Path to renderer process entry
    enabled: boolean;
    icon?: string;       // Path to local svg asset representing the plugin
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
            try {
                const res = await fetch(downloadUrl);
                if (!res.ok) throw new Error(`Failed to download plugin zip: ${res.statusText}`);

                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                const tempZipPath = path.join(app.getPath('temp'), `${pluginId}-${Date.now()}.zip`);
                await fs.writeFile(tempZipPath, buffer);
                
                const extract = require('extract-zip');
                const targetPath = path.join(this.pluginsDir, pluginId.replace(/[^a-zA-Z0-9_-]/g, ''));
                
                if (fs.existsSync(targetPath)) {
                    await fs.remove(targetPath);
                }
                await fs.mkdirp(targetPath);
                
                try {
                    await extract(tempZipPath, { dir: targetPath });
                } finally {
                    await fs.remove(tempZipPath);
                }
                
                await this.loadPlugins();
                return;
            } catch (e) {
                console.error("Plugin installation error:", e);
                throw e;
            }
        });

        this.registrar.handle('plugins.uninstall', async (pluginId: string) => {
            const plugin = this.plugins.get(pluginId) as PluginManifest & { _folder?: string };
            const folder = plugin?._folder || pluginId.replace(/[^a-zA-Z0-9_-]/g, '');
            const pluginPath = path.join(this.pluginsDir, folder);
            
            if (fs.existsSync(pluginPath)) {
                await fs.remove(pluginPath);
                this.plugins.delete(pluginId);
            }
        });

        this.registrar.handle('plugins.toggle', async (pluginId: string, enabled: boolean) => {
            const plugin = this.plugins.get(pluginId) as PluginManifest & { _folder?: string };
            if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
            
            plugin.enabled = enabled;
            const folder = plugin._folder || pluginId.replace(/[^a-zA-Z0-9_-]/g, '');
            const manifestPath = path.join(this.pluginsDir, folder, 'manifest.json');
            const packagePath = path.join(this.pluginsDir, folder, 'package.json');
            
            if (fs.existsSync(manifestPath)) {
                const manifest = await fs.readJSON(manifestPath);
                manifest.enabled = enabled;
                await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
            } else if (fs.existsSync(packagePath)) {
                const pkg = await fs.readJSON(packagePath);
                pkg.citadel = pkg.citadel || {};
                pkg.citadel.enabled = enabled;
                await fs.writeJSON(packagePath, pkg, { spaces: 2 });
            }
        });

        this.registrar.handle('plugins.readRenderer', async (pluginId: string) => {
            const plugin = this.plugins.get(pluginId) as PluginManifest & { _folder?: string };
            if (!plugin || !plugin.renderer) return null;
            
            const folder = plugin._folder || pluginId.replace(/[^a-zA-Z0-9_-]/g, '');
            const scriptPath = path.join(this.pluginsDir, folder, plugin.renderer);
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
                const packagePath = path.join(pluginPath, 'package.json');
                
                try {
                    let manifest: any = null;
                    if (await fs.pathExists(manifestPath)) {
                        manifest = await fs.readJSON(manifestPath);
                    } else if (await fs.pathExists(packagePath)) {
                        const pkg = await fs.readJSON(packagePath);
                        if (pkg.citadel) {
                            manifest = {
                                id: pkg.citadel.id || pkg.name,
                                version: pkg.citadel.version || pkg.version,
                                name: pkg.citadel.title || pkg.citadel.name || pkg.name,
                                description: pkg.citadel.description || pkg.description,
                                author: pkg.citadel.author || (typeof pkg.author === 'object' ? pkg.author.name : pkg.author),
                                authorUrl: pkg.citadel.authorUrl || (typeof pkg.author === 'object' ? pkg.author.url : undefined),
                                verified: pkg.citadel.verified === true,
                                main: pkg.citadel.main,
                                renderer: pkg.citadel.renderer,
                                enabled: pkg.citadel.enabled !== false,
                                icon: pkg.citadel.icon,
                                permissions: pkg.citadel.permissions
                            };
                        }
                    }

                    if (manifest) {
                        const pluginEntry: PluginManifest & { _folder?: string, _absolutePath?: string } = manifest;
                        pluginEntry._folder = entry.name;
                        pluginEntry._absolutePath = pluginPath;
                        this.plugins.set(pluginEntry.id, pluginEntry);
                        
                        // Load backend script if enabled
                        if (pluginEntry.enabled && pluginEntry.main) {
                            this.executePluginMain(pluginEntry, pluginPath);
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
                // Dynamically load the plugin script but inject the host application's node_modules 
                // into its resolution paths so it can seamlessly resolve externalized native dependencies (like better-sqlite3).
                const Module = require('module');
                const pluginModule = new Module(mainScriptPath, module);
                pluginModule.filename = mainScriptPath;
                pluginModule.paths = [
                    path.join(app.getAppPath(), 'node_modules'),
                    path.join(app.getAppPath(), '..', 'node_modules'),
                    ...Module._nodeModulePaths(path.dirname(mainScriptPath))
                ];
                pluginModule.load(mainScriptPath);
                
                const pluginExports = pluginModule.exports;
                
                if (pluginExports && typeof pluginExports.activateMain === 'function') {
                    // Spawn a strict sandbox proxy matching the dynamic manifest capability graph
                    console.log(`Plugin ${manifest.id} backend loaded. Assigning sandbox...`);
                    try {
                         const childRegistrar = (this.registrar as any).createChildRegistrar!(manifest as any);
                         // TODO: Pass actual workspace contexts through the global orchestrator if necessary
                         pluginExports.activateMain(childRegistrar, null);
                    } catch (sandboxErr) {
                         console.error(`[PluginManager] Registry Sandbox Security Error enforcing "${manifest.id}":`, sandboxErr);
                    }
                }
            }
        } catch (e) {
            console.error(`Error executing main script for plugin ${manifest.id}:`, e);
        }
    }
}
