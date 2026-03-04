import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Icon } from '../../components/IconRegistry';
import { SmartTagsDialog } from './SmartTagsDialog';
import { SummaryDialog } from './SummaryDialog';
import { GrammarDialog } from './GrammarDialog';
import { type EntryMetadataPatch } from '..';
import type { CodexEntry } from '../../lib/db';

interface SmartActionsMenuProps {
    entry: CodexEntry;
    content: string;
    onMetadataPatch: (patch: EntryMetadataPatch) => void;
    onAddSummarySection?: (summary: string) => void;
    onReplaceContent?: (newContent: string) => void;
}

export const SmartActionsMenu = ({
    entry,
    content,
    onMetadataPatch,
    onAddSummarySection,
    onReplaceContent
}: SmartActionsMenuProps) => {
    const [activeTool, setActiveTool] = useState<'tags' | 'summary' | 'grammar' | null>(null);

    const handleSummaryApply = (summary: string) => {
        if (onAddSummarySection) {
            onAddSummarySection(summary);
        }
    };

    const handleGrammarApply = (correctedContent: string) => {
        if (onReplaceContent) {
            onReplaceContent(correctedContent);
        }
    };

    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-md transition-colors data-[state=open]:bg-purple-500/10 data-[state=open]:text-purple-500"
                        title="Smart Actions (AI)"
                    >
                        <Icon name="Sparkles" size={16} />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="min-w-[180px] bg-popover text-popover-foreground rounded-md border border-border p-1 shadow-md z-50 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                        sideOffset={5}
                        align="end"
                    >
                        <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            AI Tools
                        </DropdownMenu.Label>

                        <DropdownMenu.Item
                            onSelect={() => setActiveTool('tags')}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-default select-none rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                            <Icon name="Tag" size={14} className="text-purple-500" />
                            Smart Tags & Title
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                            onSelect={() => setActiveTool('summary')}
                            disabled={!onAddSummarySection}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-default select-none rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:opacity-50"
                        >
                            <Icon name="FileText" size={14} className="text-blue-500" />
                            Summarize
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                            onSelect={() => setActiveTool('grammar')}
                            disabled={!onReplaceContent}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-default select-none rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:opacity-50"
                        >
                            <Icon name="Check" size={14} className="text-green-500" />
                            Fix Grammar
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <SmartTagsDialog
                open={activeTool === 'tags'}
                onOpenChange={(open) => !open && setActiveTool(null)}
                entry={entry}
                content={content}
                onApply={onMetadataPatch}
            />

            <SummaryDialog
                open={activeTool === 'summary'}
                onOpenChange={(open) => !open && setActiveTool(null)}
                entry={entry}
                content={content}
                onApply={handleSummaryApply}
            />

            <GrammarDialog
                open={activeTool === 'grammar'}
                onOpenChange={(open) => !open && setActiveTool(null)}
                entry={entry}
                content={content}
                onApply={handleGrammarApply}
            />
        </>
    );
};
