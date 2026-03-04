import { lazy } from 'react';

// Lazy load modules to prevent eagerly loading heavy libraries (monaco, excalidraw, pdf.js)
const PdfModule = lazy(() => import('../components/modules/PdfModule').then(m => ({ default: m.PdfModule })));
const WhiteboardModule = lazy(() => import('../components/modules/WhiteboardModule').then(m => ({ default: m.WhiteboardModule })));
const CodeModule = lazy(() => import('../components/modules/CodeModule').then(m => ({ default: m.CodeModule })));
const WebviewModule = lazy(() => import('../components/modules/WebviewModule').then(m => ({ default: m.WebviewModule })));
const SectionsPanel = lazy(() => import('../components/sections/SectionsPanel').then(m => ({ default: m.SectionsPanel })));

export const ModuleRegistry: Record<string, React.FC<any> | React.LazyExoticComponent<any>> = {
    pdf: PdfModule,
    whiteboard: WhiteboardModule,
    webview: WebviewModule,
    code: CodeModule,
    sections: SectionsPanel,
};
