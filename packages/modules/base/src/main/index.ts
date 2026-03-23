import { MainRegistrar, WorkspaceContext } from '@citadel-app/core';
import { AppSettingsService } from './services/AppSettingsService';
import { GuardrailService } from './services/GuardrailService';
import { coreDb } from './db';
import { GitService } from './services/GitService';
import { GitHubService } from './services/GitHubService';
import { GitHubAuthService } from './services/GitHubAuthService';
import { SecretStorageService } from './services/SecretStorageService';
import { AIOrchestrator } from './ai/AIOrchestrator';
import { FileWatcherService } from './services/FileWatcherService';
import { ModelDownloadService } from './services/ModelDownloadService';
import { BackendServiceManager } from './services/BackendServiceManager';
import { PluginManagerService } from './services/PluginManagerService';
import * as fs from 'fs-extra';

let appSettings: AppSettingsService;
let guardrail: GuardrailService;
let aiOrchestrator: AIOrchestrator;
let backendManager: BackendServiceManager;

export async function activateMain(registrar: MainRegistrar<'@citadel-app/base'>, workspace: WorkspaceContext | null) {
    if (!appSettings) {
        appSettings = new AppSettingsService(registrar);
        guardrail = new GuardrailService(workspace?.path || null);
        aiOrchestrator = new AIOrchestrator(appSettings, coreDb);
        backendManager = new BackendServiceManager(appSettings);
        new FileWatcherService(registrar);
        new PluginManagerService(registrar);

        new GitService(guardrail, registrar);
        new GitHubService(registrar);
        new GitHubAuthService(registrar);
        new SecretStorageService(registrar);
        new ModelDownloadService(registrar);

        aiOrchestrator.registerHandlers(registrar);
    }

    if (workspace) {
        guardrail.setActiveWorkspace(workspace.path);
        coreDb.setGuardrail();
        coreDb.init(workspace.path);
    } else {
        coreDb.init('');
    }

    registrar.handle('service.start', async (service: 'execution' | 'tts'): Promise<any> => {
        return backendManager.start(service);
    });

    registrar.handle('service.stop', async (service: 'execution' | 'tts'): Promise<any> => {
        return backendManager.stop(service);
    });

    registrar.handle('service.status', async (service: 'execution' | 'tts') => {
        return backendManager.getStatus(service);
    });

    // Move file system IPCs from main/index.ts to here
    registrar.handle('fs.readDirectory', async (path: string) => {
        guardrail.validate(path);
        return fs.readdir(path);
    });

    registrar.handle('fs.readFile', async (path: string) => {
        guardrail.validate(path);
        return fs.readFile(path, 'utf-8');
    });

    registrar.handle('fs.readFileBinary', async (path: string) => {
        guardrail.validate(path);
        return fs.readFile(path);
    });

    registrar.handle('fs.writeFile', async (path: string, content: string) => {
        guardrail.validate(path);
        return fs.outputFile(path, content);
    });

    registrar.handle('fs.writeAsset', async (path: string, content: any) => {
        guardrail.validate(path);
        await fs.outputFile(path, content);
        return true;
    });

    registrar.handle('fs.createDirectory', async (path: string) => {
        guardrail.validate(path);
        return fs.ensureDir(path);
    });

    registrar.handle('fs.deleteFile', async (path: string) => {
        guardrail.validate(path);
        return fs.remove(path);
    });

    registrar.handle('fs.exists', async (path: string) => {
        guardrail.validate(path); // validate doesn't check existence, just workspace boundary
        return fs.pathExists(path);
    });

    registrar.handle('fs.stat', async (path: string) => {
        guardrail.validate(path);
        return fs.stat(path);
    });

    registrar.handle('fs.rename', async (oldPath: string, newPath: string) => {
        guardrail.validate(oldPath);
        guardrail.validate(newPath);
        return fs.rename(oldPath, newPath);
    });

    registrar.handle('fs.allowPath', async (targetPath: string) => {
        guardrail.setActiveWorkspace(targetPath);
    });
}

export async function onWorkspaceChanged(workspace: WorkspaceContext) {
    if (workspace) {
        guardrail.setActiveWorkspace(workspace.path);
        coreDb.setGuardrail();
        coreDb.init(workspace.path);
    } else {
        coreDb.init('');
    }
}
