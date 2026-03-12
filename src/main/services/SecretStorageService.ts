import { app, ipcMain, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared';

export class SecretStorageService {
    private secretsPath: string;
    private secrets: Record<string, string> = {};

    constructor() {
        this.secretsPath = path.join(app.getPath('userData'), 'secrets.bin');
        this.loadSecrets();
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle(IPC_CHANNELS.SECRETS_GET, (_, key: string) => this.getSecret(key));
        ipcMain.handle(IPC_CHANNELS.SECRETS_SET, (_, key: string, value: string) => this.setSecret(key, value));
        ipcMain.handle(IPC_CHANNELS.SECRETS_DELETE, (_, key: string) => this.deleteSecret(key));
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
