// Wrapper for the exposed Electron FS API

import { APP_CONSTANTS } from '@citadel-app/core';
import { hostApi as __hostApi } from '../host-services';

export const fs = {
    readDirectory: async (path: string): Promise<string[]> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.readDirectory', path);
    },
    readFile: async (path: string): Promise<string> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.readFile', path);
    },
    readFileBinary: async (path: string): Promise<any> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.readFileBinary', path);
    },
    writeFile: async (path: string, content: string): Promise<void> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.writeFile', path, content);
    },
    writeAsset: async (path: string, content: Uint8Array): Promise<void> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.writeAsset', path, content);
    },
    createDirectory: async (path: string): Promise<void> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', path);
    },
    exists: async (path: string): Promise<boolean> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.exists', path);
    },
    stat: async (path: string): Promise<{ mtimeMs: number }> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.stat', path);
    },
    getDocumentsPath: async (): Promise<string> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.getDocumentsPath');
    },
    deleteFile: async (path: string): Promise<void> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.deleteFile', path);
    },
    rename: async (oldPath: string, newPath: string): Promise<void> => {
        return __hostApi.module.invoke('@citadel-app/base', 'fs.rename', oldPath, newPath);
    },
    
    // Derived helpers
    // Derived helpers
    ensureVaultStructure: async (root: string, folders: string[]): Promise<void> => {
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', root))) {
             await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', root);
        }
        
        // Create config directory
        const configDir = `${root}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`;
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', configDir))) {
            await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', configDir);
        }

        // Create subfolders from config
        for (const folder of folders) {
             const path = `${root}/${folder}`;
             if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', path))) {
                 await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', path);
             }
        }
    },

    ensureCodexRoot: async (): Promise<string> => {
        const docs = await __hostApi.module.invoke('@citadel-app/base', 'fs.getDocumentsPath');
        const root = `${docs}/Codex`;
        // Use the new helper but we need to access it via internal function or just duplicate logic?
        // Since 'fs' is an object here, we can't easily call sibling methods if not defined yet.
        // Actually we can just define the function outside or use 'this' if properly bound.
        // Safer to just define the logic inside ensureVaultStructure and call it via the exposed object if possible, 
        // OR just duplicate the simple call or define a standalone function.
        
        // Let's define the implementation outside the object to be safe and clean.
        return root; 
    }
};

// Internal helper to avoid 'this' context issues in the object literal
const _ensureVaultStructure = async (root: string, folders: string[]) => {
    if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', root))) {
        await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', root);
    }
    
    // Config dir
    const configDir = `${root}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`;
    if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', configDir))) {
        await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', configDir);
    }

    // Folders
    for (const folder of folders) {
        const path = `${root}/${folder}`;
        if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', path))) {
            await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', path);
        }
    }
};

// Re-assign to object to ensure it uses the internal helper
fs.ensureVaultStructure = _ensureVaultStructure;
fs.ensureCodexRoot = async () => {
    const docs = await __hostApi.module.invoke('@citadel-app/base', 'fs.getDocumentsPath');
    const root = `${docs}/Codex`;
    // We can't easily access the dynamic folders here without config
    // So we just ensure root exists. The DataManager calls ensureVaultStructure with folders later.
    if (!(await __hostApi.module.invoke('@citadel-app/base', 'fs.exists', root))) {
        await __hostApi.module.invoke('@citadel-app/base', 'fs.createDirectory', root);
    }
    return root;
    return root;
};
