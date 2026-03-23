import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCoreServices } from '@citadel-app/ui';
// dataManager import removed — all operations now go through CoreServices
import { createRSSDataManager } from '../lib/rss-data-manager';
import { RssModuleBindings } from '../lib/module-bindings';

import { FeedItemStatus, Feed, FeedItem, pMap, mergeFeedItems } from '@citadel-app/core';

interface RSSContextType {
    feeds: Feed[];
    itemStatus: Record<string, FeedItemStatus>;
    addFeed: (url: string, folder?: string, title?: string) => Promise<void>;
    removeFeed: (id: string) => Promise<void>;
    refreshFeeds: () => Promise<void>;
    refreshFeed: (id: string) => Promise<void>;
    updateFeed: (id: string, updates: Partial<Feed>) => Promise<void>;
    markAsRead: (feedId: string, itemId: string) => void;
    markAllAsRead: (feedId?: string) => void;
    linkEntryToItem: (feedId: string, itemId: string, entry: { id: string; type: string; title: string }) => void;
    importOpml: (content: string) => Promise<void>;
    isLoading: boolean;
    showUnreadOnly: boolean;
    setShowUnreadOnly: (show: boolean) => void;
    pinnedFolders: string[];
    togglePinnedFolder: (folder: string) => void;
}

const RSSContext = createContext<RSSContextType | undefined>(undefined);

/**
 * Optional hook — returns undefined when outside RSSProvider.
 * Cross-cutting components (EntryHeader, AddLinkDialog) use this
 * to gracefully degrade when RSS module is not mounted.
 */
export const useRSS = (): RSSContextType | undefined => {
    return useContext(RSSContext);
};

/**
 * Strict hook — throws if outside RSSProvider.
 * Use this only within RSS-page components that are guaranteed
 * to be inside an RSSProvider.
 */
export const useRSSStrict = (): RSSContextType => {
    const context = useContext(RSSContext);
    if (!context) {
        throw new Error('useRSSStrict must be used within an RSSProvider');
    }
    return context;
};


