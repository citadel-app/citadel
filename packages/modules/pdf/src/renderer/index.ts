import { IModule, RendererRegistrar, ScopedAPI, APP_VERSION } from '@citadel-app/core';
import { lazy } from 'react';
import { PdfModelStatusWidget } from './components/PdfModelStatusWidget';

export const PdfModule: IModule = {
    id: '@citadel-app/pdf',
    version: APP_VERSION,
    ipcs: [
        'pdf.tts.start',
        'pdf.tts.stop',
        'pdf.tts.status',
        'pdf.tts.checkModels',
        'pdf.tts.downloadModels'
    ],
    permissions: {
        ipc: []
    },

    statusWidgets: [
        { id: 'pdf-models', group: 'Cloud & Local Stack', component: PdfModelStatusWidget }
    ],

    contentModules: {
        pdf: {
            id: 'pdf',
            label: 'PDF Viewer',
            description: 'View and highlight PDF documents.',
            requirements: [
                { key: 'source', types: ['file', 'url'], label: 'PDF Source', description: 'File path or URL to the PDF' }
            ]
        }
    },

    contentViewers: {
        // @ts-ignore
        pdf: lazy(async () => {
            const m = await import('./components/PdfViewerWrapper');
            return { default: m.PdfViewerWrapper as React.ComponentType<any> };
        })
    }
};

// Re-export components for host-level lazy imports if still needed temporarily
export { PdfViewerWrapper as PdfViewer } from './components/PdfViewerWrapper';
