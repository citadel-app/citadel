import { IModule, MainRegistrar, WorkspaceContext, APP_VERSION } from '@citadel-app/core';
import { AppSettingsService } from './services/AppSettingsService';
import { GuardrailService } from './services/GuardrailService';
import { coreDb } from './db';
import { GitService } from './services/GitService';
import { GitHubService } from './services/GitHubService';
import { GitHubAuthService } from './services/GitHubAuthService';
import { SecretStorageService } from './services/SecretStorageService';
import { AIOrchestrator } from './ai/AIOrchestrator';
import { FileWatcherService } from './services/FileWatcherService';
import { PluginManagerService } from './services/PluginManagerService';
import { FeedService } from './services/FeedService';
import { PluginUpdaterService } from './services/PluginUpdaterService';
import * as fs from 'fs-extra';

let appSettings: AppSettingsService;
let guardrail: GuardrailService;
let aiOrchestrator: AIOrchestrator;
let feedService: FeedService;
let pluginManager: PluginManagerService;

export const BaseMainModule: IModule = {
    id: '@citadel-app/base',
    version: APP_VERSION,
    ipcs: [
        "fs.readDirectory", "fs.readFile", "fs.readFileBinary", "fs.writeFile", "fs.writeAsset", "fs.createDirectory",
        "fs.scaffoldWorkspace", "fs.deleteFile", "fs.exists", "fs.stat", "fs.getDocumentsPath", "fs.watchPath",
        "fs.rename", "fs.allowPath",
        "db.getFeedItems", "db.saveFeedItems", "db.getFeedStatus", "db.updateFeedStatus", "db.initWorkspace",
        "db.getAiIndexStatus", "db.updateAiIndexStatus", "db.deleteAiIndexStatus",
        "net.fetch",
        "dialog.openDirectory", "dialog.openFile",
        "git.status", "git.init", "git.add", "git.commit", "git.push", "git.pull", "git.history", "git.checkIsRepo",
        "git.getBranches", "git.checkout", "git.clone", "git.discard", "git.createBranch", "git.deleteBranch",
        "git.addRemote", "git.setConfig", "git.removeRemote", "git.unstage", "git.discardBulk", "git.getRemotes", "git.show",
        "github.createRepository", "github.startDeviceFlow", "github.pollDeviceToken", "github.getUser",
        "github.listRepos", "github.forkRepository",
        "secrets.get", "secrets.set", "secrets.delete",
        "appSettings.getSettings", "appSettings.updateSetting", "appSettings.updateSettings",
        "ai.isAvailable", "ai.chat", "ai.chatStream", "ai.analyzeIntent", "ai.indexEntry", "ai.search", "ai.getContext",
        "ai.getStructuralContext", "ai.needsIndexing", "ai.deleteEntryIndex", "ai.getHardwareSpecs", "ai.scoreModel",
        "ai.pullModel", "ai.getModels", "ai.abortChat", "ai.generateMetadata", "ai.generateSummary", "ai.proofread",
        "ai.generateSection",
        "system.getProcessStats", "system.startService", "system.stopService", "system.deployStack", "system.triggerDebugError",
        "models.checkStatus", "models.download",
        "service.start", "service.stop", "service.status",
        "system.getRegisteredIpcs", "system.getActiveModules",
        "plugins.install", "plugins.uninstall", "plugins.setEnabled", "plugins.list", "plugins.toggle", "plugins.readRenderer", "plugins.getCitadelVersion", "plugins.validateCompatibility", "plugins.getPluginPath"

    ],
    onMainActivate: async (registrar: MainRegistrar<'@citadel-app/base'>, workspace: WorkspaceContext | null) => {
        // --- Register Handlers Early for Robustness ---
        // This ensures IPC handlers are available even if service initialization takes time or fails.

        // --- File System Handlers ---
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
            guardrail.validate(path);
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

        registrar.handle('system.getRegisteredIpcs', async () => {
            const { mainModuleRegistry } = require('../../../main/main-module-registry');
            return mainModuleRegistry.getRegisteredHandlers();
        });

        registrar.handle('system.getActiveModules', async () => {
            const { mainModuleRegistry } = require('../../../main/main-module-registry');
            return mainModuleRegistry.getModules();
        });


        // --- Service Initialization ---
        if (!appSettings) {
            appSettings = new AppSettingsService(registrar);
            guardrail = new GuardrailService(workspace?.path || null);
            aiOrchestrator = new AIOrchestrator(appSettings, coreDb);
            feedService = new FeedService(registrar);

            new FileWatcherService(registrar);
            pluginManager = new PluginManagerService(registrar);
            new PluginUpdaterService(pluginManager, appSettings);

            new GitService(guardrail, registrar);
            new GitHubService(registrar);
            new GitHubAuthService(registrar);
            new SecretStorageService(registrar);

            aiOrchestrator.registerHandlers(registrar);
            coreDb.registerIpcHandlers(registrar);
        }

        if (workspace) {
            guardrail.setActiveWorkspace(workspace.path);
            coreDb.setGuardrail();
            try {
                coreDb.init(workspace.path);
            } catch (err) {
                console.error('[BaseModule] Failed to initialize database:', err);
            }
            feedService.setActiveWorkspace(workspace.path);
        } else {
            coreDb.init('');
            feedService.setActiveWorkspace('');
        }
    },
    onWorkspaceChanged: async (workspace: WorkspaceContext) => {
        if (workspace) {
            guardrail.setActiveWorkspace(workspace.path);
            coreDb.setGuardrail();
            coreDb.init(workspace.path);
            feedService.setActiveWorkspace(workspace.path);
        } else {
            coreDb.init('');
            feedService.setActiveWorkspace('');
        }
    }
};
