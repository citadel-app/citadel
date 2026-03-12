import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '../../components/IconRegistry';
import { useAppSettings } from '../../context/AppSettingsContext';
import type { CodexEntry } from '../../lib/db';

interface SummaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: CodexEntry;
    content: string;
    onApply: (summary: string) => void;
}

export const SummaryDialog = ({
    open,
    onOpenChange,
    entry,
    content,
    onApply
}: SummaryDialogProps) => {
    const { settings } = useAppSettings();
    const [status, setStatus] = useState<'idle' | 'indexing' | 'loading' | 'review' | 'error'>('idle');
    const [summary, setSummary] = useState('');
    const [indexInfo, setIndexInfo] = useState<string>('');

    useEffect(() => {
        if (open && status === 'idle') {
            generateSummary();
        }
        if (!open) {
            setStatus('idle');
            setSummary('');
            setIndexInfo('');
        }
    }, [open]);

    const generateSummary = async () => {
        try {
            // Check if auto-indexing on AI actions is enabled
            const autoIndexEnabled = settings.ai?.rag?.autoIndexOnAction ?? true;
            const reindexIntervalHours = settings.ai?.rag?.reindexInterval ?? 24;

            // 1. Check if RAG is available and index entry on-demand
            const { available } = await window.api.ai.isAvailable();
            if (available && autoIndexEnabled) {
                setStatus('indexing');
                setIndexInfo('Checking index status...');

                const needsIndex = await window.api.ai.needsIndexing(entry.id, reindexIntervalHours);
                if (needsIndex) {
                    setIndexInfo('Indexing entry for semantic search...');
                    const result = await window.api.ai.indexEntry(entry, {
                        chunkSize: settings.ai?.rag?.chunkSize ?? 1000,
                        chunkOverlap: settings.ai?.rag?.chunkOverlap ?? 100,
                        indexPdf: settings.ai?.rag?.indexPdf ?? true,
                        indexUrl: settings.ai?.rag?.indexUrl ?? true,
                        indexMarkdown: settings.ai?.rag?.indexMarkdown ?? true
                    });
                    setIndexInfo(`Indexed ${result.chunkCount} chunks`);
                } else {
                    setIndexInfo('Using cached index');
                }

                // 2. Get Dual Context using RAG
                const structuralContext = await window.api.ai.getStructuralContext(entry.id, 3);
                const semanticContext = await window.api.ai.getContext(
                    entry.id,
                    `Summary search: ${entry.title}. Core findings, technical details, and main arguments.`,
                    5
                );

                const fullRagContext = `--- BEGINNING OF DOCUMENT (Abstract/Identity) ---
${structuralContext}

--- RELEVANT SEGMENTS (Semantic Search) ---
${semanticContext}
`;

                // 3. Generate Summary using Liquid Template
                setStatus('loading');

                const contentToSummarize = (!content || content.trim().length === 0)
                    ? `Title: ${entry.title}`
                    : content;

                const result = await window.api.ai.generateSummary({ content: contentToSummarize, context: fullRagContext });
                if (result) {
                    setSummary(result);
                    setStatus('review');
                } else {
                    setStatus('error');
                }
            } else {
                // Fallback: no RAG available
                setStatus('loading');
                const contentToSummarize = (!content || content.trim().length === 0)
                    ? `Title: ${entry.title}`
                    : content;
                const result = await window.api.ai.generateSummary({ content: contentToSummarize });
                if (result) {
                    setSummary(result);
                    setStatus('review');
                } else {
                    setStatus('error');
                }
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const handleApply = async () => {
        onApply(summary);
        // Proactively re-index in background so RAG is fresh
        window.api.ai.indexEntry(entry).catch(e => console.error('[SummaryDialog] Proactive index failed', e));
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
                <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 z-50 border border-border">
                    <Dialog.Title className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
                        <Icon name="FileText" className="text-blue-500" />
                        AI Summary
                    </Dialog.Title>

                    {status === 'indexing' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                            <Icon name="Database" size={32} className="animate-pulse text-purple-500" />
                            <p className="text-sm font-medium">{indexInfo || 'Preparing semantic index...'}</p>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                            <Icon name="Loader2" size={32} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Generating summary...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-destructive">
                            <Icon name="AlertTriangle" size={32} />
                            <p className="text-sm font-medium">Failed to generate summary.</p>
                            <button onClick={() => onOpenChange(false)} className="text-sm underline mt-2">Close</button>
                        </div>
                    )}

                    {status === 'review' && (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground">
                                Review the AI-generated summary below. Click "Add to Note" to prepend it as a <code className="text-xs bg-muted px-1 py-0.5 rounded">## Summary</code> section.
                            </p>

                            <div className="bg-muted/50 border border-border rounded-lg p-4">
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={4}
                                    className="w-full bg-transparent text-sm resize-none focus:outline-none"
                                    placeholder="Summary..."
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!summary.trim()}
                                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add to Note
                                </button>
                            </div>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
