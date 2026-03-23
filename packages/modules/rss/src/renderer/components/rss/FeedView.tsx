import {useCoreServices,  cn, Icon } from '@citadel-app/ui';

import { useRSSStrict } from '../../context/RSSContext';
import { FeedItem } from '@citadel-app/core';


import { useMemo, useState, useRef, useEffect, memo } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import { useTheme } from 'next-themes';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { CachedImage } from './CachedImage';
import { useWebviewAudio } from '@citadel-app/ui';

interface FeedViewProps {
    selectedFeedId: string | null;
    initialItemId?: string | null;
}



import { getPrimaryFieldForUrl } from '@citadel-app/core';

const ConvertMenu = ({ item }: { item: FeedItem & { feedTitle: string; feedId: string } }) => {
    const navigate = useNavigate();
    const { linkEntryToItem } = useRSSStrict();
    const { createLocalEntry, toast, config, getPluginModules } = useCoreServices();

    const handleConvert = async (typeKey: string) => {
        if (!createLocalEntry) {
            toast('Entry creation is not supported in this environment.', { type: 'error' });
            return;
        }

        const entryType = config.entries[typeKey];
        if (!entryType) return;

        // Determine where to store the URL based on module mapping
        const urlField = getPrimaryFieldForUrl(entryType, getPluginModules());

        const entryData: any = {
            title: item.title,
            type: typeKey,
            // Link back to RSS Item
            relatedLinks: [{
                id: item.id,
                type: 'rss-item',
                title: item.title,
                url: item.link
            }],
            frontmatter: {
                author: item.author || item.feedTitle,
                publishedAt: item.pubDate
            }
        };

        // Assign URL to the mapped field, or fallback to frontmatter if strictly needed
        // but for now, if getPrimaryFieldForUrl returns null, we might just drop it (or put in frontmatter)
        if (urlField) {
            entryData[urlField] = item.link;
        } else {
            // Fallback: Always ensure it's accessible somewhere, frontmatter is safe
            entryData.frontmatter.sourceUrl = item.link;
        }

        try {
            const entry = await createLocalEntry(entryData);

            // Link RSS Item to new Entry
            linkEntryToItem(item.feedId, item.id, {
                id: entry.id,
                type: typeKey,
                title: entry.title
            });

            // Redirect to the new entry
            navigate(`/${typeKey}/${entry.id}`);
        } catch (error) {
            console.error("Failed to convert entry:", error);
            toast('Failed to convert entry', { type: 'error' });
        }
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    className={cn(
                        "p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors flex items-center gap-1",
                        "data-[state=open]:bg-muted data-[state=open]:text-foreground"
                    )}
                    title="Convert to Entry"
                >
                    <Icon name="FilePlus" size={16} />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="min-w-[160px] bg-white dark:bg-zinc-950 text-popover-foreground rounded-md border border-border shadow-md p-1 z-[100] animate-in fade-in-0 zoom-in-95"
                    align="end"
                    sideOffset={5}
                >
                    <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Convert to...
                    </DropdownMenu.Label>

                    {Object.values(config.entries).map(entryType => (
        <DropdownMenu.Item
            key={entryType.type}
            onSelect={() => handleConvert(entryType.type)}
            className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm focus:bg-accent focus:text-accent-foreground"
        >
            <Icon name={entryType.icon || 'File'} size={14} className={entryType.accentColor} />
            <span>{entryType.label}</span>
        </DropdownMenu.Item>
    ))
}
                </DropdownMenu.Content >
            </DropdownMenu.Portal >
        </DropdownMenu.Root >
    );
};

import { useSplitPane, SplitPaneLayout } from '@citadel-app/ui';

