import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';
import type { MainRegistrar } from '@citadel-app/core';

export class FeedService {
    private db: Database.Database | null = null;
    private registrar: MainRegistrar<'@citadel-app/base'>;

    constructor(registrar: MainRegistrar<'@citadel-app/base'>) {
        this.registrar = registrar;
        this.registerHandlers();
    }

    private createTables() {
        if (!this.db) return;
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS feed_items (
                id TEXT PRIMARY KEY,
                feedId TEXT NOT NULL,
                title TEXT NOT NULL,
                link TEXT,
                pubDate TEXT,
                content TEXT,
                contentSnippet TEXT,
                author TEXT,
                thumbnail TEXT,
                videoId TEXT,
                channelId TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_feed_items_feedId ON feed_items(feedId);
            CREATE INDEX IF NOT EXISTS idx_feed_items_pubDate ON feed_items(pubDate DESC);

            CREATE TABLE IF NOT EXISTS feed_status (
                itemId TEXT PRIMARY KEY,
                read INTEGER DEFAULT 0,
                relatedEntriesJSON TEXT DEFAULT '[]'
            );
        `);
    }

    public setActiveWorkspace(workspacePath: string) {
        if (this.db) {
            this.db.close();
            this.db = null;
        }

        if (!workspacePath) {
            console.warn('[FeedService] No workspace — using in-memory SQLite');
            this.db = new Database(':memory:');
        } else {
            const configDir = path.join(workspacePath, '.codex');
            fs.ensureDirSync(configDir);
            const dbPath = path.join(configDir, 'feeds.db');
            console.log(`[FeedService] Initializing feed database at: ${dbPath}`);
            this.db = new Database(dbPath);
        }

        this.db.pragma('journal_mode = WAL');
        this.createTables();
    }

    private registerHandlers() {
        this.registrar.handle('db.getFeedItems', async (feedId: string, limit?: number) => {
            if (!this.db) return [];
            try {
                const stmt = this.db.prepare(`
                    SELECT * FROM feed_items 
                    WHERE feedId = ? 
                    ORDER BY pubDate DESC 
                    LIMIT ?
                `);
                return stmt.all(feedId, limit || 200) as any[];
            } catch (error) {
                console.error(`[FeedService] Failed to get feed items for ${feedId}:`, error);
                return [];
            }
        });

        this.registrar.handle('db.saveFeedItems', async (feedId: string, items: any[]) => {
            if (!this.db) return;
            try {
                const insert = this.db.prepare(`
                    INSERT INTO feed_items (id, feedId, title, link, pubDate, content, contentSnippet, author, thumbnail, videoId, channelId)
                    VALUES (@id, @feedId, @title, @link, @pubDate, @content, @contentSnippet, @author, @thumbnail, @videoId, @channelId)
                    ON CONFLICT(id) DO UPDATE SET
                        title = excluded.title,
                        link = excluded.link,
                        pubDate = excluded.pubDate,
                        content = excluded.content,
                        contentSnippet = excluded.contentSnippet,
                        author = excluded.author,
                        thumbnail = excluded.thumbnail,
                        videoId = excluded.videoId,
                        channelId = excluded.channelId
                `);

                const transaction = this.db.transaction((feedItems: any[]) => {
                    for (const item of feedItems) {
                        insert.run({
                            id: item.id || `${item.pubDate}-${item.title}`,
                            feedId: feedId,
                            title: item.title || 'Untitled',
                            link: item.link || '',
                            pubDate: item.pubDate || '',
                            content: item.content || '',
                            contentSnippet: item.contentSnippet || '',
                            author: item.author || '',
                            thumbnail: item.thumbnail || '',
                            videoId: item.videoId || '',
                            channelId: item.channelId || ''
                        });
                    }
                });

                transaction(items);
            } catch (error) {
                console.error(`[FeedService] Failed to save feed items for ${feedId}:`, error);
                throw error;
            }
        });

        this.registrar.handle('db.getFeedStatus', async () => {
            if (!this.db) return {};
            try {
                const stmt = this.db.prepare('SELECT * FROM feed_status');
                const rows = stmt.all() as any[];
                
                const statusMap: Record<string, any> = {};
                for (const row of rows) {
                    statusMap[row.itemId] = {
                        read: row.read === 1,
                        relatedEntries: JSON.parse(row.relatedEntriesJSON || '[]')
                    };
                }
                return statusMap;
            } catch (error) {
                console.error('[FeedService] Failed to get feed statuses:', error);
                return {};
            }
        });

        this.registrar.handle('db.updateFeedStatus', async (itemId: string, status: any) => {
            if (!this.db) return;
            try {
                const getStmt = this.db.prepare('SELECT * FROM feed_status WHERE itemId = ?');
                const existing = getStmt.get(itemId) as any;

                const readVal = status.read !== undefined ? (status.read ? 1 : 0) : (existing?.read || 0);
                const relatedEntriesJSON = status.relatedEntries !== undefined 
                    ? JSON.stringify(status.relatedEntries) 
                    : (existing?.relatedEntriesJSON || '[]');

                const insert = this.db.prepare(`
                    INSERT INTO feed_status (itemId, read, relatedEntriesJSON)
                    VALUES (?, ?, ?)
                    ON CONFLICT(itemId) DO UPDATE SET
                        read = excluded.read,
                        relatedEntriesJSON = excluded.relatedEntriesJSON
                `);

                insert.run(itemId, readVal, relatedEntriesJSON);
            } catch (error) {
                console.error(`[FeedService] Failed to update feed status for ${itemId}:`, error);
                throw error;
            }
        });

        console.log('[FeedService] IPC handlers registered globally.');
    }
}
