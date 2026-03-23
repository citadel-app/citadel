import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

/**
 * Core database — manages workspace-level SQLite for host concerns.
 * Feed tables have moved to the RSS module's main-process entry.
 */
export class CoreDatabase {
    private db: Database.Database | null = null;
    private dbPath: string = '';

    constructor() {}

    public setGuardrail() {
        // Guardrail no longer needed for workspace-level validation
    }
    
    public init(workspacePath: string) {
        if (!workspacePath) {
            console.warn('[CoreDB] Initializing in non-workspace mode => In-memory SQLite');
            this.db = new Database(':memory:');
        } else {
            const codexDir = path.join(workspacePath, '.codex');
            const workspaceJsonPath = path.join(codexDir, 'workspace.json');
            
            if (fs.existsSync(workspaceJsonPath)) {
                const configDir = path.join(codexDir, 'config');
                fs.ensureDirSync(configDir);
                
                this.dbPath = path.join(configDir, 'core.db');
                console.log(`[CoreDB] Initializing SQLite database at: ${this.dbPath}`);
                
                this.db = new Database(this.dbPath);
            } else {
                console.warn('[CoreDB] Not a native Codex workspace => In-memory SQLite');
                this.db = new Database(':memory:');
            }
        }

        this.db.pragma('journal_mode = WAL');
        this.createTables();
    }

    private createTables() {
        if (!this.db) return;

        this.db.exec(`
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
            console.log('[CoreDB] Closing SQLite database');
            this.db.close();
            this.db = null;
        }
    }

    public registerIpcHandlers(registrar: import('@citadel-app/core').MainRegistrar<'@citadel-app/base'>) {
        registrar.handle('db.getAiIndexStatus', async (entryId: string) => this.getAIIndexStatus(entryId));
        registrar.handle('db.updateAiIndexStatus', async (status: any) => this.updateAIIndexStatus(status));
        registrar.handle('db.deleteAiIndexStatus', async (entryId: string) => this.deleteAIIndexStatus(entryId));

        registrar.handle('db.initWorkspace', async (newWorkspacePath: string) => {
            console.log(`[CoreDB] Re-initializing for workspace: ${newWorkspacePath}`);
            this.close();
            this.init(newWorkspacePath);
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
            console.error(`[CoreDB] Failed to get AI index status for ${entryId}:`, error);
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
            console.error(`[CoreDB] Failed to update AI index status:`, error);
            throw error;
        }
    }

    public deleteAIIndexStatus(entryId: string) {
        if (!this.db) return;
        try {
            const stmt = this.db.prepare('DELETE FROM ai_index_status WHERE entryId = ?');
            stmt.run(entryId);
        } catch (error) {
            console.error(`[CoreDB] Failed to delete AI index status for ${entryId}:`, error);
        }
    }
}

export const coreDb = new CoreDatabase();
