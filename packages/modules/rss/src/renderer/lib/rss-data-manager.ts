/**
 * RSS Feed Data Manager — owns all RSS feed persistence.
 * Uses StorageProvider from CoreServices instead of the app's DataManager.
 */
import type { StorageProvider } from '@citadel-app/core';
import type { Feed, FeedItemStatus } from '@citadel-app/core';

const FEEDS_PATH = '.codex/feeds.json';
const FEED_ITEMS_PATH = '.codex/feed-items.json';
const LEGACY_FEEDS_PATH = '00_Meta/feeds.json';

export interface FeedData {
    feeds: Feed[];
    pinnedFolders: string[];
}

export function createRSSDataManager(storage: StorageProvider) {
    return {
        async loadFeeds(): Promise<FeedData> {
            // Migration: Check legacy path
            if (!(await storage.exists(FEEDS_PATH)) && (await storage.exists(LEGACY_FEEDS_PATH))) {
                console.log('[RSSDataManager] Migrating feeds from 00_Meta...');
                try {
                    const content = await storage.readFile(LEGACY_FEEDS_PATH);
                    if (content) await storage.writeFile(FEEDS_PATH, content);
                } catch (e) {
                    console.error('[RSSDataManager] Feed migration failed', e);
                }
            }

            const savedData = await storage.readJSON<any>(FEEDS_PATH);
            if (!savedData) return { feeds: [], pinnedFolders: [] };

            // Handle both new object format { feeds, pinnedFolders } and legacy array format
            const feeds: Feed[] = Array.isArray(savedData) ? savedData : (savedData.feeds || []);
            const pinnedFolders: string[] = Array.isArray(savedData) ? [] : (savedData.pinnedFolders || []);

            // MIGRATION: Extract read status and relatedEntries to feed-items.json
            const itemStatus: Record<string, FeedItemStatus> = {};
            let needsMigration = false;

            feeds.forEach((feed) => {
                feed.items = feed.items || [];
                feed.items.forEach((item) => {
                    if (!item.id) {
                        item.id = (item as any).guid || item.link || `${item.pubDate}-${item.title}`;
                        needsMigration = true;
                    }
                    if ((item as any).read !== undefined || (item as any).relatedEntries !== undefined) {
                        needsMigration = true;
                        itemStatus[item.id] = {
                            read: !!(item as any).read,
                            relatedEntries: (item as any).relatedEntries || []
                        };
                        delete (item as any).read;
                        delete (item as any).relatedEntries;
                    }
                });
            });

            if (needsMigration) {
                console.log('[RSSDataManager] Migrating feed item status to feed-items.json...');
                const currentStatus = await this.loadFeedItems();
                await this.saveFeedItems({ ...currentStatus, ...itemStatus });
                await this.saveFeeds({ feeds, pinnedFolders });
            }

            // MIGRATION: Segregate YouTube feeds (type='youtube' or folder='YouTube')
            const youtubeFeeds = feeds.filter((f: any) => f.type === 'youtube' || f.folder === 'YouTube');
            if (youtubeFeeds.length > 0) {
                console.log(`[RSSDataManager] Found ${youtubeFeeds.length} YouTube feeds in RSS data, segregating...`);
                const existingYouTube = (await storage.readJSON<any[]>('.codex/youtube-feeds.json')) || [];
                const mergedYouTube = [...existingYouTube];
                youtubeFeeds.forEach((yf: any) => {
                    if (!mergedYouTube.some(existing => existing.url === yf.url)) {
                        mergedYouTube.push(yf);
                    }
                });
                await storage.writeJSON('.codex/youtube-feeds.json', mergedYouTube);
                const remainingFeeds = feeds.filter((f: any) => f.type !== 'youtube' && f.folder !== 'YouTube');
                await this.saveFeeds({ feeds: remainingFeeds, pinnedFolders });
                return { feeds: remainingFeeds, pinnedFolders };
            }

            return { feeds, pinnedFolders };
        },

        async saveFeeds(data: FeedData | Feed[]): Promise<void> {
            let dataToSave: any;

            if (Array.isArray(data)) {
                // Strip items for storage (items are ephemeral, fetched on refresh)
                dataToSave = data.map(feed => {
                    const { items, ...feedWithoutItems } = feed;
                    return feedWithoutItems;
                });
            } else {
                dataToSave = {
                    ...data,
                    feeds: (data.feeds || []).map(feed => {
                        const { items, ...feedWithoutItems } = feed;
                        return feedWithoutItems;
                    })
                };
            }

            try {
                await storage.writeJSON(FEEDS_PATH, dataToSave);
            } catch (e) {
                console.warn('[RSSDataManager] Could not save feeds:', e);
            }
        },

        async loadFeedItems(): Promise<Record<string, FeedItemStatus>> {
            return (await storage.readJSON<Record<string, FeedItemStatus>>(FEED_ITEMS_PATH)) || {};
        },

        async saveFeedItems(items: Record<string, FeedItemStatus>): Promise<void> {
            try {
                await storage.writeJSON(FEED_ITEMS_PATH, items);
            } catch (e) {
                console.warn('[RSSDataManager] Could not save feed items:', e);
            }
        }};
}

export type RSSDataManager = ReturnType<typeof createRSSDataManager>;
