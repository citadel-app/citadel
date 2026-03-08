
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared';

export class LspManager {
    constructor() {
        this.setupHandlers();
    }

    private setupHandlers() {
        ipcMain.handle(IPC_CHANNELS.LSP_START, async (_, language: string) => {
            console.log(`[LSP] Starting server for ${language}...`);
            // TODO: Spawn language server process (e.g., pylsp, gopls, tsserver)
            return { status: 'started', pid: 1234 };
        });

        ipcMain.handle(IPC_CHANNELS.LSP_STOP, async (_, language: string) => {
            console.log(`[LSP] Stopping server for ${language}...`);
            return { status: 'stopped' };
        });

        ipcMain.handle(IPC_CHANNELS.LSP_SEND, async (_: any) => {
            // console.log(`[LSP] Sending message:`, payload);
            // TODO: Write to stdin of the LSP process
            return { response: 'mock-response' };
        });
    }
}
