import { app, ipcMain } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AppSettings, DEFAULT_APP_SETTINGS, IPC_CHANNELS } from '../../shared';

export class AppSettingsService extends EventEmitter {
    private settingsPath: string;
    private settings: AppSettings;

    constructor() {
        super();
        this.settings = DEFAULT_APP_SETTINGS;
        this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
        this.loadSettings();
        this.registerIpcHandlers();
    }

    private registerIpcHandlers() {
        console.log('[AppSettingsService] Registering IPC handlers');
        ipcMain.handle(IPC_CHANNELS.APP_GET_SETTINGS, () => this.getSettings());
        ipcMain.handle(IPC_CHANNELS.APP_UPDATE_SETTING, (_, key, value) => this.updateSetting(key, value));
        ipcMain.handle(IPC_CHANNELS.APP_UPDATE_SETTINGS, (_, settings) => this.updateSettings(settings));
    }

    private loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const content = fs.readFileSync(this.settingsPath, 'utf-8');
                try {
                    const loaded = JSON.parse(content);
                    this.settings = { ...DEFAULT_APP_SETTINGS, ...loaded };
                    
                    // Specific deep merge for 'ai' since it's a nested object
                    if (DEFAULT_APP_SETTINGS.ai && !this.settings.ai) {
                        this.settings.ai = DEFAULT_APP_SETTINGS.ai;
                    } else if (DEFAULT_APP_SETTINGS.ai && loaded.ai) {
                        this.settings.ai = { ...DEFAULT_APP_SETTINGS.ai, ...loaded.ai };
                        // Even deeper merge for provider-specific settings if needed
                        if (DEFAULT_APP_SETTINGS.ai.gemini && loaded.ai.gemini) {
                           this.settings.ai.gemini = { ...DEFAULT_APP_SETTINGS.ai.gemini, ...loaded.ai.gemini };
                        }
                        if (DEFAULT_APP_SETTINGS.ai.openai && loaded.ai.openai) {
                           this.settings.ai.openai = { ...DEFAULT_APP_SETTINGS.ai.openai, ...loaded.ai.openai };
                        }
                        if (DEFAULT_APP_SETTINGS.ai.ollama && loaded.ai.ollama) {
                           this.settings.ai.ollama = { ...DEFAULT_APP_SETTINGS.ai.ollama, ...loaded.ai.ollama };
                        }
                    }
                    
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

    private getDefaultSettings(): AppSettings {
        return {
            ...DEFAULT_APP_SETTINGS,
            peerId: crypto.randomUUID()
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
        this.emit('changed', this.settings);

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
    
    public updateSettings(newSettings: Partial<AppSettings>) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        this.emit('changed', this.settings);
        return this.settings;
    }
}
