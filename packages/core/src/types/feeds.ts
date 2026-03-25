export interface FeedItem {
    id: string; // GUID or link or videoId
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    author?: string;
    thumbnail?: string; // YouTube specific but shared for convenience
    videoId?: string;   // YouTube specific
    channelId?: string; // YouTube specific
}

export interface Feed {
    id: string;
    title: string;
    url: string;
    description?: string;
    link?: string;
    items: FeedItem[];
    lastFetched?: string;
    error?: string;
    folder?: string; // Extension specific classification
}

export interface FeedItemStatus {
    read: boolean;
    relatedEntries: { id: string; type: string; title: string }[];
}

/**
 * Utility to merge feed items while preserving local metadata or specific fields
 */
export function mergeFeedItems(oldItems: FeedItem[], newItems: FeedItem[], maxItems = 100): FeedItem[] {
    const itemMap = new Map<string, FeedItem>();

    // Add old items first
    oldItems.forEach(item => {
        const key = item.id || item.link;
        if (key) itemMap.set(key, item);
    });

    // Overwrite with new items (fresher data)
    newItems.forEach(item => {
        const key = item.id || item.link;
        if (!key) return;
        
        const existing = itemMap.get(key);
        itemMap.set(key, {
            ...existing,
            ...item,
            // Preserve extension-specific fields that might be lost during raw network fetch
            channelId: item.channelId || existing?.channelId
        });
    });

    return Array.from(itemMap.values())
        .sort((a, b) => {
            const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
            const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, maxItems);
}
