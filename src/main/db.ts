import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared';

export class FeedDatabase {
    private db: Database.Database | null = null;
    private dbPath: string = '';

    constructor() {}

    public setGuardrail() {
        // Guardrail no longer needed for workspace-level validation in FeedDB
    }
    
    public init(workspacePath: string) {
        if (!workspacePath) {
            console.warn('[FeedDB] Initializing in non-workspace mode => In-memory SQLite');
            this.db = new Database(':memory:');
        } else {
            const codexDir = path.join(workspacePath, '.codex');
            const workspaceJsonPath = path.join(codexDir, 'workspace.json');
            
            // Only initialize persistent db if this is a real Codex workspace
            if (fs.existsSync(workspaceJsonPath)) {
                const configDir = path.join(codexDir, 'config');
                fs.ensureDirSync(configDir);
                
                this.dbPath = path.join(configDir, 'feeds.db');
                console.log(`[FeedDB] Initializing SQLite database at: ${this.dbPath}`);
                
                this.db = new Database(this.dbPath);
            } else {
                console.warn('[FeedDB] Not a native Codex workspace => In-memory SQLite');
                this.db = new Database(':memory:');
            }
        }

        this.db.pragma('journal_mode = WAL');
        this.createTables();
        this.registerIpcHandlers();
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

            CREATE TABLE IF NOT EXISTS ai_index_status (
                entryId TEXT PRIMARY KEY,
                lastIndexed TEXT NOT NULL,
                chunkCount INTEGER NOT NULL,
                contentHash TEXT NOT NULL,
                lastError TEXT
            );
        `);
    }

    public close() {
        if (this.db) {
            console.log('[FeedDB] Closing SQLite database');
            this.db.close();
            this.db = null;
        }
    }

    private registerIpcHandlers() {
        // Unregister first if re-initializing on workspace change
        ipcMain.removeHandler(IPC_CHANNELS.DB_GET_FEED_ITEMS);
        ipcMain.removeHandler(IPC_CHANNELS.DB_SAVE_FEED_ITEMS);
        ipcMain.removeHandler(IPC_CHANNELS.DB_GET_FEED_STATUS);
        ipcMain.removeHandler(IPC_CHANNELS.DB_UPDATE_FEED_STATUS);
        ipcMain.removeHandler(IPC_CHANNELS.DB_INIT_WORKSPACE);
        ipcMain.removeHandler(IPC_CHANNELS.DB_GET_AI_INDEX_STATUS);
        ipcMain.removeHandler(IPC_CHANNELS.DB_UPDATE_AI_INDEX_STATUS);
        ipcMain.removeHandler(IPC_CHANNELS.DB_DELETE_AI_INDEX_STATUS);

        ipcMain.handle(IPC_CHANNELS.DB_GET_AI_INDEX_STATUS, (_, entryId: string) => this.getAIIndexStatus(entryId));

        ipcMain.handle(IPC_CHANNELS.DB_UPDATE_AI_INDEX_STATUS, (_, status: any) => this.updateAIIndexStatus(status));

        ipcMain.handle(IPC_CHANNELS.DB_DELETE_AI_INDEX_STATUS, (_, entryId: string) => this.deleteAIIndexStatus(entryId));

        ipcMain.handle(IPC_CHANNELS.DB_GET_FEED_ITEMS, (_, feedId: string, limit: number = 200) => {
            if (!this.db) return [];
            try {
                const stmt = this.db.prepare(`
                    SELECT * FROM feed_items 
                    WHERE feedId = ? 
                    ORDER BY pubDate DESC 
                    LIMIT ?
                `);
                return stmt.all(feedId, limit);
            } catch (error) {
                console.error(`[FeedDB] Failed to get feed items for ${feedId}:`, error);
                return [];
            }
        });

        ipcMain.handle(IPC_CHANNELS.DB_SAVE_FEED_ITEMS, (_, feedId: string, items: any[]) => {
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
                console.error(`[FeedDB] Failed to save feed items for ${feedId}:`, error);
                throw error;
            }
        });

        ipcMain.handle(IPC_CHANNELS.DB_GET_FEED_STATUS, () => {
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
                console.error('[FeedDB] Failed to get feed statuses:', error);
                return {};
            }
        });

        ipcMain.handle(IPC_CHANNELS.DB_UPDATE_FEED_STATUS, (_, itemId: string, status: { read?: boolean, relatedEntries?: any[] }) => {
            if (!this.db) return;
            try {
                // First get existing status
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
                console.error(`[FeedDB] Failed to update feed status for ${itemId}:`, error);
                throw error;
            }
        });

        ipcMain.handle(IPC_CHANNELS.DB_INIT_WORKSPACE, (_, newWorkspacePath: string) => {
            console.log(`[FeedDB] Re-initializing for workspace: ${newWorkspacePath}`);
            this.close();
            this.init(newWorkspacePath);
            return true;
        });
    }

    public getAIIndexStatus(entryId: string) {
        if (!this.db) return null;
        try {
            const stmt = this.db.prepare('SELECT * FROM ai_index_status WHERE entryId = ?');
            const row = stmt.get(entryId) as any;
            if (!row) return null;
            return {
                ...row,
                lastIndexed: new Date(row.lastIndexed)
            };
        } catch (error) {
            console.error(`[FeedDB] Failed to get AI index status for ${entryId}:`, error);
            return null;
        }
    }

    public updateAIIndexStatus(status: any) {
        if (!this.db) return;
        try {
            const insert = this.db.prepare(`
                INSERT INTO ai_index_status (entryId, lastIndexed, chunkCount, contentHash, lastError)
                VALUES (@entryId, @lastIndexed, @chunkCount, @contentHash, @lastError)
                ON CONFLICT(entryId) DO UPDATE SET
                    lastIndexed = excluded.lastIndexed,
                    chunkCount = excluded.chunkCount,
                    contentHash = excluded.contentHash,
                    lastError = excluded.lastError
            `);
            insert.run({
                entryId: status.entryId,
                lastIndexed: status.lastIndexed instanceof Date ? status.lastIndexed.toISOString() : status.lastIndexed,
                chunkCount: status.chunkCount,
                contentHash: status.contentHash,
                lastError: status.lastError || null
            });
        } catch (error) {
            console.error(`[FeedDB] Failed to update AI index status:`, error);
            throw error;
        }
    }

    public deleteAIIndexStatus(entryId: string) {
        if (!this.db) return;
        try {
            const stmt = this.db.prepare('DELETE FROM ai_index_status WHERE entryId = ?');
            stmt.run(entryId);
        } catch (error) {
            console.error(`[FeedDB] Failed to delete AI index status for ${entryId}:`, error);
        }
    }
}

export const feedDb = new FeedDatabase();
