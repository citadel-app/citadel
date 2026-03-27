import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import { IPC_CHANNELS } from '@citadel-app/core';

export class AutoUpdaterManager {
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        this.setupIpcHandlers();

        if (!app.isPackaged) {
            console.log('[Updater] Auto-updater is disabled in development mode.');
            return;
        }

        // Disable auto-download so we can show a UI prompt
        autoUpdater.autoDownload = false;

        this.setupEventListeners();
    }

    public setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    private setupEventListeners() {
        autoUpdater.on('checking-for-update', () => {
            console.log('[Updater] Checking for update...');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('[Updater] Update available:', info.version);
            this.mainWindow?.webContents.send(IPC_CHANNELS.APP_ON_UPDATE_AVAILABLE, info);
        });

        autoUpdater.on('update-not-available', (info) => {
            console.log('[Updater] Update not available.');
            this.mainWindow?.webContents.send(IPC_CHANNELS.APP_ON_UPDATE_NOT_AVAILABLE, info);
        });

        autoUpdater.on('error', (err) => {
            console.error('[Updater] Error in auto-updater:', err);
            this.mainWindow?.webContents.send(IPC_CHANNELS.APP_ON_UPDATE_ERROR, err.message);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            let log_message = "Download speed: " + progressObj.bytesPerSecond;
            log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
            log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
            console.log('[Updater]', log_message);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('[Updater] Update downloaded');
            this.mainWindow?.webContents.send(IPC_CHANNELS.APP_ON_UPDATE_DOWNLOADED, info);
        });
    }

    private setupIpcHandlers() {
        ipcMain.handle(IPC_CHANNELS.APP_CHECK_FOR_UPDATES, async () => {
            if (!app.isPackaged) {
                return { success: false, error: "Auto-updates are disabled in development mode." };
            }

            console.log('[Updater/IPC] Checking for updates manually...');
            try {
                const result = await autoUpdater.checkForUpdates();
                return { success: true, updateInfo: result?.updateInfo };
            } catch (error: any) {
                console.error('[Updater/IPC] Failed to check for updates:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(IPC_CHANNELS.APP_DOWNLOAD_UPDATE, async () => {
            if (!app.isPackaged) {
                return { success: false, error: "Auto-updates are disabled in development mode." };
            }

            console.log('[Updater/IPC] Starting update download...');
            try {
                await autoUpdater.downloadUpdate();
                return { success: true };
            } catch (error: any) {
                console.error('[Updater/IPC] Failed to start download:', error);
                return { success: false, error: error.message };
            }
        });

        // Add handler for quit and install
        ipcMain.on(IPC_CHANNELS.APP_QUIT_AND_INSTALL, () => {
            if (!app.isPackaged) return;
            autoUpdater.quitAndInstall();
        });
    }

    public async checkForUpdatesSilently() {
        if (!app.isPackaged) return;

        try {
            await autoUpdater.checkForUpdates();
        } catch (err) {
            console.error('[Updater] Silent update check failed:', err);
        }
    }
}

export const autoUpdaterManager = new AutoUpdaterManager();
