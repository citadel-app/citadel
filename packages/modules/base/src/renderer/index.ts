import type { IModule } from '@citadel-app/core';
import { lazy } from 'react';
import { BaseAppHost } from './BaseAppHost';

export const BaseModule: IModule = {
    id: '@citadel-app/base',
    version: '1.0.6',
    globalComponents: [
        { region: 'app-host', component: BaseAppHost }
    ],
    contentModules: {
        webview: {
            id: 'webview',
            label: 'Web Browser',
            description: 'Embedded web browser for viewing URLs.',
            requirements: [
                { key: 'url', types: ['url'], label: 'Website URL', description: 'The URL to load' }
            ]
        },
        sections: {
            id: 'sections',
            label: 'Notes & Sections',
            description: 'Structured markdown notes.',
            requirements: []
        }
    },
    ipcs: [
        'fs.readDirectory', 'fs.readFile', 'fs.readFileBinary', 'fs.writeFile', 'fs.writeAsset', 'fs.createDirectory',
        'fs.scaffoldWorkspace', 'fs.deleteFile', 'fs.exists', 'fs.stat', 'fs.getDocumentsPath', 'fs.watchPath',
        'fs.rename', 'fs.allowPath',
        'db.getFeedItems', 'db.saveFeedItems', 'db.getFeedStatus', 'db.updateFeedStatus', 'db.initWorkspace',
        'db.getAiIndexStatus', 'db.updateAiIndexStatus', 'db.deleteAiIndexStatus',
        'net.fetch',
        'dialog.openDirectory', 'dialog.openFile',
        'git.status', 'git.init', 'git.add', 'git.commit', 'git.push', 'git.pull', 'git.history', 'git.checkIsRepo',
        'git.getBranches', 'git.checkout', 'git.clone', 'git.discard', 'git.createBranch', 'git.deleteBranch',
        'git.addRemote', 'git.setConfig', 'git.removeRemote', 'git.unstage', 'git.discardBulk', 'git.getRemotes', 'git.show',
        'github.createRepository', 'github.startDeviceFlow', 'github.pollDeviceToken', 'github.getUser',
        'github.listRepos', 'github.forkRepository',
        'secrets.get', 'secrets.set', 'secrets.delete',
        'appSettings.getSettings', 'appSettings.updateSetting', 'appSettings.updateSettings',
        'ai.isAvailable', 'ai.chat', 'ai.chatStream', 'ai.analyzeIntent', 'ai.indexEntry', 'ai.search', 'ai.getContext',
        'ai.getStructuralContext', 'ai.needsIndexing', 'ai.deleteEntryIndex', 'ai.getHardwareSpecs', 'ai.scoreModel',
        'ai.pullModel', 'ai.getModels', 'ai.abortChat', 'ai.generateMetadata', 'ai.generateSummary', 'ai.proofread',
        'ai.generateSection',
        'system.getProcessStats', 'system.startService', 'system.stopService', 'system.deployStack', 'system.triggerDebugError',
        'models.checkStatus', 'models.download',
        'service.start', 'service.stop', 'service.status',
        'plugins.install', 'plugins.uninstall', 'plugins.setEnabled', 'plugins.list', 'plugins.toggle', 'plugins.readRenderer'
    ],
    contentViewers: {
        webview: lazy(() => import('./components/modules/WebviewModule').then(m => ({ default: m.WebviewModule }))),
        sections: lazy(() => import('./components/sections/SectionsPanel').then(m => ({ default: m.SectionsPanel })))
    }
};
