import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@citadel-app/core';
import type { IModule, MainRegistrar, WorkspaceContext, ModuleAPIRegistry } from '@citadel-app/core';
import { SidecarManager } from '@citadel-app/core';

/**
 * Main-process module registry.
 * Routes module:invoke IPC calls to module-registered handlers.
 */
class MainModuleRegistry {
    private handlers = new Map<string, Function>();
    private modules: IModule[] = [];
    public sidecars: SidecarManager = new SidecarManager();

    /**
     * Initialize the generic module:invoke IPC handler.
     * Call this once during app startup before loading modules.
     */
    init() {
        ipcMain.handle(IPC_CHANNELS.MODULE_INVOKE, async (_, moduleId: string, method: string, ...args: any[]) => {
            const key = `${moduleId}:${method}`;
            const handler = this.handlers.get(key);
            if (!handler) {
                throw new Error(`[MainModuleRegistry] No handler registered for "${key}"`);
            }
            return handler(...args);
        });
    }

    /**
     * Load and activate modules in the main process.
     * Calls onMainActivate for each module that implements it.
     */
    async loadModules(modules: IModule[], workspace: WorkspaceContext | null) {
        this.modules = [...this.modules, ...modules];

        for (const mod of modules) {
            try {
                if (mod.onMainActivate) {
                    const registrar = this.createRegistrar<any>(mod);
                    console.log(`[MainModuleRegistry] Activating module "${mod.id}" v${mod.version}`);
                    await mod.onMainActivate(registrar, workspace);
                }
            } catch (err) {
                console.error(`[MainModuleRegistry] Failed to activate module "${mod.id}":`, err);
            }
        }

        console.log(`[MainModuleRegistry] ${this.handlers.size} total handlers registered from ${this.modules.length} active modules`);
    }

    /**
     * Re-activate modules when workspace changes.
     * Calls onWorkspaceChanged for modules that support it.
     */
    async onWorkspaceChanged(workspace: WorkspaceContext) {
        for (const mod of this.modules) {
            if (mod.onWorkspaceChanged) {
                await mod.onWorkspaceChanged(workspace);
            }
        }
    }

    private createRegistrar<M extends keyof ModuleAPIRegistry>(mod: IModule): MainRegistrar<M> {
        return {
            handle: ((method: string, handler: any) => {
                const key = `${mod.id}:${method}`;

                if (!mod.ipcs || !mod.ipcs.includes(method)) {
                    const errorMsg = `[Security] Module "${mod.id}" attempted to register IPC "${method}", but it is not declared in its manifest.ipcs ownership list!`;
                    console.error(errorMsg);
                    throw new Error(errorMsg);
                }

                if (this.handlers.has(key)) {
                    console.warn(`[MainModuleRegistry] Overwriting handler "${key}"`);
                }
                console.log(`[MainModuleRegistry] [${mod.id}] Registered handler: ${method}`);
                this.handlers.set(key, handler);
            }) as any,
            createChildRegistrar: (manifest: IModule) => this.createRegistrar<any>(manifest),
            registerSidecar: (sidecar: any) => {
                this.sidecars.registerSidecar(sidecar);
            }
        } as MainRegistrar<M>;
    }
}

export const mainModuleRegistry = new MainModuleRegistry();
