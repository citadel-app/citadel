import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Icon } from './IconRegistry';
import { metadataService, EntryMetadataPatch } from '../ai';
import { cn } from '../lib/utils';

interface SmartMetadataButtonProps {
    content: string;
    currentTitle: string;
    existingTags: string[];
    onApply: (patch: EntryMetadataPatch) => void;
}

export const SmartMetadataButton = ({
    content,
    currentTitle,
    existingTags,
    onApply
}: SmartMetadataButtonProps) => {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'review' | 'error'>('idle');
    const [patch, setPatch] = useState<EntryMetadataPatch | null>(null);

    // Review State
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewTags, setReviewTags] = useState<string[]>([]);

    // Selection State
    const [applyTitle, setApplyTitle] = useState(true);
    const [applyTags, setApplyTags] = useState(true);

    const handleAnalyze = async () => {
        setStatus('loading');
        setOpen(true);
        // Reset selection to default true
        setApplyTitle(true);
        setApplyTags(true);

        try {
            const result = await metadataService.generateMetadata(content, currentTitle, existingTags);
            if (result) {
                setPatch(result);
                setReviewTitle(result.title || currentTitle);
                setReviewTags(result.tags || existingTags);
                setStatus('review');
            } else {
                setStatus('error');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const handleApply = () => {
        // Construct final patch based on USER REVIEW & SELECTION
        const finalPatch: EntryMetadataPatch = {};

        if (applyTitle && reviewTitle !== currentTitle) {
            finalPatch.title = reviewTitle;
        }

        if (applyTags && reviewTags.length > 0) {
            finalPatch.tags = reviewTags;
        } else if (applyTags && reviewTags.length === 0) {
            // If user selected generic "Tags" but list is empty, effectively clearing?
            // Or typically AI returns existing + new.
            // If reviewTags is different from existingTags, we should update.
            // For now, let's just pass it if applyTags is true.
            finalPatch.tags = reviewTags;
        }

        onApply(finalPatch);
        setOpen(false);
        setStatus('idle');
    };

    const toggleTag = (tag: string) => {
        if (reviewTags.includes(tag)) {
            setReviewTags(reviewTags.filter(t => t !== tag));
        } else {
            setReviewTags([...reviewTags, tag]);
        }
    };

    return (
        <Popover.Root open={open} onOpenChange={(isOpen) => {
            if (!isOpen && status === 'loading') return;
            setOpen(isOpen);
            if (!isOpen) setStatus('idle');
        }}>
            <Popover.Trigger asChild>
                <button
                    onClick={handleAnalyze}
                    className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-md transition-colors"
                    title="Smart Suggest (AI)"
                >
                    <Icon name="Sparkles" size={16} />
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="w-80 bg-popover text-popover-foreground rounded-lg border border-border shadow-xl p-4 z-50 animate-in fade-in zoom-in-95"
                    sideOffset={5}
                    align="end"
                >
                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-4 gap-3 text-muted-foreground">
                            <Icon name="Loader2" size={24} className="animate-spin text-purple-500" />
                            <p className="text-xs font-medium">Analyzing contents...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-4 gap-2 text-destructive">
                            <Icon name="AlertTriangle" size={24} />
                            <p className="text-xs font-medium">Failed to generate suggestions.</p>
                            <button onClick={() => setOpen(false)} className="text-xs underline mt-2">Close</button>
                        </div>
                    )}

                    {status === 'review' && patch && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Icon name="Sparkles" size={14} className="text-purple-500" />
                                <h3 className="text-sm font-semibold">Review Suggestions</h3>
                            </div>

                            {/* Title Review */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={applyTitle}
                                        onChange={(e) => setApplyTitle(e.target.checked)}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        id="apply-title"
                                    />
                                    <label htmlFor="apply-title" className="text-[10px] uppercase font-bold text-muted-foreground cursor-pointer select-none">
                                        Title
                                    </label>
                                </div>
                                <div className={cn("transition-opacity", !applyTitle && "opacity-50 pointer-events-none")}>
                                    <input
                                        type="text"
                                        value={reviewTitle}
                                        onChange={(e) => setReviewTitle(e.target.value)}
                                        className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                    {reviewTitle !== currentTitle && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Original: <span className="line-through opacity-70">{currentTitle}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Tags Review */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={applyTags}
                                        onChange={(e) => setApplyTags(e.target.checked)}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        id="apply-tags"
                                    />
                                    <label htmlFor="apply-tags" className="text-[10px] uppercase font-bold text-muted-foreground cursor-pointer select-none">
                                        Tags
                                    </label>
                                </div>

                                <div className={cn("transition-opacity", !applyTags && "opacity-50 pointer-events-none")}>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                        {reviewTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 flex items-center gap-1 border border-transparent hover:border-purple-200 transition-all"
                                            >
                                                <Icon name="Tag" size={10} />
                                                {tag}
                                                <Icon name="X" size={10} className="hover:text-destructive" />
                                            </button>
                                        ))}
                                        {reviewTags.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic">No tags suggested.</p>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        {reviewTags.length} tags selected.
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!applyTitle && !applyTags}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply Selected
                                </button>
                            </div>
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
