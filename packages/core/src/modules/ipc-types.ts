// Master registry of all Module IPC Endpoints
// Enables strict typing for `module.invoke` across the entire application interface.

export interface BaseModuleAPI {
    // FS Operations
    'fs.readDirectory': (path: string) => Promise<string[]>;
    'fs.readFile': (path: string) => Promise<string | null>;
    'fs.readFileBinary': (path: string) => Promise<Uint8Array | Buffer>;
    'fs.writeFile': (path: string, content: string) => Promise<void>;
    'fs.writeAsset': (path: string, content: Uint8Array | Buffer) => Promise<boolean>;
    'fs.createDirectory': (path: string) => Promise<void>;
    'fs.scaffoldWorkspace': (targetPath: string, workspaceName: string, cloneUrl: string) => Promise<void>;
    'fs.deleteFile': (path: string) => Promise<void>;
    'fs.exists': (path: string) => Promise<boolean>;
    'fs.stat': (path: string) => Promise<any>;
    'fs.getDocumentsPath': () => Promise<string>;
    'fs.watchPath': (path: string | null) => Promise<void>;
    'fs.rename': (oldPath: string, newPath: string) => Promise<void>;
    'fs.allowPath': (path: string) => Promise<void>;

    // Network
    'net.fetch': (url: string, options?: any) => Promise<any>;

    // Dialog Native
    'dialog.openDirectory': () => Promise<string | null>;
    'dialog.openFile': () => Promise<string | null>;

    // Git Operations
    'git.status': (repoPath: string) => Promise<any>;
    'git.init': (repoPath: string) => Promise<void>;
    'git.add': (repoPath: string, files: string[]) => Promise<void>;
    'git.commit': (repoPath: string, message: string) => Promise<void>;
    'git.push': (repoPath: string, remote?: string, branch?: string) => Promise<void>;
    'git.pull': (repoPath: string, remote?: string, branch?: string) => Promise<void>;
    'git.history': (repoPath: string) => Promise<any>;
    'git.checkIsRepo': (repoPath: string) => Promise<boolean>;
    'git.getBranches': (repoPath: string) => Promise<any>;
    'git.checkout': (repoPath: string, branch: string) => Promise<void>;
    'git.clone': (url: string, targetPath: string) => Promise<void>;
    'git.discard': (repoPath: string, filePath: string) => Promise<void>;
    'git.createBranch': (repoPath: string, branchName: string) => Promise<void>;
    'git.deleteBranch': (repoPath: string, branchName: string) => Promise<void>;
    'git.addRemote': (repoPath: string, name: string, url: string) => Promise<void>;
    'git.setConfig': (repoPath: string, key: string, value: string) => Promise<void>;
    'git.removeRemote': (repoPath: string, name: string) => Promise<void>;
    'git.unstage': (repoPath: string, files: string[]) => Promise<void>;
    'git.discardBulk': (repoPath: string, files: string[]) => Promise<void>;
    'git.getRemotes': (repoPath: string) => Promise<any>;
    'git.show': (repoPath: string, args: string) => Promise<string>;

    // GitHub Integration
    'github.createRepository': (token: string, name: string, description: string, isPrivate: boolean) => Promise<any>;
    'github.startDeviceFlow': () => Promise<any>;
    'github.pollDeviceToken': (deviceCode: string) => Promise<any>;
    'github.getUser': (token: string) => Promise<any>;
    'github.listRepos': (token: string) => Promise<any>;
    'github.forkRepository': (token: string, owner: string, repo: string) => Promise<any>;

    // Secret Storage
    'secrets.get': (key: string) => Promise<string | null>;
    'secrets.set': (key: string, value: string) => Promise<void>;
    'secrets.delete': (key: string) => Promise<void>;

    // App Settings Global
    'appSettings.getSettings': () => Promise<any>;
    'appSettings.updateSetting': (key: string, value: any) => Promise<void>;
    'appSettings.updateSettings': (settings: any) => Promise<void>;

