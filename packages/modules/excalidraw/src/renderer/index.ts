import { IModule, RendererRegistrar, ScopedAPI } from '@citadel-app/core';
import { lazy } from 'react';

export const ExcalidrawModule: IModule = {
    id: '@citadel-app/excalidraw',
    version: '1.0.6',
    ipcs: [],
    permissions: {
        ipc: [
            'fs.readFile',
            'fs.exists',
        ]
    },


    contentModules: {
        whiteboard: {
            id: 'whiteboard',
            label: 'Whiteboard',
            description: 'Canvas for drawing.',
            requirements: []
        }
    },

    routes: [
        { path: '/whiteboard', component: lazy(() => import('./pages/WhiteboardPage').then(m => ({ default: m.WhiteboardPage }))) }
    ],

    sidebarItems: [
        {
            id: 'sidebar-whiteboard',
            label: 'The Canvas',
            path: '/whiteboard',
            icon: 'Palette',
            group: 'top',
            priority: 40
        }
    ],

    contentViewers: {
        whiteboard: lazy(() => import('./components/WhiteboardModule').then(m => ({ default: m.WhiteboardModule })))
    },

    externalDataHandlers: [
        {
            type: 'whiteboard',
            frontmatterKey: 'whiteboardId',
            dir: 'board'
        }
    ],

    sectionEditors: {
        whiteboard: lazy(() => import('./components/ExcalidrawEditor').then(m => ({ default: m.ExcalidrawEditor })))
    },

    onRendererActivate: async (registrar: RendererRegistrar, _api: ScopedAPI) => {
        // Set up public static assets path dynamically so the host doesn't need to know about Excalidraw
        (window as any).EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

        // Settings panel for Excalidraw-specific options
        registrar.registerSettingsPanel({
            id: 'excalidraw',
            title: 'Whiteboard',
            icon: 'Palette',
            component: lazy(() =>
                import('./components/ExcalidrawSettings').then(m => ({ default: m.ExcalidrawSettingsPanel }))
            ),
            priority: 45
        });
    }
};

// Re-export components for host-level lazy imports if still needed
export { WhiteboardModule } from './components/WhiteboardModule';
export { WhiteboardPage } from './pages/WhiteboardPage';
export { ComponentLibrary } from './components/ComponentLibrary';
