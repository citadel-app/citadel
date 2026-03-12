import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '../../components/IconRegistry';
import { type EntryMetadataPatch } from '..';
import { useAppSettings } from '../../context/AppSettingsContext';
import { cn } from '../../lib/utils';
import { useConfig } from '../../context/ConfigContext';
import type { CodexEntry } from '../../lib/db';

interface SmartTagsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: CodexEntry;
    content: string;
    onApply: (patch: EntryMetadataPatch) => void;
}

export const SmartTagsDialog = ({
    open,
    onOpenChange,
    entry,
    content,
    onApply
}: SmartTagsDialogProps) => {
    const { getEntryTypeConfig } = useConfig();
    const { settings } = useAppSettings();
    const [status, setStatus] = useState<'idle' | 'indexing' | 'loading' | 'review' | 'error'>('idle');
    const [patch, setPatch] = useState<EntryMetadataPatch | null>(null);
    const [indexInfo, setIndexInfo] = useState<string>('');

    // Review State
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewTags, setReviewTags] = useState<string[]>([]);
    const [reviewMetadata, setReviewMetadata] = useState<Record<string, any>>({});

    // Selection State
    const [applyTitle, setApplyTitle] = useState(true);
    const [applyTags, setApplyTags] = useState(true);
    const [applyMetadata, setApplyMetadata] = useState(true);

    useEffect(() => {
        if (open && status === 'idle') {
            analyze();
        }
        if (!open) {
            // Reset on close
            setStatus('idle');
            setPatch(null);
        }
    }, [open]);

    const generateSchemaDescription = (): string => {
        const config = getEntryTypeConfig(entry.type);
        if (!config || !config.metadata) return '';

        return config.metadata.filter(field => {
            return !config.fields.map(f => f.key).includes(field.key);
        }).map(field => {
            let desc = `- ${field.key} (${field.type}): ${field.label}`;

            if (field.description) {
                desc += `\n  Hint: ${field.description}`;
            }
            if (field.type === 'date') {
                desc += `\n  Format: YYYY-MM-DD`;
            }
            if (field.type === 'select') {
                if (field.options) {
                    desc += `\n  Options: ${field.options.map(o => o.value).join(', ')}`;
                }
            }
            return desc;
        }).join('\n');
    };

    const analyze = async () => {
        // Reset selection defaults
        setApplyTitle(true);
        setApplyTags(true);
        setApplyMetadata(true);
        setIndexInfo('');

        try {
            const autoIndexEnabled = settings.ai?.rag?.autoIndexOnAction ?? true;
            const reindexIntervalHours = settings.ai?.rag?.reindexInterval ?? 24;
            let ragContext = '';

            // 1. Check if RAG is available and index entry on-demand
            const { available } = await window.api.ai.isAvailable();
            if (available && autoIndexEnabled) {
                setStatus('indexing');
                setIndexInfo('Checking index status...');

                const needsIndex = await window.api.ai.needsIndexing(entry.id, reindexIntervalHours);
                if (needsIndex) {
                    setIndexInfo('Indexing entry for better context...');
                    const result = await window.api.ai.indexEntry(entry, {
                        chunkSize: settings.ai?.rag?.chunkSize ?? 1000,
                        chunkOverlap: settings.ai?.rag?.chunkOverlap ?? 100,
                        indexPdf: settings.ai?.rag?.indexPdf ?? true,
                        indexUrl: settings.ai?.rag?.indexUrl ?? true,
                        indexMarkdown: settings.ai?.rag?.indexMarkdown ?? true
                    });
                    setIndexInfo(`Indexed ${result.chunkCount} chunks`);
                }

                // 2. Get Dual-Context using RAG
                const structuralContext = await window.api.ai.getStructuralContext(entry.id, 3);
                const semanticContext = await window.api.ai.getContext(
                    entry.id,
                    `Document: ${entry.title}. Identify core themes, research topics, and descriptive metadata for this doc.`,
                    5
                );

                ragContext = `--- BEGINNING OF DOCUMENT ---
${structuralContext}

--- RELEVANT SEGMENTS ---
${semanticContext}`;
            }

            setStatus('loading');
            const schema = generateSchemaDescription();

            const result = await window.api.ai.generateMetadata({
                content,
                title: entry.title,
                existingTags: entry.tags || [],
                schema,
                context: ragContext
            });

            if (result) {
                setPatch(result);
                setReviewTitle(result.title || entry.title);
                setReviewTags(result.tags || entry.tags || []);
                setReviewMetadata(result.metadata || {});
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
        const finalPatch: EntryMetadataPatch = {};

        if (applyTitle && reviewTitle !== entry.title) {
            finalPatch.title = reviewTitle;
        }

        if (applyTags && (reviewTags.length > 0 || (entry.tags || []).length > 0)) {
            // Logic to determine if we should send tags. 
            // If applyTags is true, we send the reviewed tags.
            finalPatch.tags = reviewTags;
        }

        if (applyMetadata && Object.keys(reviewMetadata).length > 0) {
            finalPatch.metadata = reviewMetadata;
        }

        onApply(finalPatch);

        // Proactively re-index in background so RAG is fresh (tags/metadata changed)
        window.api.ai.indexEntry(entry).catch(e => console.error('[SmartTagsDialog] Proactive index failed', e));

        onOpenChange(false);
    };

    const toggleTag = (tag: string) => {
        if (reviewTags.includes(tag)) {
            setReviewTags(reviewTags.filter(t => t !== tag));
        } else {
            setReviewTags([...reviewTags, tag]);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
                <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[425px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 border border-border">
                    <Dialog.Title className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
                        <Icon name="Sparkles" className="text-purple-500" />
                        Smart Tags & Title
                    </Dialog.Title>

                    {status === 'indexing' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                            <Icon name="Database" size={32} className="animate-pulse text-purple-500" />
                            <p className="text-sm font-medium">{indexInfo || 'Preparing context...'}</p>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                            <Icon name="Loader2" size={32} className="animate-spin text-purple-500" />
                            <p className="text-sm font-medium">Analyzing contents...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-destructive">
                            <Icon name="AlertTriangle" size={32} />
                            <p className="text-sm font-medium">Failed to generate suggestions.</p>
                            <button onClick={() => onOpenChange(false)} className="text-sm underline mt-2">Close</button>
                        </div>
                    )}

                    {status === 'review' && patch && (
                        <div className="flex flex-col gap-6">
                            {/* Title Review */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={applyTitle}
                                        onChange={(e) => setApplyTitle(e.target.checked)}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        id="apply-title"
                                    />
                                    <label htmlFor="apply-title" className="text-xs uppercase font-bold text-muted-foreground cursor-pointer select-none">
                                        Title
                                    </label>
                                </div>
                                <div className={cn("transition-opacity", !applyTitle && "opacity-50 pointer-events-none")}>
                                    <input
                                        type="text"
                                        value={reviewTitle}
                                        onChange={(e) => setReviewTitle(e.target.value)}
                                        className="w-full bg-muted/50 border border-border rounded px-3 py-2 text-base focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                    {reviewTitle !== entry.title && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Original: <span className="line-through opacity-70">{entry.title}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Tags Review */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={applyTags}
                                        onChange={(e) => setApplyTags(e.target.checked)}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        id="apply-tags"
                                    />
                                    <label htmlFor="apply-tags" className="text-xs uppercase font-bold text-muted-foreground cursor-pointer select-none">
                                        Tags
                                    </label>
                                </div>

                                <div className={cn("transition-opacity", !applyTags && "opacity-50 pointer-events-none")}>
                                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                                        {reviewTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 flex items-center gap-1.5 border border-transparent hover:border-purple-200 transition-all"
                                            >
                                                <Icon name="Tag" size={12} />
                                                {tag}
                                                <Icon name="X" size={12} className="hover:text-destructive opacity-50 hover:opacity-100" />
                                            </button>
                                        ))}
                                        {reviewTags.length === 0 && (
                                            <p className="text-sm text-muted-foreground italic">No tags suggested.</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        {reviewTags.length} tags selected.
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Review */}
                            {Object.keys(reviewMetadata).length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={applyMetadata}
                                            onChange={(e) => setApplyMetadata(e.target.checked)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            id="apply-metadata"
                                        />
                                        <label htmlFor="apply-metadata" className="text-xs uppercase font-bold text-muted-foreground cursor-pointer select-none">
                                            Metadata
                                        </label>
                                    </div>
                                    <div className={cn("transition-opacity grid gap-2", !applyMetadata && "opacity-50 pointer-events-none")}>
                                        {Object.entries(reviewMetadata).map(([key, value]) => (
                                            <div key={key} className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-muted-foreground capitalize">{key}</label>
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => setReviewMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!applyTitle && !applyTags && !applyMetadata}
                                    className="px-4 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Apply Selected
                                </button>
                            </div>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
