import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '../../components/IconRegistry';
import { metadataService, ragService } from '..';
import type { CodexEntry } from '../../lib/db';

interface GrammarDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: CodexEntry;
    content: string;
    onApply: (correctedContent: string) => void;
}

export const GrammarDialog = ({
    open,
    onOpenChange,
    entry,
    content,
    onApply
}: GrammarDialogProps) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'review' | 'error'>('idle');
    const [correctedContent, setCorrectedContent] = useState('');
    const [showDiff, setShowDiff] = useState(true);

    useEffect(() => {
        if (open && status === 'idle') {
            generateProofread();
        }
        if (!open) {
            setStatus('idle');
            setCorrectedContent('');
        }
    }, [open]);

    const generateProofread = async () => {
        setStatus('loading');
        try {
            const result = await metadataService.proofread(content);
            if (result) {
                setCorrectedContent(result);
                setStatus('review');
            } else {
                setStatus('error');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const handleApply = async () => {
        onApply(correctedContent);
        // Proactively re-index in background so RAG is fresh
        ragService.indexEntry(entry).catch(e => console.error('[GrammarDialog] Proactive index failed', e));
        onOpenChange(false);
    };

    // Simple diff highlighting - show lines that changed
    const hasChanges = content.trim() !== correctedContent.trim();

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
                <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[700px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 z-50 border border-border overflow-hidden flex flex-col">
                    <Dialog.Title className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
                        <Icon name="Check" className="text-green-500" />
                        Fix Grammar
                    </Dialog.Title>

                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                            <Icon name="Loader2" size={32} className="animate-spin text-green-500" />
                            <p className="text-sm font-medium">Proofreading your content...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-destructive">
                            <Icon name="AlertTriangle" size={32} />
                            <p className="text-sm font-medium">Failed to proofread content.</p>
                            <button onClick={() => onOpenChange(false)} className="text-sm underline mt-2">Close</button>
                        </div>
                    )}

                    {status === 'review' && (
                        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                            {!hasChanges ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                                    <Icon name="CheckCircle" size={32} className="text-green-500" />
                                    <p className="text-sm font-medium">No grammar issues found!</p>
                                    <button
                                        onClick={() => onOpenChange(false)}
                                        className="mt-4 px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            Review the corrected content below. Click "Apply Changes" to replace your note's content.
                                        </p>
                                        <button
                                            onClick={() => setShowDiff(!showDiff)}
                                            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                                        >
                                            {showDiff ? 'Edit' : 'Preview'}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto bg-muted/50 border border-border rounded-lg">
                                        {showDiff ? (
                                            <div className="p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-auto">
                                                {correctedContent}
                                            </div>
                                        ) : (
                                            <textarea
                                                value={correctedContent}
                                                onChange={(e) => setCorrectedContent(e.target.value)}
                                                className="w-full h-full min-h-[300px] p-4 bg-transparent text-sm resize-none focus:outline-none font-mono"
                                                placeholder="Corrected content..."
                                            />
                                        )}
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
                                            disabled={!correctedContent.trim()}
                                            className="px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Apply Changes
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
