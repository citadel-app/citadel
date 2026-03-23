import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { MainRegistrar } from '@citadel-app/core';

export class SecretStorageService {
    private secretsPath: string;
    private secrets: Record<string, string> = {};

    constructor(private registrar: MainRegistrar<'@citadel-app/base'>) {
        this.secretsPath = path.join(app.getPath('userData'), 'secrets.bin');
        this.loadSecrets();
        this.registerHandlers();
    }

    private registerHandlers() {
        this.registrar.handle('secrets.get', async (key: string): Promise<string | null> => this.getSecret(key));
        this.registrar.handle('secrets.set', async (key: string, value: string): Promise<void> => this.setSecret(key, value));
        this.registrar.handle('secrets.delete', async (key: string): Promise<void> => this.deleteSecret(key));
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
