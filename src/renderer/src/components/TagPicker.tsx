import React, { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';

interface TagPickerProps {
    selectedTags: string[];
    onAdd: (tag: string) => void;
    placeholder?: string;
    label?: string;
    excludeTags?: string[];
}

export const TagPicker = ({
    selectedTags = [],
    onAdd,
    placeholder = "Search tags...",
    label = "Add Tag",
    excludeTags = []
}: TagPickerProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Fetch all unique tags from the database (projected to save memory)
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            id: e.id,
            tags: e.tags
        }));
    }) || [];
    const existingTags = useMemo(() => {
        const tagSet = new Set<string>();
        allEntries.forEach(e => {
            if (e.tags) e.tags.forEach(t => tagSet.add(t));
        });

        // Exclude already selected tags and explicitly excluded tags
        const allExcluded = [...selectedTags, ...excludeTags];
        return Array.from(tagSet)
            .filter(t => !allExcluded.includes(t))
            .sort((a, b) => a.localeCompare(b));
    }, [allEntries, selectedTags, excludeTags]);

    const handleSelect = (tag: string) => {
        onAdd(tag);
        setSearch('');
        setOpen(false);
    };

    const handleCreate = () => {
        const trimmed = search.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            onAdd(trimmed);
            setSearch('');
            setOpen(false);
        }
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground/50 transition-all active:scale-95 shadow-sm"
                >
                    <Icon name="Plus" size={12} />
                    <span className="font-medium">{label}</span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="w-[240px] p-0 overflow-hidden bg-popover text-popover-foreground rounded-xl border border-border shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200"
                    align="start"
                    sideOffset={5}
                >
                    <Command className="flex flex-col w-full overflow-hidden">
                        <div className="flex items-center border-b border-border px-3">
                            <Icon name="Search" size={12} className="mr-2 opacity-50" />
                            <Command.Input
                                placeholder={placeholder}
                                value={search}
                                onValueChange={setSearch}
                                className="flex h-9 w-full rounded-md bg-transparent py-3 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <Command.List className="max-h-[200px] overflow-y-auto overflow-x-hidden p-1 custom-scrollbar">
                            <Command.Empty className="py-2 px-2">
                                <div className="text-xs text-muted-foreground mb-2">No tags found.</div>
                                {search.trim() && (
                                    <button
                                        onClick={handleCreate}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    >
                                        <Icon name="Plus" size={12} />
                                        Create "{search.trim()}"
                                    </button>
                                )}
                            </Command.Empty>

                            <Command.Group className="p-1">
                                {existingTags.map((tag) => (
                                    <Command.Item
                                        key={tag}
                                        value={tag}
                                        onSelect={() => handleSelect(tag)}
                                        className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                                    >
                                        <Icon name="Tag" size={12} className="mr-2 opacity-50" />
                                        <span className="truncate">{tag}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>

                            {search.trim() && !existingTags.some(t => t.toLowerCase() === search.trim().toLowerCase()) && (
                                <>
                                    <Command.Separator className="h-px bg-border my-1" />
                                    <Command.Item
                                        value={search}
                                        onSelect={handleCreate}
                                        className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-xs font-medium text-primary outline-none aria-selected:bg-primary/10 transition-colors"
                                    >
                                        <Icon name="Plus" size={12} className="mr-2" />
                                        Create "{search.trim()}"
                                    </Command.Item>
                                </>
                            )}
                        </Command.List>
                    </Command>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
