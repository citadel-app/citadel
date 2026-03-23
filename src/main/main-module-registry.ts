import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@citadel-app/core';
import type { IModule, MainRegistrar, WorkspaceContext, ModuleAPIRegistry } from '@citadel-app/core';

/**
 * Main-process module registry.
 * Routes module:invoke IPC calls to module-registered handlers.
 */
class MainModuleRegistry {
    private handlers = new Map<string, Function>();
    private modules: IModule[] = [];

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
        this.modules = modules;

        for (const mod of modules) {
            if (mod.onMainActivate) {
                const registrar = this.createRegistrar(mod.id as keyof ModuleAPIRegistry);
                console.log(`[MainModuleRegistry] Activating module "${mod.id}" v${mod.version}`);
                await mod.onMainActivate(registrar, workspace);
            }
        }

        console.log(`[MainModuleRegistry] ${this.handlers.size} handlers registered from ${modules.length} modules`);
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

    private createRegistrar<M extends keyof ModuleAPIRegistry>(moduleId: M): MainRegistrar<M> {
        return {
            handle: ((method: any, handler: any) => {
                const key = `${moduleId as string}:${method}`;
                if (this.handlers.has(key)) {
                    console.warn(`[MainModuleRegistry] Overwriting handler "${key}"`);
                }
                this.handlers.set(key, handler);
            }) as any
        };
    }
}

export const mainModuleRegistry = new MainModuleRegistry();
