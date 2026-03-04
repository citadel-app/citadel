import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class AppSettingsService {
    private settingsPath: string;
    private settings: Record<string, any> = {};

    constructor() {
        this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
        this.loadSettings();
        this.registerIpcHandlers();
    }

    private registerIpcHandlers() {
        console.log('[AppSettingsService] Registering IPC handlers');
        ipcMain.handle('app:get-settings', () => this.getSettings());
        ipcMain.handle('app:update-setting', (_, key, value) => this.updateSetting(key, value));
        ipcMain.handle('app:update-settings', (_, settings) => this.updateSettings(settings));
    }

    private loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const content = fs.readFileSync(this.settingsPath, 'utf-8');
                try {
                    this.settings = JSON.parse(content);
                    
                    // Migration/Self-healing: Ensure peerId exists
                    if (!this.settings.peerId) {
                        console.log('[AppSettingsService] Missing peerId, generating new one...');
                        this.settings.peerId = crypto.randomUUID();
                        this.saveSettings();
                    }
                } catch (parseError) {
                    console.error('[AppSettingsService] Failed to parse settings, backing up and resetting:', parseError);
                    fs.writeFileSync(`${this.settingsPath}.corrupt.bak`, content);
                    this.settings = this.getDefaultSettings(); // Fallback to defaults
                    this.saveSettings();
                }
            } else {
                this.settings = this.getDefaultSettings();
                this.saveSettings();
            }
        } catch (e) {
            console.error('[AppSettingsService] Failed to load settings:', e);
            this.settings = this.getDefaultSettings(); // Fallback
        }
    }

    private getDefaultSettings() {
        return {
            theme: 'system',
            locale: 'en-US',
            autoSave: false,
            autoSaveInterval: 300000,
            autoCommitEnabled: false,
            autoCommitInterval: 300000,
            autoCommitMessage: "Auto-commit: {{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}",
            developerMode: false,
            defaultRemote: 'origin',
            defaultBranch: 'main',
            gitPollingEnabled: true,
            gitPollingInterval: 10000,
            ttsDataPath: null,
            qdrantDataPath: null,
            colorTheme: 'vscode',
            peerEnabled: false,
            peerId: crypto.randomUUID(),
            peerIceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };
    }

    private saveSettings() {
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
        } catch (e) {
            console.error('[AppSettingsService] Failed to save settings:', e);
        }
    }

    public getSettings() {
        return this.settings;
    }

    public getSetting(key: string) {
        return this.settings[key];
    }

    public updateSetting(key: string, value: any) {
        this.settings[key] = value;
        this.saveSettings();

        // Handle side effects
        // [User requested to disable automatic devtools opening]
        /*
        if (key === 'developerMode') {
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                if (value) {
                    win.webContents.openDevTools();
                } else {
                    win.webContents.closeDevTools();
                }
            });
        }
        */

        return this.settings;
    }
    
    public updateSettings(newSettings: Record<string, any>) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        return this.settings;
    }
}
