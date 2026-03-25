import { IModule } from '@citadel-app/core';
import * as CitadelCore from '@citadel-app/core';
import { __hostApi } from './api-vault';
// The Backend exposes PluginManager IPCs under @citadel-app/base
// e.g. plugins.list -> { id, version, main, renderer, enabled }
// We read renderer script via fs.readFile

export async function loadRuntimePlugins(): Promise<IModule[]> {
    const plugins: IModule[] = [];

    try {
        const manifests: any[] = await __hostApi.module.invoke('@citadel-app/base', 'plugins.list');
        const activePlugins = manifests.filter(p => p.enabled && p.renderer);

        for (const meta of activePlugins) {
            console.log(`[PluginLoader] Loading UI for plugin ${meta.id}...`);

            const scriptCode = await __hostApi.module.invoke('@citadel-app/base', 'plugins.readRenderer', meta.id);

            if (!scriptCode) {
                console.error(`[PluginLoader] Failed to read renderer script for ${meta.id}`);
                continue;
            }

            // We evaluate the script expecting it to assign its exports to a namespace
            // To do this reliably, we can create a local environment 
            const exports: any = {};
            const module: any = { exports };
            
            try {
                // By providing module, exports, and require to the evaluated function, 
                // plugins bundled as CJS or UMD will safely drop their payload here.
                const loader = new Function('module', 'exports', 'require', 'window', scriptCode);
                
                const sandboxRequire = (moduleId: string) => {
                    if (moduleId === 'react') return (window as any).React;
                    if (moduleId === 'react/jsx-runtime') return (window as any).ReactJSXRuntime;
                    if (moduleId === 'react-dom') return (window as any).ReactDOM;
                    if (moduleId === '@citadel-app/core') return CitadelCore;
                    if (moduleId === '@citadel-app/sdk') return (window as any).CitadelSDK;
                    if (moduleId === '@citadel-app/ui') return (window as any).CitadelUI;
                    if (moduleId === 'react-router-dom') return (window as any).ReactRouterDOM;
                    if (moduleId === 'react-resizable-panels') return (window as any).ReactResizablePanels;
                    if (moduleId === 'react-window') return (window as any).ReactWindow;
                    throw new Error(`[PluginLoader] Plugin ${meta.id} attempted to require unknown external: ${moduleId}`);
                };

                loader(module, exports, sandboxRequire, window);

                // Determine the plugin entry object
                let pluginObj = module.exports.default || module.exports || exports.default || exports;

                // Fallback: If the root export isn't an IModule, scan deeply for an exported IModule
                if (!pluginObj || !pluginObj.id || !pluginObj.version) {
                    const candidateKeys = Object.keys(pluginObj || {});
                    for (const key of candidateKeys) {
                        const candidate = pluginObj[key];
                        if (candidate && typeof candidate === 'object' && candidate.id && candidate.version) {
                            pluginObj = candidate;
                            break;
                        }
                    }
                }

                if (pluginObj && pluginObj.id && pluginObj.version) {
                    plugins.push(pluginObj as IModule);
                    console.log(`[PluginLoader] Successfully initialized UI for ${meta.id}`);
                } else {
                    console.error(`[PluginLoader] Plugin ${meta.id} did not export a valid IModule`, pluginObj);
                }

            } catch (evalErr) {
                console.error(`[PluginLoader] Execution error evaluating plugin ${meta.id}:`, evalErr);
            }
        }
    } catch (e) {
        console.error(`[PluginLoader] Failed to fetch active plugins list:`, e);
    }

    return plugins;
}
