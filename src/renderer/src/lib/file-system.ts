// Wrapper for the exposed Electron FS API

import { APP_CONSTANTS } from '@shared';

export const fs = {
    readDirectory: async (path: string): Promise<string[]> => {
        return window.api.fs.readDirectory(path);
    },
    readFile: async (path: string): Promise<string> => {
        return window.api.fs.readFile(path);
    },
    readFileBinary: async (path: string): Promise<any> => {
        return window.api.fs.readFileBinary(path);
    },
    writeFile: async (path: string, content: string): Promise<void> => {
        return window.api.fs.writeFile(path, content);
    },
    writeAsset: async (path: string, content: Uint8Array): Promise<void> => {
        return window.api.fs.writeAsset(path, content);
    },
    createDirectory: async (path: string): Promise<void> => {
        return window.api.fs.createDirectory(path);
    },
    exists: async (path: string): Promise<boolean> => {
        return window.api.fs.exists(path);
    },
    stat: async (path: string): Promise<{ mtimeMs: number }> => {
        return window.api.fs.stat(path);
    },
    getDocumentsPath: async (): Promise<string> => {
        return window.api.fs.getDocumentsPath();
    },
    deleteFile: async (path: string): Promise<void> => {
        return window.api.fs.deleteFile(path);
    },
    rename: async (oldPath: string, newPath: string): Promise<void> => {
        return window.api.fs.rename(oldPath, newPath);
    },
    
    // Derived helpers
    // Derived helpers
    ensureVaultStructure: async (root: string, folders: string[]): Promise<void> => {
        if (!(await window.api.fs.exists(root))) {
             await window.api.fs.createDirectory(root);
        }
        
        // Create config directory
        const configDir = `${root}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`;
        if (!(await window.api.fs.exists(configDir))) {
            await window.api.fs.createDirectory(configDir);
        }

        // Create subfolders from config
        for (const folder of folders) {
             const path = `${root}/${folder}`;
             if (!(await window.api.fs.exists(path))) {
                 await window.api.fs.createDirectory(path);
             }
        }
    },

    ensureCodexRoot: async (): Promise<string> => {
        const docs = await window.api.fs.getDocumentsPath();
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
    if (!(await window.api.fs.exists(root))) {
        await window.api.fs.createDirectory(root);
    }
    
    // Config dir
    const configDir = `${root}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`;
    if (!(await window.api.fs.exists(configDir))) {
        await window.api.fs.createDirectory(configDir);
    }

    // Folders
    for (const folder of folders) {
        const path = `${root}/${folder}`;
        if (!(await window.api.fs.exists(path))) {
            await window.api.fs.createDirectory(path);
        }
    }
};

// Re-assign to object to ensure it uses the internal helper
fs.ensureVaultStructure = _ensureVaultStructure;
fs.ensureCodexRoot = async () => {
    const docs = await window.api.fs.getDocumentsPath();
    const root = `${docs}/Codex`;
    // We can't easily access the dynamic folders here without config
    // So we just ensure root exists. The DataManager calls ensureVaultStructure with folders later.
    if (!(await window.api.fs.exists(root))) {
        await window.api.fs.createDirectory(root);
    }
    return root;
    return root;
};