const ArticleRow = memo(({ index, style, data }: any) => {
    const { items, itemStatus, selectedItem, handleItemClick, navigate } = data;
    const item = items[index];
    if (!item) return null;
    const status = itemStatus[item.id];
    const isActive = selectedItem?.id === item.id;

    return (
        <div style={style} className="p-2">
            <article
                key={`${item.feedId}-${item.id}`}
                className={cn(
                    "p-4 rounded-xl border-l-[3px] transition-all cursor-pointer group relative shadow-sm h-full",
                    status?.read
                        ? "border-transparent bg-background text-muted-foreground hover:bg-muted/10 opacity-80"
                        : "border-primary bg-primary/[0.03] text-foreground hover:bg-primary/[0.05] shadow-primary/5",
                    isActive ? "bg-primary/[0.08] border-primary shadow-md ring-1 ring-primary/20 scale-[1.01] z-10" : ""
                )}
                onClick={() => handleItemClick(item)}
            >
                <div className="flex items-start justify-between mb-2 gap-4">
                    <h3 className={cn(
                        "text-[15px] leading-snug group-hover:text-primary transition-colors line-clamp-2",
                        status?.read ? "font-normal" : "font-bold"
                    )}>
                        {item.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap mt-1 font-semibold uppercase tracking-wider">
                        {item.pubDate ? new Date(item.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-inner">
                        <CachedImage
                            src={`https://icons.duckduckgo.com/ip3/${(() => {
                                try { return new URL(item.link || 'https://example.com').hostname; }
                                catch (e) { return 'example.com'; }
                            })()}.ico`}
                            alt=""
                            className="w-3 h-3 rounded-full opacity-70"
                            fallbackIcon="Rss"
                        />
                        {item.feedTitle}
                    </div>
                    {status?.relatedEntries && status.relatedEntries.length > 0 && (
                        <div className="flex items-center gap-1">
                            {status.relatedEntries.map((entry: any) => (
                                <span
                                    key={entry.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/${entry.type}/${entry.id}`);
                                    }}
                                    className="flex items-center gap-1 text-[9px] font-bold text-green-600 border border-green-500/20 bg-green-500/5 px-2 py-0.5 rounded-full hover:bg-green-500/10 cursor-pointer transition-all uppercase tracking-widest shadow-inner"
                                >
                                    <Icon name="Bookmark" size={9} />
                                    Saved
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed font-normal antialiased">
                    {item.contentSnippet}
                </p>
            </article>
        </div>
    );
});

export const FeedView = ({ selectedFeedId, initialItemId }: FeedViewProps) => {
    const navigate = useNavigate();
    const { feeds, itemStatus, markAsRead, markAllAsRead, showUnreadOnly, setShowUnreadOnly, refreshFeed } = useRSSStrict();
    const { activePanel, setActivePanel } = useSplitPane();
    const [, setSearchParams] = useSearchParams();
    const { settings } = useCoreServices();
    const isZen = settings?.zenMode;
    const [selectedItem, setSelectedItem] = useState<(FeedItem & { feedTitle: string; feedId: string }) | null>(null);
    const [setWebview, webviewElement] = useWebviewAudio();

    // Debounced refresh on feed selection
    useEffect(() => {
        if (!selectedFeedId) return;

        const timer = setTimeout(() => {
            console.log(`[RSS] Auto-refreshing feed: \${selectedFeedId}`);
            refreshFeed(selectedFeedId).catch(err => {
                console.warn(`[RSS] Auto-refresh failed for \${selectedFeedId}:`, err);
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [selectedFeedId, refreshFeed]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ height: 400, width: 300 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const { height, width } = entries[0].contentRect;
            setDimensions({ height, width });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);
    const items = useMemo(() => {
        let allItems: (FeedItem & { feedTitle: string; feedId: string })[] = [];

        if (selectedFeedId) {
            const feed = feeds.find(f => f.id === selectedFeedId);
            if (feed) {
                allItems = feed.items.map(item => ({ ...item, feedTitle: feed.title, feedId: feed.id }));
            }
        } else {
            // All feeds
            feeds.forEach(feed => {
                allItems.push(...feed.items.map(item => ({ ...item, feedTitle: feed.title, feedId: feed.id })));
            });
        }

        // Apply filters
        if (showUnreadOnly) {
            allItems = allItems.filter(item => !itemStatus[item.id]?.read);
        }

        // Sort by date descending
        return allItems.sort((a, b) => {
            const dateA = new Date(a.pubDate || 0).getTime();
            const dateB = new Date(b.pubDate || 0).getTime();
            return dateB - dateA;
        });
    }, [feeds, selectedFeedId, showUnreadOnly, itemStatus]);

    // Sync from URL to State
    useEffect(() => {
        if (initialItemId && items.length > 0) {
            const item = items.find(i => i.id === initialItemId);
            if (item && item.id !== selectedItem?.id) {
                setSelectedItem(item);
                if (activePanel === 'left') setActivePanel('both');
            }
        }
    }, [initialItemId, items]);

    const handleItemClick = (item: FeedItem & { feedTitle: string; feedId: string }) => {
        const status = itemStatus[item.id];
        if (!status?.read) {
            markAsRead(item.feedId, item.id);
        }
        setSelectedItem(item);

        // Update URL
        setSearchParams(prev => {
            prev.set('itemId', item.id);
            return prev;
        });

        // Auto-switch layout if we are in "List Only" mode
        if (activePanel === 'left') {
            setActivePanel('both');
        }
    };

    const renderList = () => (
        <div className="h-full flex flex-col bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                            showUnreadOnly
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        )}
                        title={showUnreadOnly ? "Show all items" : "Show unread only"}
                    >
                        <Icon name={showUnreadOnly ? "Eye" : "EyeOff"} size={12} />
                        {showUnreadOnly ? "Showing Unread" : "Unread Only"}
                    </button>
                    <button
                        onClick={() => markAllAsRead(selectedFeedId || undefined)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-muted text-muted-foreground transition-colors"
                        title="Mark these items as read"
                    >
                        <Icon name="CheckCheck" size={12} />
                        Mark Read
                    </button>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted p-1 px-2 rounded-full">
                    {items.length} Articles
                </span>
            </div>
            <div ref={containerRef} className="flex-1 overflow-hidden custom-scrollbar">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Icon name="Inbox" size={48} className="mb-4 opacity-50" />
                        <p className="text-sm font-medium">No articles found.</p>
                        {showUnreadOnly && (
                            <button
                                onClick={() => setShowUnreadOnly(false)}
                                className="mt-4 text-primary hover:underline text-xs"
                            >
                                Show all articles
                            </button>
                        )}
                    </div>
                ) : (
                    <List
                        height={dimensions.height}
                        itemCount={items.length}
                        itemSize={132}
                        width={dimensions.width}
                        itemData={{ items, itemStatus, selectedItem, handleItemClick, navigate }}
                        children={ArticleRow as any}
                    />
                )}
            </div>
        </div>
    );

    const { theme } = useTheme();

    useEffect(() => {
        const webview = webviewElement;
        if (!webview) return;

        const handleDomReady = () => {
            // Dark mode injection
            if (theme === 'dark') {
                webview.insertCSS(`
                    html, body {
                        background-color: #121212 !important;
                        color: #e0e0e0 !important;
                    }
                    a { color: #4daafc !important; }
                `);
            }

            webview.executeJavaScript(`
                // Helper to wrap text nodes in a range
                function highlightRange(range) {
                    const newNode = document.createElement("span");
                    newNode.style.backgroundColor = "#facc15";
                    newNode.style.color = "black";
                    newNode.className = "codex-highlight";
                    try {
                        range.surroundContents(newNode);
                    } catch (e) {
                         const content = range.extractContents();
                         newNode.appendChild(content);
                         range.insertNode(newNode);
                    }
                }

                document.addEventListener('mouseup', (e) => {
                    if (e.target.id === 'codex-highlight-btn') return;

                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
                         const existingBtn = document.getElementById('codex-highlight-btn');
                         if (existingBtn) existingBtn.remove();
                         return;
                    }

                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    const existingBtn = document.getElementById('codex-highlight-btn');
                    if (existingBtn) existingBtn.remove();

                    const btn = document.createElement('button');
                    btn.id = 'codex-highlight-btn';
                    btn.textContent = 'Highlight';
                    btn.style.cssText = \`
                        position: fixed;
                        top: \${rect.top - 40}px;
                        left: \${rect.left}px;
                        z-index: 2147483647;
                        padding: 6px 12px;
                        background: #facc15;
                        color: black;
                        border: 1px solid #eab308;
                        border-radius: 4px;
                        cursor: pointer;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                        font-weight: bold;
                        font-size: 13px;
                        font-family: sans-serif;
                        pointer-events: auto;
                    \`;

                    btn.onmousedown = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    };

                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Highlighting selection:', selection.toString());
                        highlightRange(range);
                        window.getSelection().removeAllRanges();
                        btn.remove();
                    };

                    document.body.appendChild(btn);
                });
            `);

            webview.addEventListener('console-message', (e) => {
                console.log('[Webview Console]:', e.message);
            });
        };

        const existingWebview = webview; // toggle capture for cleanup
        existingWebview.addEventListener('dom-ready', handleDomReady);

        return () => {
            existingWebview.removeEventListener('dom-ready', handleDomReady);
        };
    }, [selectedItem, theme, webviewElement]);

    const renderContent = () => {
        if (!selectedItem) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                    <Icon name="ExternalLink" size={48} className="mb-4 opacity-50" />
                    <p>Select an article to view</p>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col bg-background">
                <div className="p-2 border-b border-border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <h2 className="text-sm font-semibold truncate">{selectedItem.title}</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <ConvertMenu item={selectedItem} />
                        <button
                            onClick={() => window.open(selectedItem.link, '_blank')}
                            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                            title="Open in Browser"
                        >
                            <Icon name="ExternalLink" size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 relative">
                    <webview
                        ref={setWebview}
                        src={selectedItem.link}
                        className="h-full w-full"
                        // @ts-ignore
                        allowpopups="true"
                    />
                </div>
            </div>
        );
    };

    if (activePanel === 'right' || (isZen && selectedItem)) {
        return <div className="h-full w-full">{renderContent()}</div>;
    }

    if (activePanel === 'left' || (isZen && !selectedItem)) {
        return <div className="h-full w-full">{renderList()}</div>;
    }

    // Split mode (both)
    return (
        <div className="h-full w-full">
            <SplitPaneLayout
                leftPanel={renderList()}
                rightPanel={renderContent()}
                defaultLeftSize={35}
                minSize={20}
                showLayoutControls={false}
            />
        </div>
    );
};
