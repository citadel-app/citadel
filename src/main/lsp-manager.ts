
import { ipcMain } from 'electron';

export class LspManager {
    constructor() {
        this.setupHandlers();
    }

    private setupHandlers() {
        ipcMain.handle('lsp:start', async (_, language: string) => {
            console.log(`[LSP] Starting server for ${language}...`);
            // TODO: Spawn language server process (e.g., pylsp, gopls, tsserver)
            return { status: 'started', pid: 1234 };
        });

        ipcMain.handle('lsp:stop', async (_, language: string) => {
            console.log(`[LSP] Stopping server for ${language}...`);
            return { status: 'stopped' };
        });

        ipcMain.handle('lsp:send', async (_: any) => {
            // console.log(`[LSP] Sending message:`, payload);
            // TODO: Write to stdin of the LSP process
            return { response: 'mock-response' };
        });
    }
}
