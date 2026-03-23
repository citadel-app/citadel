// Module-owned data managers
export { createRSSDataManager, type RSSDataManager } from './lib/rss-data-manager';
export { createYouTubeDataManager, type YouTubeDataManager } from './lib/youtube-data-manager';

// Legacy exports (temporary, until everything is fully dynamic)
export * from './context/RSSContext';
export * from './context/YouTubeContext';
export * from './context/YouTubePlayerContext';
export * from './pages/RSSPage';
export * from './pages/YouTubePage';
export * from './components/youtube/FloatingYouTubePlayer';

import { IModule, RendererRegistrar, ScopedAPI } from '@citadel-app/core';
import React, { lazy } from 'react';
import { RSSProvider } from './context/RSSContext';
import { YouTubeProvider } from './context/YouTubeContext';
import { YouTubePlayerProvider } from './context/YouTubePlayerContext';
import { FloatingYouTubePlayer } from './components/youtube/FloatingYouTubePlayer';
import { RssModuleBindings } from './lib/module-bindings';

export const RssModule: IModule = {
    id: '@citadel-app/rss',
    version: '1.0.0',
    permissions: {
        ipc: [
            'fs.readFile',
            'fs.writeFile',
            'fs.exists',
            'fs.createDirectory',
            'app.updateSetting'
        ]
    },

    providers: [
        { entry: { id: 'rss-provider', scope: 'global', priority: 100 }, component: RSSProvider },
        { entry: { id: 'youtube-provider', scope: 'global', priority: 101 }, component: YouTubeProvider },
        { entry: { id: 'youtube-player', scope: 'global', priority: 102 }, component: YouTubePlayerProvider }
    ],

    globalComponents: [
        { region: 'global-overlay', component: FloatingYouTubePlayer }
    ],

    routes: [
        { path: '/rss', component: lazy(() => import('./pages/RSSPage').then(m => ({ default: m.RSSPage }))) },
        { path: '/youtube', component: lazy(() => import('./pages/YouTubePage').then(m => ({ default: m.YouTubePage }))) }
    ],

    navigationItems: [
        {
            id: 'nav-rss',
            label: 'RSS Feeds',
            path: '/rss',
            icon: 'Rss',
            activeClass: 'text-primary bg-primary/10',
            inactiveClass: 'text-orange-500 hover:bg-orange-500/10',
            priority: 10
        },
        {
            id: 'nav-youtube',
            label: 'YouTube Feed',
            path: '/youtube',
            icon: 'Youtube',
            activeClass: 'text-primary bg-primary/10',
            inactiveClass: 'text-red-500 hover:bg-red-500/10',
            priority: 20
        }
    ],

    linkSearchProviders: [
        {
            id: 'rss-search',
            label: 'RSS Feeds',
            search: async (query: string) => {
                if (!RssModuleBindings.search) return [];
                return RssModuleBindings.search(query);
            }
        }
    ],

    crossLinkHandlers: [
        {
            id: 'rss-cross-link',
            handleLinkCompleted: async (targets, sourceLink, extraData) => {
                // If a user links "from" an RSS Feed Item "to" an Entry
                if (sourceLink.type === 'rss-item' && extraData?.feedId && RssModuleBindings.linkResolver) {
                    // For each target entry that was linked, bind the item back to the entry
                    for (const target of targets) {
                         RssModuleBindings.linkResolver(extraData.feedId, sourceLink.id, target);
                    }
                }
            }
        }
    ],

    onRendererActivate: async (registrar: RendererRegistrar, _api: ScopedAPI) => {
        // Settings Panel
        const { RssSettings } = await import('./components/RssSettings');
        registrar.registerSettingsPanel({
            id: 'rss-settings',
            title: 'Feeds',
            icon: 'Rss',
            component: RssSettings,
            priority: 50
        });
    }
};
