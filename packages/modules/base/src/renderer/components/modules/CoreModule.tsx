import { lazy } from 'react';
import type { IModule } from '@citadel-app/core';

export const CoreModule: IModule = {
    id: '@citadel-app/core-ui',
    version: '1.0.3',
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
        webview: lazy(() => import('./WebviewModule').then(m => ({ default: m.WebviewModule }))),
        sections: lazy(() => import('../sections/SectionsPanel').then(m => ({ default: m.SectionsPanel })))
    }
};
