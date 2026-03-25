/**
 * CoreServices Factory — builds StorageProvider and FeedDb backed by a given API.
 * 
 * This enables per-module CoreServices where IPC calls go through
 * the module's ScopedAPI (permission-checked) instead of raw __hostApi.
 */
import type { StorageProvider, FeedDB } from '@citadel-app/core';

/**
 * Minimal API surface that CoreServices needs.
 * Both __hostApi and ScopedAPI satisfy this when the right permissions are declared.
 */
export interface CoreServicesAPI {
    module: {
        invoke: (moduleId: string, method: string, ...args: any[]) => Promise<any>;
    };
    app: {
        updateSetting?: (key: string, value: any) => Promise<void>;
    };
}

/**
 * Builds a StorageProvider backed by the given API.
 * IPC calls (fs.readFile, fs.writeFile, etc.) are routed through `api`,
 * which may be permission-gated for modules.
 */
export function buildStorage(api: CoreServicesAPI, vaultPath: string | null): StorageProvider {
    const resolve = (relativePath: string) => {
        if (!vaultPath) throw new Error('No workspace open');
        return `${vaultPath}/${relativePath}`;
    };

    return {
        readJSON: async <T = unknown>(relativePath: string): Promise<T | null> => {
            const path = resolve(relativePath);
            if (!(await api.module.invoke('@citadel-app/base', 'fs.exists', path))) return null;
            try {
                const content = await api.module.invoke('@citadel-app/base', 'fs.readFile', path);
                return JSON.parse(content) as T;
            } catch { return null; }
        },
        writeJSON: async <T = unknown>(relativePath: string, data: T): Promise<void> => {
            const path = resolve(relativePath);
            const dir = path.substring(0, path.lastIndexOf('/'));
            if (!(await api.module.invoke('@citadel-app/base', 'fs.exists', dir))) {
                await api.module.invoke('@citadel-app/base', 'fs.createDirectory', dir);
            }
            await api.module.invoke('@citadel-app/base', 'fs.writeFile', path, JSON.stringify(data, null, 2));
        },
        readFile: async (relativePath: string): Promise<string | null> => {
            const path = resolve(relativePath);
            if (!(await api.module.invoke('@citadel-app/base', 'fs.exists', path))) return null;
            try { return await api.module.invoke('@citadel-app/base', 'fs.readFile', path); }
            catch { return null; }
        },
        writeFile: async (relativePath: string, content: string): Promise<void> => {
            const path = resolve(relativePath);
            const dir = path.substring(0, path.lastIndexOf('/'));
            if (!(await api.module.invoke('@citadel-app/base', 'fs.exists', dir))) {
                await api.module.invoke('@citadel-app/base', 'fs.createDirectory', dir);
            }
            await api.module.invoke('@citadel-app/base', 'fs.writeFile', path, content);
        },
        exists: async (relativePath: string): Promise<boolean> => {
            return api.module.invoke('@citadel-app/base', 'fs.exists', resolve(relativePath));
        },
        subscribe: () => {
            // subscribe is not IPC-gated — it's handled by the host's dataManager
            // Modules that need subscribe should use it through the host-provided context
            return () => {};
        },
    };
}

/**
 * Builds a FeedDB backed by the given API.
 * All calls go through module:invoke, which is permission-checked.
 */
export function buildFeedDb(api: CoreServicesAPI): FeedDB {
    return {
        getFeedStatus: () => api.module.invoke('@citadel-app/base', 'db.getFeedStatus'),
        getFeedItems: (feedId: string, limit?: number) => api.module.invoke('@citadel-app/base', 'db.getFeedItems', feedId, limit),
        saveFeedItems: (feedId: string, items: any[]) => api.module.invoke('@citadel-app/base', 'db.saveFeedItems', feedId, items),
        updateFeedStatus: (itemId: string, status: any) => api.module.invoke('@citadel-app/base', 'db.updateFeedStatus', itemId, status),
    };
}
