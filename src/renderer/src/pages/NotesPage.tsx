import { useState, useEffect, useRef } from 'react';
import { TiptapWrapper } from '../components/editors/TiptapWrapper';
import { db } from '../lib/db';
import { Icon } from '../components/IconRegistry';
import { cn } from '../lib/utils';

export const NotesPage = () => {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFullWidth, setIsFullWidth] = useState(() => {
        return localStorage.getItem('notes-full-width') === 'true';
    });
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Save preference
    useEffect(() => {
        localStorage.setItem('notes-full-width', isFullWidth.toString());
    }, [isFullWidth]);

    // Initial Load (Ephemeral)
    useEffect(() => {
        setIsLoading(false);
    }, []);

    // Change Handler (Ephemeral)
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
    };

    const handleExportPdf = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden notes-page">
            {/* Header / Toolbar */}
            <header className="h-10 border-b border-border flex items-center justify-between px-4 bg-muted/20 shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                    {/* <div className="p-1 rounded bg-primary/10 text-primary">
                        <Icon name="StickyNote" size={14} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider italic">Quick Notes</span> */}
                    {isSaving && (
                        <span className="text-[10px] text-muted-foreground animate-pulse ml-2 flex items-center gap-1">
                            <Icon name="RefreshCw" size={10} className="animate-spin" />
                            Saving...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFullWidth(!isFullWidth)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border",
                            isFullWidth
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        )}
                    >
                        <Icon name={isFullWidth ? "Maximize" : "Minimize"} size={12} />
                        {isFullWidth ? "Full Width" : "Standard"}
                    </button>

                    <button
                        onClick={handleExportPdf}
                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <Icon name="FileDown" size={12} />
                        Export PDF
                    </button>
                </div>
            </header>

            {/* Editor Area */}
            <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 print:p-0 print:overflow-visible bg-muted/5 min-h-0">
                <div className={cn(
                    "mx-auto flex flex-col print:max-w-none transition-all duration-500 ease-in-out",
                    isFullWidth ? "w-full max-w-none" : "max-w-4xl w-full"
                )}>
                    <TiptapWrapper
                        content={content}
                        onChange={handleContentChange}
                        className="flex-1 border-none shadow-none bg-transparent"
                    />
                </div>
            </main>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 2cm;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    .notes-page, .notes-page main, .notes-page main *, 
                    .notes-page .ProseMirror, .notes-page .ProseMirror * {
                        visibility: visible !important;
                    }
                    .notes-page {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                    }
                    .notes-page header {
                        display: none !important;
                    }
                    .notes-page main {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .notes-page .ProseMirror {
                        padding: 0 !important;
                        border: none !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            ` }} />
        </div>
    );
};
