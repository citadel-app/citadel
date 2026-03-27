import { IModule, RendererRegistrar, APP_VERSION } from '@citadel-app/core';
import { lazy } from 'react';
// ...
export const CodeModule: IModule = {
    id: '@citadel-app/code',
    version: APP_VERSION,
    permissions: {
        ipc: [
            'fs.readFile',
            'fs.readFileBinary'
        ]
    },
    ipcs: [
        'kernel.start',
        'kernel.execute',
        'kernel.stop',
        'kernel.status',
        'latex:check',
        'latex:compile',
        'code.execution.start',
        'code.execution.stop',
        'code.execution.status'
    ],


    contentModules: {
        code: {
            id: 'code',
            label: 'Code Editor',
            description: 'Monaco code editor.',
            requirements: []
        }
    },

    providers: [
        { entry: { id: 'repl-provider', scope: 'global', priority: 110 }, component: ReplProvider }
    ],

    routes: [
        { path: '/editor', component: lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage }))) },
        { path: '/latex', component: lazy(() => import('./pages/LatexEditorPage').then(m => ({ default: m.LatexEditorPage }))) },
        { path: '/repl', component: lazy(() => import('./pages/ReplPage').then(m => ({ default: m.ReplPage }))) }
    ],

    globalComponents: [
        { region: 'CodeSolutionSection', component: CodeSolutionSection },
        { region: 'MonacoDiffWrapper', component: lazy(() => import('./components/MonacoDiffWrapper').then(m => ({ default: m.MonacoDiffWrapper }))) }
    ],

    navigationItems: [
        {
            id: 'nav-repl',
            label: 'The Forge',
            path: '/repl',
            icon: 'Terminal',
            activeClass: 'text-primary bg-primary/10',
            inactiveClass: 'text-cyan-500 hover:bg-cyan-500/10',
            priority: 30
        }
    ],

    sidebarItems: [
        {
            id: 'sidebar-editor',
            label: 'The Workshop',
            path: '/editor',
            icon: 'Hammer',
            priority: 30,
            tourId: 'tour-editor'
        },
        {
            id: 'sidebar-latex',
            label: 'The Scribe',
            path: '/latex',
            icon: 'Languages',
            priority: 40
        }
    ],

    sectionEditors: {
        code: CodeSectionEditor
    },

    contentViewers: {
        code: CodeContentViewer
    },
    statusWidgets: [
        { id: 'code-status', group: 'Cloud & Local Stack', component: CodeStatusWidget },
        { id: 'code-execution', group: 'Cloud & Local Stack', component: CodeExecutionWidget }
    ],

    async onRendererActivate(registrar: RendererRegistrar) {
        console.log('[CodeModule] Activating renderer side...');

        // Initialize Monaco Environment for Web Workers
        (self as any).MonacoEnvironment = {
            getWorker(_: any, label: string) {
                if (label === 'json') return new jsonWorker();
                if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
                if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
                if (label === 'typescript' || label === 'javascript') return new tsWorker();
                return new editorWorker();
            }
        };

        const { CodeSettings } = await import('./components/CodeSettings');
        registrar.registerSettingsPanel({
            id: 'execution',
            title: 'Code',
            icon: 'Terminal',
            component: CodeSettings,
            priority: 40
        });
    }
};