export const RSSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { vaultPath, settings, toast, storage, feedDb, removeRelatedLinks } = useCoreServices();
    const rssData = useMemo(() => createRSSDataManager(storage), [storage]);
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [itemStatus, setItemStatus] = useState<Record<string, FeedItemStatus>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);

    // Refs for stable access in callbacks
    const feedsRef = useRef(feeds);
    const itemStatusRef = useRef(itemStatus);
    const initializedRef = useRef(initialized);
    const vaultPathRef = useRef(vaultPath);
    feedsRef.current = feeds;
    itemStatusRef.current = itemStatus;
    initializedRef.current = initialized;
    vaultPathRef.current = vaultPath;

    // Use a ref to track the latest state for debounced save without re-triggering effect
    const dataToSave = useRef({ feeds, itemStatus, pinnedFolders, initialized, vaultPath });
    dataToSave.current = { feeds, itemStatus, pinnedFolders, initialized, vaultPath };

    // Load/Reset feeds when vaultPath changes
    useEffect(() => {
        if (!vaultPath) {
            setFeeds([]);
            setItemStatus({});
            setInitialized(false);
            return;
        }

        const load = async () => {
            setIsLoading(true);
            try {
                const savedData = (await rssData.loadFeeds()) as any;
                const savedStatus = await feedDb.getFeedStatus();

                let feedsToSet: Feed[] = [];
                if (savedData !== null) {
                    if (Array.isArray(savedData)) {
                        feedsToSet = savedData;
                    } else if (savedData && savedData.feeds) {
                        feedsToSet = savedData.feeds;
                        if (savedData.pinnedFolders) {
                            setPinnedFolders(savedData.pinnedFolders);
                        }
                    }

                    // Safety check: ensure unique IDs
                    const idSet = new Set<string>();
                    feedsToSet = feedsToSet.map(f => {
                        if (idSet.has(f.id)) {
                            console.warn('[RSSContext] Detected duplicate ID on load, generating new one:', f.id);
                            return { ...f, id: uuidv4() };
                        }
                        idSet.add(f.id);
                        return f;
                    });

                    // For each feed, attempt to load cached items from SQLite
                    for (const feed of feedsToSet) {
                        try {
                            const cachedItems = await feedDb.getFeedItems(feed.id, 200);

                            // If we have items in JSON but not in SQLite (legacy migration), persist them to DB
                            if (feed.items && feed.items.length > 0 && cachedItems.length === 0) {
                                console.log(`[RSSContext] Migrating ${feed.items.length} items to SQLite for feed ${feed.id}`);
                                await feedDb.saveFeedItems(feed.id, feed.items);
                            }

                            feed.items = cachedItems.length > 0 ? cachedItems : (feed.items || []);
                        } catch (err) {
                            console.error(`[RSSContext] Failed to load cached items for ${feed.id}`, err);
                            feed.items = feed.items || [];
                        }
                    }

                    setInitialized(true);
                }

                setFeeds(feedsToSet);
                if (savedStatus) setItemStatus(savedStatus);
            } catch (e) {
                console.error('[RSSContext] Failed to load feeds:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [vaultPath]);

    // Debounced Save effect
    useEffect(() => {
        if (!initialized || !vaultPath) return;

        const timer = setTimeout(() => {
            const { feeds: f, pinnedFolders: p } = dataToSave.current;
            console.log('[RSS_DEBUG] Debounced saving feeds:', f.length);
            // Items are stripped in rssData.saveFeeds, so we just pass feeds
            rssData.saveFeeds({ feeds: f, pinnedFolders: p }).catch(() => { });
            // Item read status is already strictly saved to SQLite instantly!
        }, 2000);

        return () => clearTimeout(timer);
    }, [feeds, pinnedFolders, initialized, vaultPath]);


    const togglePinnedFolder = useCallback((folder: string) => {
        setPinnedFolders(prev =>
            prev.includes(folder)
                ? prev.filter(f => f !== folder)
                : [...prev, folder]
        );
    }, []);

    const fetchFeed = useCallback(async (url: string): Promise<Partial<Feed> & { items: FeedItem[] }> => {
        try {
            console.log(`[RSS] Fetching feed: ${url}`);
            const res = await (window as any).api.net.fetch(url);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }

            const text = res.text;

            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');

            const channel = xml.querySelector('channel') || xml.querySelector('feed');
            if (!channel) throw new Error('Invalid RSS/Atom feed');

            const title = channel.querySelector('title')?.textContent || url;
            const description = channel.querySelector('description')?.textContent || channel.querySelector('subtitle')?.textContent || '';
            const link = channel.querySelector('link')?.textContent || '';

            const items: FeedItem[] = [];
            const entries = xml.querySelectorAll('item, entry');

            entries.forEach(entry => {
                const itemTitle = entry.querySelector('title')?.textContent || 'Untitled';
                const itemLink = entry.querySelector('link')?.textContent || entry.querySelector('link')?.getAttribute('href') || '';
                const itemDesc = entry.querySelector('description')?.textContent || entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
                const itemGuid = entry.querySelector('guid')?.textContent || entry.querySelector('id')?.textContent || itemLink;
                const itemDate = entry.querySelector('pubDate')?.textContent || entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
                const itemAuthor = entry.querySelector('author')?.textContent || entry.querySelector('creator')?.textContent || '';

                items.push({
                    id: itemGuid.trim(),
                    title: itemTitle.trim(),
                    link: itemLink.trim(),
                    pubDate: itemDate.trim(),
                    contentSnippet: itemDesc.replace(/<[^>]+>/g, '').substring(0, 200) + (itemDesc.length > 200 ? '...' : ''),
                    content: itemDesc,
                    author: itemAuthor.trim()
                });
            });

            return {
                title,
                description,
                link,
                items
            };

        } catch (error: any) {
            console.error(`Failed to fetch feed ${url}`, error);
            throw error;
        }
    }, []);

    const addFeed = useCallback(async (url: string, folder?: string, title?: string) => {
        setIsLoading(true);
        try {
            // Check if already exists
            if (feedsRef.current.some(f => f.url === url)) {
                throw new Error('Feed already exists');
            }

            const feedData = await fetchFeed(url);

            const newFeed: Feed = {
                id: uuidv4(),
                url,
                title: title || feedData.title || 'Untitled Feed',
                description: feedData.description,
                link: feedData.link,
                items: feedData.items || [],
                lastFetched: new Date().toISOString(),
                folder
            };

            // Save items to SQLite DB
            if (newFeed.items.length > 0) {
                await feedDb.saveFeedItems(newFeed.id, newFeed.items);
            }

            setFeeds(prev => [...prev, newFeed]);
            toast(`Added scroll: ${newFeed.title}`, { type: 'success' });
        } catch (e: any) {
            console.error('Error adding feed', e);
            toast(`Failed to add scroll: ${e.message || 'Unknown error'}`, { type: 'error' });
            const newFeed: Feed = {
                id: uuidv4(),
                url,
                title: title || url,
                items: [],
                error: e.message || 'Failed to fetch',
                folder
            };
            setFeeds(prev => [...prev, newFeed]);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [fetchFeed]);

    // Listen for DataManager events (Entry Deletion)
    useEffect(() => {
        const unsubscribe = storage.subscribe((event, data) => {
            if (event === 'entry-deleted') {
                const deletedEntryId = data;
                console.log(`[RSSContext] Received entry-deleted: ${deletedEntryId}. Cleaning up links...`);

                setFeeds(currentFeeds => {
                    return currentFeeds;
                });

                setItemStatus(currentStatus => {
                    let changed = false;
                    const newStatus = { ...currentStatus };

                    for (const [itemId, status] of Object.entries(newStatus)) {
                        const newRelated = status.relatedEntries.filter(e => e.id !== deletedEntryId);
                        if (newRelated.length !== status.relatedEntries.length) {
                            changed = true;
                            newStatus[itemId] = { ...status, relatedEntries: newRelated };
                        }
                    }

                    return changed ? newStatus : currentStatus;
                });
            }
        });
        return unsubscribe;
    }, []);

    const removeFeed = useCallback(async (id: string) => {
        const feed = feedsRef.current.find(f => f.id === id);
        if (feed) {
            // Safe Delete: Remove all links in Entries that point to items in this feed
            const itemIds = feed.items.map(i => i.id);
            if (itemIds.length > 0) {
                await removeRelatedLinks(itemIds, 'rss-item');
            }
        }
        setFeeds(prev => prev.filter(f => f.id !== id));
    }, []);


    const applyUpdates = useCallback((updates: any[]) => {
        setFeeds(currentFeeds => {
            return currentFeeds.map(feed => {
                const update = updates.find(u => u.id === feed.id);
                if (!update) return feed;

                if (update.error) {
                    return { ...feed, error: update.error };
                }

                if (update.data) {
                    const mergedItems = mergeFeedItems(feed.items, update.data.items);
                    // Optimization: Only update if items actually changed or other metadata changed
                    const itemsChanged = mergedItems.length !== feed.items.length ||
                        (mergedItems.length > 0 && mergedItems[0].id !== (feed.items[0]?.id));

                    if (!itemsChanged && feed.title === update.data.title && !feed.error) {
                        return { ...feed, lastFetched: new Date().toISOString() };
                    }

                    // Save entirely new/updated items to SQLite DB
                    if (update.data.items && update.data.items.length > 0) {
                        feedDb.saveFeedItems(feed.id, update.data.items).catch((e: any) => console.error(e));
                    }

                    return {
                        ...feed,
                        ...update.data,
                        items: mergedItems,
                        lastFetched: new Date().toISOString(),
                        error: undefined
                    };
                }

                return feed;
            });
        });
    }, []);

    const refreshFeeds = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);

        const batchSize = settings.feedRefreshBatchSize || 5;
        let pendingUpdates: any[] = [];

        try {
            // Fetch all feed data first with concurrency limit
            await pMap(feedsRef.current, async (feed) => {
                try {
                    const data = await fetchFeed(feed.url);
                    pendingUpdates.push({ id: feed.id, data, error: undefined });
                } catch (e: any) {
                    pendingUpdates.push({ id: feed.id, data: undefined, error: e.message || 'Refresh failed' });
                }

                if (pendingUpdates.length >= batchSize) {
                    const currentBatch = [...pendingUpdates];
                    pendingUpdates = [];
                    applyUpdates(currentBatch);
                }
            }, 3);

            // Final batch
            if (pendingUpdates.length > 0) {
                applyUpdates(pendingUpdates);
            }
            if (!isBackground) toast('Library scrolls refreshed', { type: 'success' });
        } catch (err: any) {
            if (!isBackground) toast('Failed to refresh library scrolls', { type: 'error' });
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [fetchFeed, applyUpdates, settings.feedRefreshBatchSize, toast]);

    // Background Refresh Effect
    useEffect(() => {
        const interval = settings.rssRefreshInterval || 0;
        if (interval > 0 && initialized) {
            console.log(`[RSSContext] Starting background refresh interval: ${interval}ms`);
            const timer = setInterval(() => {
                refreshFeeds(true);
            }, interval);
            return () => clearInterval(timer);
        }
        return undefined;
    }, [settings.rssRefreshInterval, initialized, refreshFeeds]);

    const refreshFeed = useCallback(async (id: string, isAuto = false) => {
        const feed = feedsRef.current.find(f => f.id === id);
        if (!feed) return;

        try {
            const data = await fetchFeed(feed.url);

            if (data.items && data.items.length > 0) {
                await feedDb.saveFeedItems(feed.id, data.items);
            }

            setFeeds(prev => prev.map(f => {
                if (f.id !== id) return f;
                return {
                    ...f,
                    ...data,
                    items: mergeFeedItems(f.items, data.items),
                    lastFetched: new Date().toISOString(),
                    error: undefined
                };
            }));
        } catch (e: any) {
            setFeeds(prev => prev.map(f => {
                if (f.id !== id) return f;
                return { ...f, error: e.message };
            }));
            if (!isAuto) throw e; // Only re-throw for manual refreshes
        }
    }, [fetchFeed]);

    const updateFeed = useCallback(async (id: string, updates: Partial<Feed>) => {
        // If URL is changing, fetch from new URL
        if (updates.url) {
            const feed = feedsRef.current.find(f => f.id === id);
            // Only if it's different
            if (feed && feed.url !== updates.url) {
                try {
                    const data = await fetchFeed(updates.url);

                    if (data.items && data.items.length > 0) {
                        await feedDb.saveFeedItems(id, data.items);
                    }

                    setFeeds(prev => prev.map(f => {
                        if (f.id !== id) return f;
                        return {
                            ...f,
                            ...updates,
                            ...data,
                            title: updates.title || data.title || f.title,
                            items: mergeFeedItems(f.items, data.items || []),
                            lastFetched: new Date().toISOString(),
                            error: undefined
                        };
                    }));
                    return;
                } catch (e: any) {
                    setFeeds(prev => prev.map(f => {
                        if (f.id !== id) return f;
                        return {
                            ...f,
                            ...updates,
                            error: e.message
                        };
                    }));
                    return;
                }
            }
        }

        setFeeds(prev => prev.map(feed => {
            if (feed.id !== id) return feed;
            return { ...feed, ...updates };
        }));
    }, [fetchFeed]);

    const markAsRead = useCallback((_feedId: string, itemId: string) => {
        setItemStatus(prev => {
            const nextStatus = {
                ...prev,
                [itemId]: {
                    ...(prev[itemId] || { relatedEntries: [] }),
                    read: true
                }
            };
            // Persist background to SQLite
            feedDb.updateFeedStatus(itemId, nextStatus[itemId]).catch((e: any) => console.error(e));
            return nextStatus;
        });
    }, []);

    const markAllAsRead = useCallback((feedId?: string) => {
        setItemStatus(prev => {
            const next = { ...prev };
            const itemsToMark = feedId
                ? (feedsRef.current.find(f => f.id === feedId)?.items || [])
                : feedsRef.current.flatMap(f => f.items);

            itemsToMark.forEach(item => {
                next[item.id] = {
                    ...(next[item.id] || { relatedEntries: [] }),
                    read: true
                };
                feedDb.updateFeedStatus(item.id, next[item.id]).catch((e: any) => console.error(e));
            });
            return next;
        });
    }, []);

    const linkEntryToItem = useCallback((_feedId: string, itemId: string, entry: { id: string; type: string; title: string }) => {
        setItemStatus(prev => {
            const current = prev[itemId] || { read: false, relatedEntries: [] };
            if (current.relatedEntries.some(e => e.id === entry.id)) return prev;

            const nextStatus = {
                ...prev,
                [itemId]: {
                    ...current,
                    relatedEntries: [...current.relatedEntries, entry]
                }
            };

            feedDb.updateFeedStatus(itemId, nextStatus[itemId]).catch((e: any) => console.error(e));
            return nextStatus;
        });
    }, []);

    const importOpml = useCallback(async (content: string) => {
        setIsLoading(true);
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(content, 'text/xml');

            const outlines = xml.querySelectorAll('body > outline');

            const newFeeds: Feed[] = [];

            const scan = (nodes: NodeListOf<Element> | HTMLCollectionOf<Element>, folder?: string) => {
                Array.from(nodes).forEach(node => {
                    const type = node.getAttribute('type');
                    if (type === 'rss') {
                        const xmlUrl = node.getAttribute('xmlUrl');
                        if (xmlUrl) {
                            const title = node.getAttribute('title') || node.getAttribute('text') || xmlUrl;
                            if (!feedsRef.current.some(f => f.url === xmlUrl) && !newFeeds.some(f => f.url === xmlUrl)) {
                                newFeeds.push({
                                    id: uuidv4(),
                                    title,
                                    url: xmlUrl,
                                    items: [],
                                    folder
                                });
                            }
                        }
                    } else {
                        // Folder
                        const title = node.getAttribute('title') || node.getAttribute('text');
                        if (node.children.length > 0) {
                            scan(node.children, title || folder);
                        }
                    }
                });
            };

            scan(outlines); // Start with body > outline

            setFeeds(prev => [...prev, ...newFeeds]);

        } catch (e) {
            console.error('Failed to parse OPML', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Provide registry extension bindings
    useEffect(() => {
        const searchItems = async (query: string): Promise<any[]> => {
            if (!query || query.includes(':')) return []; // Skip structured queries for RSS for now
            const lowSearch = query.toLowerCase();
            const results: any[] = [];
            for (const feed of feedsRef.current) {
                const matches = feed.items.filter(item => item.title.toLowerCase().includes(lowSearch));
                for (const item of matches) {
                    results.push({
                        id: item.id,
                        type: 'rss-item',
                        title: item.title,
                        url: item.link,
                        metadata: { feedId: feed.id }
                    });
                }
            }
            return results.slice(0, 5);
        };
        RssModuleBindings.setBindings(linkEntryToItem, searchItems);
    }, [linkEntryToItem]);

    return (
        <RSSContext.Provider value={{
            feeds,
            itemStatus,
            addFeed,
            removeFeed,
            refreshFeeds,
            refreshFeed,
            updateFeed,
            markAsRead,
            markAllAsRead,
            linkEntryToItem,
            importOpml,
            isLoading,
            showUnreadOnly,
            setShowUnreadOnly,
            pinnedFolders,
            togglePinnedFolder
        }}>
            {children}
        </RSSContext.Provider>
    );
};
