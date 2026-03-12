import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useRSS } from '../context/RSSContext';
import { useConfig } from '../context/ConfigContext';
import { SearchInput } from '../search/components/SearchInput';
import { SearchService } from '../search/services/SearchService';

interface AddLinkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentEntryId: string;
    onAddLink: (link: { id: string; type: string; title: string, url?: string }, extra?: any) => void;
}

export const AddLinkDialog = ({ open, onOpenChange, currentEntryId, onAddLink }: AddLinkDialogProps) => {
    const [search, setSearch] = useState('');
    const { feeds } = useRSS();
    const { getEntryTypeConfig } = useConfig();
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            ...e,
            content: undefined,
            highlights: undefined,
            whiteboard: undefined,
            code: undefined
        }));
    }) || [];

    // Search Entries using SearchService
    const entries = useMemo(() => {
        if (!search) return [];

        // Use full SearchService evaluation
        const filtered = SearchService.evaluate(
            search,
            allEntries,
            getEntryTypeConfig
        );

        return filtered
            .filter(e => e.id !== currentEntryId)
            .slice(0, 10);
    }, [search, allEntries, currentEntryId, getEntryTypeConfig]);

    // Search RSS Items (basic search as they don't follow the entry schema)
    const rssItems = useMemo(() => {
        if (!search || search.includes(':')) return []; // Skip structured queries for RSS for now

        const lowSearch = search.toLowerCase();
        return feeds.flatMap(feed =>
            feed.items
                .filter(item => item.title.toLowerCase().includes(lowSearch))
                .map(item => ({ item, feedId: feed.id }))
        ).slice(0, 5);
    }, [search, feeds]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50 transition-all" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 border border-border/50 bg-card/90 backdrop-blur-2xl p-8 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-[2rem] outline-none">
                    <div className="flex flex-col gap-2">
                        <Dialog.Title className="text-xl font-black uppercase tracking-widest text-foreground">
                            Link Knowledge
                        </Dialog.Title>
                        <Dialog.Description className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                            Search entries or RSS feeds using structured queries.
                        </Dialog.Description>
                    </div>

                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        onClear={() => setSearch('')}
                        placeholder="e.g. type:paper #algorithm"
                        className="w-full"
                    />

                    <div className="max-h-[300px] overflow-y-auto space-y-4">
                        {/* Entries Section */}
                        {entries && entries.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Codex Entries</h4>
                                <div className="space-y-1">
                                    {entries.map(entry => {
                                        const config = getEntryTypeConfig(entry.type);
                                        const badgeStyle = config?.accentBg && config?.accentColor
                                            ? `${config.accentBg} ${config.accentColor}`
                                            : "bg-primary/10 text-primary";

                                        return (
                                            <button
                                                key={entry.id}
                                                onClick={() => {
                                                    onAddLink({ id: entry.id, type: entry.type, title: entry.title });
                                                    setSearch('');
                                                    onOpenChange(false);
                                                }}
                                                className="w-full flex items-center justify-between p-2 text-sm rounded hover:bg-muted text-left group"
                                            >
                                                <span className="font-medium">{entry.title}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("text-[10px] uppercase px-1.5 py-0.5 rounded flex items-center gap-1", badgeStyle)}>
                                                        {config?.icon && <Icon name={config.icon as any} size={10} />}
                                                        {config?.label || entry.type}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* RSS Items Section */}
                        {rssItems.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">RSS Feed Items</h4>
                                <div className="space-y-1">
                                    {rssItems.map(({ item, feedId }) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                onAddLink(
                                                    { id: item.id, type: 'rss-item', title: item.title, url: item.link },
                                                    { feedId }
                                                );
                                                setSearch('');
                                                onOpenChange(false);
                                            }}
                                            className="w-full flex items-center justify-between p-2 text-sm rounded hover:bg-muted text-left"
                                        >
                                            <span className="font-medium truncate max-w-[80%]">{item.title}</span>
                                            <span className="text-[10px] uppercase bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">RSS</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {search && (!entries?.length && !rssItems.length) && (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                No results found.
                            </div>
                        )}
                        {!search && (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                Start typing to search...
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="text-xs hover:underline text-muted-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
