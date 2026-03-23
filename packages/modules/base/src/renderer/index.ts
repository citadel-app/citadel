import type { IModule } from '@citadel-app/core';
import { lazy } from 'react';
import { BaseAppHost } from './BaseAppHost';

export const BaseModule: IModule = {
    id: '@citadel-app/base',
    version: '1.0.0',
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
    contentViewers: {
        webview: lazy(() => import('./components/modules/WebviewModule').then(m => ({ default: m.WebviewModule }))),
        sections: lazy(() => import('./components/sections/SectionsPanel').then(m => ({ default: m.SectionsPanel })))
    }
};