    // AI Orchestrator
    'ai.isAvailable': () => Promise<{ available: boolean, reason?: string, services?: any, ragAvailable?: boolean, ragReason?: string }>;
    'ai.chat': (messages: any[], options?: any) => Promise<any>;
    'ai.chatStream': (messages: any[], options?: any) => Promise<any>;
    'ai.analyzeIntent': (query: string, entryTypes?: any) => Promise<any>;
    'ai.indexEntry': (entry: any, config?: any) => Promise<any>;
    'ai.search': (query: string, limit?: number) => Promise<any>;
    'ai.getContext': (entryId: string, query: string, maxChunks?: number) => Promise<any>;
    'ai.getStructuralContext': (entryId: string, maxChunks?: number) => Promise<string>;
    'ai.needsIndexing': (entryId: string, reindexIntervalHours?: number) => Promise<boolean>;
    'ai.deleteEntryIndex': (entryId: string) => Promise<void>;
    'ai.getHardwareSpecs': () => Promise<any>;
    'ai.scoreModel': (model: any, specs: any) => Promise<any>;
    'ai.pullModel': (model: string) => Promise<any>;
    'ai.getModels': () => Promise<any[]>;
    'ai.abortChat': () => Promise<void>;

    'ai.generateMetadata': (input: any) => Promise<any>;
    'ai.generateSummary': (input: any) => Promise<any>;
    'ai.proofread': (input: any) => Promise<any>;
    'ai.generateSection': (input: any) => Promise<any>;

    // System
    'system.getProcessStats': (processNames: string[]) => Promise<any>;
    'system.startService': (name: string) => Promise<void>;
    'system.stopService': (name: string) => Promise<void>;
    'system.deployStack': (service?: string) => Promise<void>;
    'system.triggerDebugError': (severity: 'warning' | 'error') => Promise<void>;

    // DB Init
    'db.initWorkspace': (path: string) => Promise<void>;
    'db.getAiIndexStatus': (entryId: string) => Promise<any>;
    'db.updateAiIndexStatus': (status: any) => Promise<void>;
    'db.deleteAiIndexStatus': (entryId: string) => Promise<void>;

    // Models
    'models.checkStatus': () => Promise<any>;
    'models.download': () => Promise<any>;

    // Docker / Execution Services
    'service.start': (service: 'execution' | 'tts') => Promise<void>;
    'service.stop': (service: 'execution' | 'tts') => Promise<void>;
    'service.status': (service: 'execution' | 'tts') => Promise<any>;

    // Plugins
    'plugins.list': () => Promise<any[]>;
    'plugins.install': (pluginId: string, downloadUrl: string) => Promise<void>;
    'plugins.uninstall': (pluginId: string) => Promise<void>;
    'plugins.toggle': (pluginId: string, enabled: boolean) => Promise<void>;
    'plugins.readRenderer': (pluginId: string) => Promise<string | null>;
}

export interface RSSModuleAPI {
    'getFeedStatus': () => Promise<Record<string, any>>;
    'getFeedItems': (feedId: string, limit?: number) => Promise<any[]>;
    'saveFeedItems': (feedId: string, items: any[]) => Promise<void>;
    'updateFeedStatus': (itemId: string, status: any) => Promise<void>;
}

export interface CodeModuleAPI {
    'kernel.start': (language: string) => Promise<void>;
    'kernel.execute': (language: string, code: string) => Promise<any>;
    'kernel.stop': (language: string) => Promise<void>;
    'kernel.status': (language: string) => Promise<string>;
    'latex:check': () => Promise<boolean>;
    'latex:compile': (args: { files: Array<{name: string, content: string, isBinary?: boolean}> }) => Promise<any>;
}

export interface ModuleAPIRegistry {
    '@citadel-app/base': BaseModuleAPI;
    '@citadel-app/rss': RSSModuleAPI;
    '@citadel-app/code': CodeModuleAPI;
}
