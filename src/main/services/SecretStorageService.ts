import { app, ipcMain, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class SecretStorageService {
    private secretsPath: string;
    private secrets: Record<string, string> = {};

    constructor() {
        this.secretsPath = path.join(app.getPath('userData'), 'secrets.bin');
        this.loadSecrets();
        this.registerIpcHandlers();
    }

    private registerIpcHandlers() {
        console.log('[SecretStorageService] Registering IPC handlers');
        ipcMain.handle('secrets:get', (_, key: string) => this.getSecret(key));
        ipcMain.handle('secrets:set', (_, key: string, value: string) => this.setSecret(key, value));
        ipcMain.handle('secrets:delete', (_, key: string) => this.deleteSecret(key));
    }

    private loadSecrets() {
        try {
            if (fs.existsSync(this.secretsPath)) {
                const encryptedBuffer = fs.readFileSync(this.secretsPath);
                if (safeStorage.isEncryptionAvailable()) {
                    const decryptedData = safeStorage.decryptString(encryptedBuffer);
                    this.secrets = JSON.parse(decryptedData);
                } else {
                    console.error('[SecretStorageService] Encryption not available');
                }
            }
        } catch (e) {
            console.error('[SecretStorageService] Failed to load secrets:', e);
        }
    }

    private saveSecrets() {
        try {
            if (safeStorage.isEncryptionAvailable()) {
                const encryptedBuffer = safeStorage.encryptString(JSON.stringify(this.secrets));
                fs.writeFileSync(this.secretsPath, encryptedBuffer);
            } else {
                console.error('[SecretStorageService] Encryption not available for saving');
            }
        } catch (e) {
            console.error('[SecretStorageService] Failed to save secrets:', e);
        }
    }

    public getSecret(key: string): string | null {
        return this.secrets[key] || null;
    }

    public setSecret(key: string, value: string) {
        this.secrets[key] = value;
        this.saveSecrets();
    }

    public deleteSecret(key: string) {
        delete this.secrets[key];
        this.saveSecrets();
    }
}
