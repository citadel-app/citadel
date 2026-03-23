import { useMemo, useState, useEffect } from 'react';
import { CachedImage } from './CachedImage';

import { EditFeedDialog } from './EditFeedDialog';
import { cn, ConfirmDialog, Icon } from '@citadel-app/ui';
import { useRSSStrict } from '../../context/RSSContext';

interface FeedListProps {
    selectedFeedId: string | null;
    onSelectFeed: (id: string | null) => void;
    onAddFeed: () => void;
    onToggleSidebar?: () => void;
}

export const FeedList = ({ selectedFeedId, onSelectFeed, onAddFeed, onToggleSidebar }: FeedListProps) => {
    const { feeds, itemStatus, removeFeed, refreshFeeds, refreshFeed, isLoading, pinnedFolders, togglePinnedFolder } = useRSSStrict();
    const [showEmptyFeeds, setShowEmptyFeeds] = useState(true);
    const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
    const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Initialize all folders as collapsed on mount
    const [isInitialized, setIsInitialized] = useState(false);
    useEffect(() => {
        if (feeds.length > 0 && !isInitialized) {
            const allFolders = new Set<string>(feeds.map(f => f.folder || 'Uncategorized'));
            setCollapsedFolders(allFolders);
            setIsInitialized(true);
        }
    }, [feeds, isInitialized]);


    // Group feeds
    const groupedFeeds = useMemo(() => {
        let filtered = feeds.filter(f => showEmptyFeeds || f.items.length > 0);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(f => f.title.toLowerCase().includes(query));
        }

        const groups: Record<string, typeof feeds> = {};

        filtered.forEach(feed => {
            const folder = feed.folder || 'Uncategorized';
            if (!groups[folder]) groups[folder] = [];
            groups[folder].push(feed);
        });

        // Sort folders: Pinned first, then by alpha
        return Object.entries(groups).sort((a, b) => {
            const isPinnedA = pinnedFolders.includes(a[0]);
            const isPinnedB = pinnedFolders.includes(b[0]);

            if (isPinnedA && !isPinnedB) return -1;
            if (!isPinnedA && isPinnedB) return 1;

            if (a[0] === 'Uncategorized') return 1;
            if (b[0] === 'Uncategorized') return -1;
            return a[0].localeCompare(b[0]);
        });
    }, [feeds, showEmptyFeeds, searchQuery, pinnedFolders]);

    const toggleFolder = (folder: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folder)) next.delete(folder);
            else next.add(folder);
            return next;
        });
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmDeleteId(id);
    };

    const executeDelete = () => {
        if (confirmDeleteId) {
            removeFeed(confirmDeleteId);
            if (selectedFeedId === confirmDeleteId) {
                onSelectFeed(null);
            }
        }
        setConfirmDeleteId(null);
    };

    const handleRefresh = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (refreshingIds.has(id)) return;

        setRefreshingIds(prev => new Set(prev).add(id));
        try {
            await refreshFeed(id);
        } finally {
            setRefreshingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-muted/30 w-full">
            <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Feeds</h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowEmptyFeeds(!showEmptyFeeds)}
                            className={cn(
                                "p-1.5 rounded hover:bg-muted transition-colors",
                                showEmptyFeeds ? "text-foreground" : "text-muted-foreground opacity-50"
                            )}
                            title={showEmptyFeeds ? "Hide Empty Feeds" : "Show Empty Feeds"}
                        >
                            <Icon name="Filter" size={16} />
                        </button>
                        <button
                            onClick={refreshFeeds}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh All"
                            disabled={isLoading}
                        >
                            <Icon name={isLoading ? "Loader2" : "RefreshCw"} size={16} className={cn(isLoading && "animate-spin")} />
                        </button>
                        <button
                            onClick={onAddFeed}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Add Feed"
                        >
                            <Icon name="Plus" size={16} />
                        </button>
                        {onToggleSidebar && (
                            <button
                                onClick={onToggleSidebar}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-all"
                                title="Collapse Sidebar"
                            >
                                <Icon name="ChevronLeft" size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <Icon name="Search" size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search feeds..."
                        className="w-full bg-background/50 border border-border rounded-md pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <Icon name="X" size={12} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button
                    onClick={() => onSelectFeed(null)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                        selectedFeedId === null
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Icon name="LayoutList" size={18} />
                    All Feeds
                    <span className="ml-auto text-xs opacity-70 bg-background px-1.5 py-0.5 rounded-full border border-border">
                        {feeds.reduce((acc, feed) => acc + feed.items.filter(i => !itemStatus[i.id]?.read).length, 0)}
                    </span>
                </button>

                <div className="h-px bg-border my-2 mx-2 opacity-50" />

                {groupedFeeds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                        {feeds.length === 0 ? "No feeds yet." : "All feeds are empty."}
                        <br />
                        {feeds.length === 0 && "Click + to add one."}
                    </div>
                ) : (
                    groupedFeeds.map(([folder, folderFeeds]) => (
                        <div key={folder} className="mb-2">
                            {folder !== 'Uncategorized' ? (
                                <div className="w-full flex items-center gap-2 px-2 py-1.5 mt-3 mb-1 group/folder-header">
                                    <button
                                        onClick={() => toggleFolder(folder)}
                                        className="flex-1 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] hover:text-foreground transition-all group/folder"
                                    >
                                        <Icon
                                            name={collapsedFolders.has(folder) ? "ChevronRight" : "ChevronDown"}
                                            size={10}
                                            className="opacity-50 group-hover/folder:opacity-100 transition-opacity"
                                        />
                                        <Icon name="Folder" size={12} className={cn(pinnedFolders.includes(folder) ? "text-primary" : "text-primary/60")} />
                                        <span className="truncate">{folder}</span>
                                        {folderFeeds.reduce((acc, f) => acc + f.items.filter(i => !itemStatus[i.id]?.read).length, 0) > 0 && (
                                            <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/20 px-1 text-[9px] font-bold text-primary mr-1">
                                                {folderFeeds.reduce((acc, f) => acc + f.items.filter(i => !itemStatus[i.id]?.read).length, 0)}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePinnedFolder(folder);
                                        }}
                                        className={cn(
                                            "opacity-0 group-hover/folder-header:opacity-100 p-1 hover:bg-muted rounded transition-all",
                                            pinnedFolders.includes(folder) ? "opacity-100 text-primary" : "text-muted-foreground/40"
                                        )}
                                        title={pinnedFolders.includes(folder) ? "Unpin Group" : "Pin Group to Top"}
                                    >
                                        <Icon name="Pin" size={10} className={cn(pinnedFolders.includes(folder) && "fill-current")} />
                                    </button>
                                </div>
                            ) : (
                                <div className="px-2 py-1.5 mt-3 mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] border-t border-border/30 pt-3">
                                    Uncategorized
                                </div>
                            )}

                            {!collapsedFolders.has(folder) && (
                                <div className="space-y-0.5">
                                    {folderFeeds.map(feed => (
                                        <button
                                            key={feed.id}
                                            onClick={() => onSelectFeed(feed.id)}
                                            className={cn(
                                                "group w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left relative",
                                                selectedFeedId === feed.id
                                                    ? "bg-primary/20 text-primary font-bold shadow-sm"
                                                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                                folder !== 'Uncategorized' && "ml-4 w-[calc(100%-1rem)]"
                                            )}
                                        >
                                            <div className="shrink-0 flex items-center justify-center w-5 h-5">
                                                {feed.error ? (
                                                    <Icon name="AlertCircle" size={14} className="text-red-500" />
                                                ) : (
                                                    <CachedImage
                                                        src={`https://icons.duckduckgo.com/ip3/${(() => {
                                                            try { return new URL(feed.url).hostname; }
                                                            catch (e) { return 'example.com'; }
                                                        })()}.ico`}
                                                        alt=""
                                                        className="w-4 h-4 rounded-sm opacity-80 group-hover:opacity-100 transition-opacity"
                                                        fallbackIcon="Rss"
                                                    />
                                                )}
                                                <Icon name="Rss" size={14} className={cn("hidden", feed.error && "hidden")} />
                                            </div>
                                            <span className="truncate flex-1 leading-none">{feed.title}</span>

                                            {/* Unread Count */}
                                            {feed.items.filter(i => !itemStatus[i.id]?.read).length > 0 && (
                                                <span className={cn(
                                                    "ml-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold transition-colors",
                                                    selectedFeedId === feed.id
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted-foreground/20 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                                                )}>
                                                    {feed.items.filter(i => !itemStatus[i.id]?.read).length}
                                                </span>
                                            )}

                                            {/* Actions (visible on hover) */}
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div
                                                    onClick={(e) => handleRefresh(e, feed.id)}
                                                    className="p-1.5 rounded hover:bg-muted hover:text-foreground bg-card shadow-sm border border-border text-muted-foreground"
                                                    title="Refresh Feed"
                                                >
                                                    <Icon
                                                        name={refreshingIds.has(feed.id) ? "Loader2" : "RefreshCw"}
                                                        size={14}
                                                        className={cn(refreshingIds.has(feed.id) && "animate-spin")}
                                                    />
                                                </div>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingFeedId(feed.id);
                                                    }}
                                                    className="p-1.5 rounded hover:bg-muted hover:text-foreground bg-card shadow-sm border border-border text-muted-foreground"
                                                    title="Edit Feed"
                                                >
                                                    <Icon name="Edit2" size={14} />
                                                </div>
                                                <div
                                                    onClick={(e) => handleDelete(e, feed.id)}
                                                    className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500 bg-card shadow-sm border border-border text-muted-foreground"
                                                    title="Unsubscribe"
                                                >
                                                    <Icon name="Trash2" size={14} />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <EditFeedDialog
                open={!!editingFeedId}
                onOpenChange={(open) => !open && setEditingFeedId(null)}
                feedId={editingFeedId}
            />

            <ConfirmDialog
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title="Remove Feed"
                description="Are you sure you want to remove this feed?"
                confirmLabel="Remove"
                onConfirm={executeDelete}
                variant="destructive"
            />
        </div>
    );
};
