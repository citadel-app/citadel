import { db, type CodexEntry } from './db';
import { fs } from './file-system';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';
import { 
    DEFAULT_WORKSPACE_CONFIG, 
    type WorkspaceConfig, 
    humanizeFilename, 
    APP_CONSTANTS,
    TOP_LEVEL_FIELDS,
    SYNC_VERSION,
    sanitizeMetadata,
    generateDefaultReadme,
    DEFAULT_GIT_IGNORE
} from '@shared';
import { ragService } from '../ai';

// SYNC_VERSION and TOP_LEVEL_FIELDS are now imported from @shared

export class DataManager {
    private rootPath: string = '';
    private config: WorkspaceConfig = DEFAULT_WORKSPACE_CONFIG;
    private isSyncing: boolean = false;

    // sanitizeMetadata is now imported from @shared

    async init(customPath?: string) {
        // 1. Determine Root Path
        if (customPath) {
            this.rootPath = customPath;
        } else {
            const context = await window.api.app.getInitContext();
            this.rootPath = context.workspacePath || '';
        }
        
        
        if (!this.rootPath) {
            console.error('[DataManager] CRITICAL: No workspace path detected. File operations disabled.');
            return;
        }

        // Safety: Ensure rootPath is absolute (basic check)
        // If rootPath is empty string, we already returned.
        const isWindowsAbsolute = /^[a-zA-Z]:/.test(this.rootPath);
        const isPosixAbsolute = this.rootPath.startsWith('/');
        
        if (!isWindowsAbsolute && !isPosixAbsolute) {
             console.error(`[DataManager] Invalid rootPath: ${this.rootPath}. Must be absolute.`);
             this.rootPath = ''; // Disable
             return;
        }

        console.log('[DataManager] Initialized with absolute root:', this.rootPath);
        localStorage.setItem('codex-vault-path', this.rootPath);
        
        // Initialize Database for this specific workspace
        const { initDatabase } = await import('./db');
        initDatabase(this.rootPath);
        
        // Initialize SQLite Feed Database via Main Process
        try {
            await window.api.db.initWorkspace(this.rootPath);
        } catch (dbInitErr: any) {
            console.error('[DataManager] Failed to initialize SQLite feed database:', dbInitErr);
            this.notify('error', `Failed to initialize feed database: ${dbInitErr.message || dbInitErr}`);
        }

        await this.loadConfig(DEFAULT_WORKSPACE_CONFIG);
        
        // Only enforce directory structure if this is explicitly a Codex workspace.
        // We detect this by checking if .codex/workspace.json exists.
        // Otherwise, we shouldn't spray folders into random cloned git repos.
        const configPath = `${this.rootPath}/.codex/workspace.json`;
        if (await fs.exists(configPath)) {
            const folders = Object.values(this.config.entries).map(c => c.folder);
            await fs.ensureVaultStructure(this.rootPath, folders);
        } else {
            console.log('[DataManager] Not a native Codex workspace. Skipping folder creation.');
        }

        await this.syncFsToDb();

        // Start watching for changes
        await window.api.fs.watchPath(this.rootPath);
        window.api.fs.onFileChanged((event) => this.handleFileChange(event));
    }

    async createWorkspace(path: string, config: WorkspaceConfig) {
        this.rootPath = path;
        console.log('[DataManager] Creating workspace at:', path);
        
        // 1. Ensure .codex and folders exist
        const folders = Object.values(config.entries).map(c => c.folder);
        await fs.ensureVaultStructure(path, folders);

        // 2. Write the preset config
        await this.saveConfig(config);

        // 3. Generate default template files (README.md, .gitignore)
        await this.generateTemplateFiles(path, config);

        // 4. Initialize normally
        await this.init(path);
    }

    private async generateTemplateFiles(rootPath: string, config: WorkspaceConfig) {
        const workspaceName = rootPath.replace(/\\/g, '/').split('/').pop() || 'Workspace';

        // --- README.md ---
        const readmePath = rootPath.replace(/\\/g, '/') + '/README.md';
        const readmeExists = await fs.exists(readmePath);
        
        let readmeContent = '';
        if (readmeExists) {
            readmeContent = await fs.readFile(readmePath);
        } else {
            readmeContent = generateDefaultReadme(rootPath, config);
            await fs.writeFile(readmePath, readmeContent);
            console.log('[DataManager] Created README.md');
        }

        // --- .gitignore ---
        const gitignorePath = rootPath.replace(/\\/g, '/') + '/.gitignore';
        const gitignoreExists = await fs.exists(gitignorePath);
        
        if (!gitignoreExists) {
            await fs.writeFile(gitignorePath, DEFAULT_GIT_IGNORE);
            console.log('[DataManager] Created .gitignore');
        }
    }

    getRootPath() {
        return this.rootPath;
    }

    getConfig(): WorkspaceConfig {
        return this.config;
    }

    // 1. Scan FS -> Update DB (One-way sync on startup/refresh)
    async syncFsToDb() {
        if (this.isSyncing) {
            console.warn('[DataManager] Sync already in progress, skipping...');
            return;
        }

        this.isSyncing = true;
        try {
            console.log('Syncing FS to DB...');
            let allEntries: CodexEntry[] = [];
            const startTime = Date.now();

            // Fetch all existing entries once to avoid per-file DB queries
            const existingEntriesArr = await db.entries.toArray();
            const entryMap = new Map(existingEntriesArr.map(e => [e.id, e]));
            const pathMap = new Map(existingEntriesArr.map(e => [e.filePath, e]));

            // Strictly scan only folders defined in the config
            const folderConfigs = Object.values(this.config.entries);
            const foldersToScan = folderConfigs.map(c => ({ folder: c.folder, type: c.type }));

            const folderTasks = foldersToScan.map(async ({ folder: folderName, type }) => {
                const folderPath = folderName === '.' ? this.rootPath : `${this.rootPath}/${folderName}`;
                
                if (!(await fs.exists(folderPath))) return [];

                const files = await fs.readDirectory(folderPath);
                // Filter for .md and ignore hidden files/folders
                const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
                
                if (mdFiles.length === 0) return [];
                console.log(`[DataManager] Syncing folder: ${folderName} (${mdFiles.length} files)`);

                // Parallelize file processing within each folder
                const fileTasks = mdFiles.map(async (file) => {
                    try {
                        const filePath = `${folderPath}/${file}`;
                        
                        // 1. Optimized Check: Use stat to check mtime
                        const stats = await fs.stat(filePath);
                        
                        // Use Map lookup instead of DB get
                        const fallbackId = file.replace('.md', '');
                        let existingEntry = entryMap.get(fallbackId) || pathMap.get(filePath);
                        
                        // Check if we can skip reading this file
                        const storedSyncVersion = parseInt(localStorage.getItem('codex-sync-version') || '0');
                        const isUpToDate = existingEntry && 
                                         existingEntry.updatedAt && 
                                         new Date(existingEntry.updatedAt).getTime() >= stats.mtimeMs &&
                                         storedSyncVersion === (SYNC_VERSION as number);

                        if (isUpToDate) {
                            return existingEntry;
                        }

                        // 2. Read and Parse if changed (or new)
                        const content = await fs.readFile(filePath);
                        let parsed;
                        try {
                            parsed = matter(content);
                        } catch (yamlErr) {
                            console.error(`[DataManager] YAML Parse Error in ${file}:`, yamlErr);
                            // Fallback: minimal valid structure
                            parsed = { data: {}, content: content };
                        }
                        const { data, content: markdownBody } = parsed;
                        
                        // Support manual files without IDs
                        if (!data.id) {
                            data.id = fallbackId;
                        }

                        let needsRewrite = false;

                        // ENSURE ABSOLUTE PATH (important for protocol and portability)
                        let absoluteEntryPath = filePath;
                        const isWindowsAbsolute = /^[a-zA-Z]:/.test(filePath);
                        const isPosixAbsolute = filePath.startsWith('/');
                        
                        if (!isWindowsAbsolute && !isPosixAbsolute) {
                            // If it's relative, anchor it to rootPath
                            absoluteEntryPath = `${this.rootPath}/${filePath}`.replace(/\/\//g, '/');
                            console.log(`[DataManager] Migrated relative path to absolute: ${absoluteEntryPath}`);
                        }

                        const externalData = await this.readExternalMetadata(absoluteEntryPath, data);
                        
                        // Migrations for metadata sections if they leaked in
                        if (data.frontmatter) {
                             delete data.frontmatter;
                             needsRewrite = true;
                        }

                        if (needsRewrite) {
                            try {
                                const cleanedContent = matter.stringify(markdownBody, sanitizeMetadata(data));
                                await fs.writeFile(absoluteEntryPath, cleanedContent);
                            } catch (writeErr) {
                                console.error(`[DataManager] Failed to rewrite cleaned content for ${file}:`, writeErr);
                            }
                        }

                        const entry: CodexEntry = {
                            id: data.id,
                            title: data.title || file.replace('.md', ''),
                            type: data.type || type,
                            tags: data.tags || [],
                            filePath: absoluteEntryPath,
                            createdAt: data.created || new Date().toISOString(),
                            updatedAt: data.updated || new Date().toISOString(),
                            frontmatter: data,
                            content: markdownBody,
                            highlights: externalData.highlights || [],
                            whiteboard: externalData.board,
                            code: externalData.code
                        };

                        for (const field of TOP_LEVEL_FIELDS) {
                            if (data[field] !== undefined) {
                                (entry as any)[field] = data[field];
                            }
                        }

                        return entry;
                    } catch (e) {
                        console.error(`[DataManager] Failed to sync ${file}:`, e);
                        return null;
                    }
                });

                const results = await Promise.all(fileTasks);
                return results.filter((e): e is CodexEntry => e !== null);
            });

            const resultsByFolder = await Promise.all(folderTasks);
            allEntries = resultsByFolder.flat();
            
            // Bulk update DB
            await db.entries.bulkPut(allEntries);
            
            // Cleanup orphans
            const syncedIds = new Set(allEntries.map(e => e.id));
            const allDbEntries = await db.entries.toArray();
            const orphanedIds = allDbEntries
                .filter(e => !syncedIds.has(e.id))
                .map(e => e.id);
            
            if (orphanedIds.length > 0) {
                console.log(`[DataManager] Removing ${orphanedIds.length} orphans`);
                await db.entries.bulkDelete(orphanedIds);
                await db.indexStatus.bulkDelete(orphanedIds);
            }
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[DataManager] Synced ${allEntries.length} entries in ${duration}s.`);
            localStorage.setItem('codex-sync-version', SYNC_VERSION.toString());
        } catch (err: any) {
            console.error('[DataManager] Sync failed:', err);
            this.notify('error', `FS -> DB Sync failed: ${err.message || err}`);
        } finally {
            this.isSyncing = false;
        }
    }

    // 2. Create New Entry (UI -> DB -> FS)
    async createEntry(entry: Partial<CodexEntry> & { title: string, type: CodexEntry['type'] }) {
        const id = uuidv4();
        let entryConfig = this.config.entries[entry.type];
        
        if (!entryConfig) {
            console.warn(`[DataManager] Unknown type: ${entry.type}. Falling back to default.`);
            // Fallback to paper or standard if available, otherwise just use a generic config
            entryConfig = this.config.entries['standard'] || Object.values(this.config.entries)[0];
        }
        
        const folder = entryConfig?.folder || '00_Uncategorized';

        const filename = humanizeFilename(entry.title) + '.md';
        const folderPath = `${this.rootPath}/${folder}`;
        const filePath = `${folderPath}/${filename}`;
        
        console.log(`[DataManager] Creating entry: root="${this.rootPath}", folder="${folder}", file="${filename}"`);
        console.log(`[DataManager] Full absolute path: "${filePath}"`);
        
        await fs.createDirectory(folderPath);
        const now = new Date().toISOString();

        // 1. Construct Frontmatter (The Source of Truth for core fields)
        // Separate externalized fields if passed in
        const { highlights, whiteboard, code, ...otherData } = entry;
        const { frontmatter: incomingFM, ...directFM } = otherData as any;

        const frontmatter = {
            id,
            title: entry.title,
            type: entry.type,
            tags: entry.tags || [],
            created: now,
            updated: now,
            ...(incomingFM || {}),
            ...directFM
        };

        // Ensure externalized fields are NOT in frontmatter
        delete (frontmatter as any).highlights;
        delete (frontmatter as any).whiteboard;
        delete (frontmatter as any).code;

        // 2. Construct DB Entry
        const newEntry: CodexEntry = {
            id,
            title: entry.title,
            type: entry.type,
            tags: entry.tags || [],
            filePath,
            createdAt: now,
            updatedAt: now,
            frontmatter,
            highlights: highlights || [],
            whiteboard,
            code
        };

        // Handle External Storage
        if (highlights) {
            const id = await this.writeExternalMetadata(filePath, 'highlights', highlights);
            (frontmatter as any).highlightsId = id;
            newEntry.highlights = highlights;
        }
        if (whiteboard) {
            const id = await this.writeExternalMetadata(filePath, 'board', whiteboard);
            (frontmatter as any).whiteboardId = id;
            newEntry.whiteboard = whiteboard;
        }
        if (code) {
            const id = await this.writeExternalMetadata(filePath, 'code', code);
            (frontmatter as any).codeId = id;
            newEntry.code = code;
        }

        // Dynamic promotion of fields from frontmatter/entry args to top-level
        // We check both the direct entry arg (legacy/explicit) AND the frontmatter
        for (const field of TOP_LEVEL_FIELDS) {
            // @ts-ignore - dynamic indexing
            const value = entry[field] || frontmatter[field];
            if (value !== undefined) {
                // @ts-ignore - dynamic assignment
                newEntry[field] = value;
                // Ensure it's in frontmatter too if it wasn't already
                // @ts-ignore
                frontmatter[field] = value; 
            }
        }

        // Write to FS first (source of truth)
        const fileContent = matter.stringify(entry.content || '', sanitizeMetadata(frontmatter));
        await fs.writeFile(filePath, fileContent);

        // Update DB
        await db.entries.put(newEntry);
        
        return newEntry;
    }

    // 3. Update Entry (UI -> DB -> FS)
    async updateEntry(id: string, updates: Partial<CodexEntry>) {
        console.log('[DataManager] updateEntry', id, Object.keys(updates));
        const entry = await db.entries.get(id);
        if (!entry) throw new Error('Entry not found');

        // Separate externalized fields
        const { highlights, whiteboard, code, ...otherUpdates } = updates;
        const { frontmatter: updateFrontmatter, ...remainingUpdates } = otherUpdates as any;

        const updatedEntry = { ...entry, ...remainingUpdates, updatedAt: new Date().toISOString() };
        
        // Update Frontmatter object - Merge existing + updates + extracted frontmatter updates
        // We MUST EXCLUDE the large externalized objects from frontmatter if they were passed there
        updatedEntry.frontmatter = {
            ...updatedEntry.frontmatter,
            ...remainingUpdates,
            ...(updateFrontmatter || {}), // Merge any explicit frontmatter updates
            updated: updatedEntry.updatedAt
        };

        // Clean up externalized fields from frontmatter if they leaked in
        delete updatedEntry.frontmatter.highlights;
        delete updatedEntry.frontmatter.whiteboard;
        delete updatedEntry.frontmatter.code;

        // Update in-memory entry fields (for DB)
        if (highlights) updatedEntry.highlights = highlights;
        if (whiteboard) updatedEntry.whiteboard = whiteboard;
        if (code) updatedEntry.code = code;

        // Handle External Storage
        if (highlights) {
            const id = await this.writeExternalMetadata(entry.filePath, 'highlights', highlights, updatedEntry.frontmatter.highlightsId);
            updatedEntry.frontmatter.highlightsId = id;
        }
        if (whiteboard) {
            const id = await this.writeExternalMetadata(entry.filePath, 'board', whiteboard, updatedEntry.frontmatter.whiteboardId);
            updatedEntry.frontmatter.whiteboardId = id;
        }
        if (code) {
            const id = await this.writeExternalMetadata(entry.filePath, 'code', code, updatedEntry.frontmatter.codeId);
            updatedEntry.frontmatter.codeId = id;
        }

        // Safety: Ensure we don't nest frontmatter inside frontmatter
        if (updatedEntry.frontmatter.frontmatter) {
            delete updatedEntry.frontmatter.frontmatter;
        }

        // Write to FS
        // Use provided content or read existing body
        let body = updates.content;
        
        if (body !== undefined) {
             // If content is provided, ensure we don't double-wrap frontmatter
             // This protects against callers passing full file content instead of just body
             const trimmed = body.trim();
             if (trimmed.startsWith('---')) {
                 try {
                     const parsed = matter(body);
                     if (Object.keys(parsed.data).length > 0) {
                         console.warn('[DataManager] updateEntry received content with frontmatter. Stripping to avoid double-wrap.');
                         body = parsed.content;
                     }
                 } catch (e) {
                     console.error('[DataManager] Error parsing body frontmatter in updateEntry:', e);
                     // If it fails, we assume the whole body is just content
                 }
             }
        } else {
             try {
                 const currentContent = await fs.readFile(entry.filePath);
                 const parsed = matter(currentContent);
                 body = parsed.content;
             } catch (e) {
                 console.error(`[DataManager] Failed to read existing content for ${entry.id}`, e);
                 body = ''; // Fallback to empty to allow metadata update to succeed
             }
        }
        
        try {
            const newFileContent = matter.stringify(body || '', sanitizeMetadata(updatedEntry.frontmatter));
            await fs.writeFile(entry.filePath, newFileContent);
        } catch (saveErr) {
            console.error(`[DataManager] Failed to save entry to FS:`, saveErr);
            throw new Error(`Failed to save entry: ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`);
        }

        // Update DB
        await db.entries.put(updatedEntry);
        console.log('[DataManager] updateEntry complete');
    }

    // Batch Update Metadata/Tags across multiple entries
    async batchUpdateMetadata(entryIds: string[], operation: { 
        type: 'rename' | 'add' | 'remove' | 'replace', 
        targetField: string, // e.g. 'tags', 'companies', 'difficulty'
        oldValue?: string, 
        newValue?: string, 
        value?: string,
        values?: string[]
    }) {
        console.log('[DataManager] batchUpdateMetadata', { count: entryIds.length, operation });
        const { targetField } = operation;
        
        const entries = await db.entries.bulkGet(entryIds);
        const validEntries = entries.filter((e): e is CodexEntry => e !== undefined);
        const updatedEntries: CodexEntry[] = [];
        const fsTasks: Promise<void>[] = [];

        for (const entry of validEntries) {
            const isArrayField = Array.isArray(entry[targetField as keyof CodexEntry]) || 
                               Array.isArray(entry.frontmatter?.[targetField]) ||
                               targetField === 'tags' || targetField === 'companies';

            let updatedValue: any;

            if (isArrayField) {
                let currentTags = [...(entry.frontmatter?.[targetField] || entry[targetField as keyof CodexEntry] || [])];
                if (!Array.isArray(currentTags)) currentTags = currentTags ? [currentTags] : [];

                switch (operation.type) {
                    case 'rename':
                        if (operation.oldValue && operation.newValue) {
                            currentTags = currentTags.map(t => t === operation.oldValue ? operation.newValue! : t);
                        }
                        break;
                    case 'add':
                        if (operation.value && !currentTags.includes(operation.value)) {
                            currentTags.push(operation.value);
                        } else if (operation.values) {
                            operation.values.forEach(v => {
                                if (!currentTags.includes(v)) currentTags.push(v);
                            });
                        }
                        break;
                    case 'remove':
                        if (operation.value) {
                            currentTags = currentTags.filter(t => t !== operation.value);
                        } else if (operation.values) {
                            const toRemove = new Set(operation.values);
                            currentTags = currentTags.filter(t => !toRemove.has(t));
                        }
                        break;
                    case 'replace':
                        if (operation.values) currentTags = operation.values;
                        break;
                }
                updatedValue = Array.from(new Set(currentTags)).filter(Boolean);
            } else {
                switch (operation.type) {
                    case 'rename':
                    case 'replace':
                        updatedValue = operation.newValue || operation.value || null;
                        break;
                    case 'remove':
                        updatedValue = null;
                        break;
                }
            }

            // Apply updates
            const now = new Date().toISOString();
            const updatedEntry: CodexEntry = {
                ...entry,
                [targetField]: updatedValue,
                updatedAt: now,
                frontmatter: {
                    ...entry.frontmatter,
                    [targetField]: updatedValue,
                    updated: now
                }
            };

            // Promotion to top-level if needed
            if (targetField === 'tags' || targetField === 'title') {
                (updatedEntry as any)[targetField] = updatedValue;
            }

            updatedEntries.push(updatedEntry);

            // Prepare FS task
            const fileContent = matter.stringify(entry.content || '', updatedEntry.frontmatter);
            fsTasks.push(fs.writeFile(entry.filePath, fileContent));
        }

        // Execute bulk DB and parallel FS
        if (updatedEntries.length > 0) {
            await Promise.all([
                db.entries.bulkPut(updatedEntries),
                ...fsTasks
            ]);
        }
        this.notify('metadata-updated', { count: entryIds.length, field: targetField });
    }
    // 4. Update Content Only (Editor -> DB -> FS)
    async updateContent(id: string, content: string) {
        const entry = await db.entries.get(id);
        if (!entry) throw new Error('Entry not found');

        const updatedEntry = { 
            ...entry, 
            content, 
            updatedAt: new Date().toISOString() 
        };

        // Write to FS
        // Combine existing frontmatter with NEW content
        const newFileContent = matter.stringify(content, entry.frontmatter);
        await fs.writeFile(entry.filePath, newFileContent);

        // Update DB
        await db.entries.put(updatedEntry);
    }
    // 5. Save Asset (Binary)
    async saveAsset(entryId: string, file: File): Promise<string> {
        console.log(`[DataManager] saveAsset for entry: ${entryId}, file: ${file.name}`);
        const entry = await db.entries.get(entryId);
        if (!entry) throw new Error('Entry not found');

        // Ensure we have a valid filePath to anchor from
        if (!entry.filePath) {
            console.error(`[DataManager] Entry ${entryId} has no filePath! Cannot save asset reliably.`);
            throw new Error('Entry lacks filePath');
        }

        const uint8Array = new Uint8Array(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'png';
        
        console.log(`[DataManager] Entry filePath: ${entry.filePath}`);

        // Parent dir calculation: Normalize to forward slashes first
        const normalizedPath = entry.filePath.replace(/\\/g, '/');
        const folderPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        const assetsDir = `${folderPath}/${APP_CONSTANTS.PATHS.ASSETS_DIR}`;
        
        console.log(`[DataManager] Calculated assetsDir: ${assetsDir}`);

        await fs.createDirectory(assetsDir);
        
        const assetName = `${uuidv4()}.${ext}`;
        const assetPath = `${assetsDir}/${assetName}`;
        
        console.log(`[DataManager] Final asset destination: ${assetPath}`);

        try {
            await fs.writeAsset(assetPath, uint8Array);
            console.log(`[DataManager] Asset write SUCCESS`);
        } catch (error) {
            console.error(`[DataManager] Asset write FAILED: ${assetPath}`, error);
            throw error;
        }
        
        return `./${APP_CONSTANTS.PATHS.ASSETS_DIR}/${assetName}`;
    }

    // --- Event System ---
    private listeners: ((event: string, data: any) => void)[] = [];

    subscribe(listener: (event: string, data: any) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(event: string, data: any) {
        this.listeners.forEach(l => l(event, data));
    }

    // --- Integrity Helpers ---

    /**
     * Scans all entries and removes any related links that match the given target IDs.
     * Optionally filters by link type (e.g., 'rss-item').
     */
    async removeRelatedLinks(targetIds: string[], type?: string) {
        if (targetIds.length === 0) return;
        const targetSet = new Set(targetIds);
        
        console.log(`[DataManager] removeRelatedLinks scanning for ${targetIds.length} targets...`);

        // We need to scan all entries. DB is fastest source for query, but FS is source of truth.
        // Let's use DB to find candidates if possible, or just scan all since we don't index relatedLinks content deeply yet.
        // For now, scan all entries is safest.
        const allEntries = await db.entries.toArray();
        let changedCount = 0;

        for (const entry of allEntries) {
            let modified = false;
            
            // Check top-level relatedLinks (if promoted)
            // AND check frontmatter relatedLinks
            // They should be synced, but let's look at frontmatter as primary source for edit.
            
            const links = entry.frontmatter.relatedLinks || [];
            if (!Array.isArray(links) || links.length === 0) continue;

            const newLinks = links.filter((link: any) => {
                const moves = targetSet.has(link.id);
                const typeMatches = type ? link.type === type : true;
                if (moves && typeMatches) {
                    modified = true;
                    return false; // Remove it
                }
                return true; // Keep it
            });

            if (modified) {
                console.log(`[DataManager] Removing broken links from entry ${entry.id} (${entry.title})`);
                await this.updateMetadata(entry.id, { relatedLinks: newLinks });
                changedCount++;
            }
        }
        console.log(`[DataManager] removeRelatedLinks complete. Updated ${changedCount} entries.`);
    }

    // 6. Delete Entry
    async deleteEntry(id: string) {
        const entry = await db.entries.get(id);
        if (!entry) return; // Already deleted or not found

        console.log(`[DataManager] Deleting entry ${id} at ${entry.filePath}`);

        // 1. Clean up references TO this entry in other entries
        await this.removeRelatedLinks([id]);

        // 2. Deep Cleanup: External Metadata Files
        const normalizedPath = entry.filePath.replace(/\\/g, '/');
        const entryDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        
        const externalMappings = [
            { id: entry.frontmatter.highlightsId, dir: APP_CONSTANTS.PATHS.HIGHLIGHTS_DIR },
            { id: entry.frontmatter.whiteboardId, dir: APP_CONSTANTS.PATHS.BOARD_DIR },
            { id: entry.frontmatter.codeId, dir: APP_CONSTANTS.PATHS.CODE_DIR }
        ];

        for (const mapping of externalMappings) {
            if (mapping.id) {
                const path = `${entryDir}/${mapping.dir}/${mapping.id}.json`;
                if (await fs.exists(path)) {
                    console.log(`[DataManager] Deleting external metadata: ${path}`);
                    await fs.deleteFile(path);
                }
            }
        }

        // 2.5 Clean up Entry Files (Arbitrary files like solutions/)
        // We delete the ENTIRE entry file, but we should also check if there are subfolders for this entry?
        // Current design: Entry is a FILE. Arbitrary files are usually in common dirs or sidecar.
        // If we implement 'solutions/' folder, we need to know where it is.
        // For now, let's assume valid file deletion handles the main content.
        // If we move to Folder-based entries later, this needs update.

        // 3. Delete file from FS
        if (await fs.exists(entry.filePath)) {
            await fs.deleteFile(entry.filePath);
        }

        // 4. Delete from DB
        await db.entries.delete(id);

        // 5. Delete RAG index
        await ragService.deleteEntryIndex(id);

        // 6. Notify listeners (e.g. RSS Context) to clean up external references
        this.notify('entry-deleted', id);
    }

    // --- Arbitrary File Management for Entries ---

    /**
     * Resolves the folder path for an entry.
     */
    private getEntryFolder(entryPath: string): string {
        const normalizedPath = entryPath.replace(/\\/g, '/');
        return normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    }

    /**
     * Writes an arbitrary file associated with an entry.
     * @param entryId The ID of the entry
     * @param relativePath Relative path within the entry's folder (e.g., "solutions/sol-1.py")
     * @param content Text content to write
     */
    async writeEntryFile(entryId: string, relativePath: string, content: string): Promise<string> {
        const entry = await db.entries.get(entryId);
        if (!entry) throw new Error(`Entry ${entryId} not found`);

        const folder = this.getEntryFolder(entry.filePath);
        const fullPath = `${folder}/${relativePath}`;

        // Ensure parent directory exists
        const fileDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (!(await fs.exists(fileDir))) {
            await fs.createDirectory(fileDir);
        }

        await fs.writeFile(fullPath, content);
        return fullPath;
    }

    /**
     * Reads an arbitrary file associated with an entry.
     * @param entryId The ID of the entry
     * @param relativePath Relative path within the entry's folder
     */
    async readEntryFile(entryId: string, relativePath: string): Promise<string> {
        const entry = await db.entries.get(entryId);
        if (!entry) throw new Error(`Entry ${entryId} not found`);

        const folder = this.getEntryFolder(entry.filePath);
        const fullPath = `${folder}/${relativePath}`;

        if (!(await fs.exists(fullPath))) {
            throw new Error(`File not found: ${fullPath}`);
        }

        return await fs.readFile(fullPath);
    }

    /**
     * Lists files in a subfolder relative to the entry.
     * @param entryId The ID of the entry
     * @param subfolder Relative subfolder path (e.g., "solutions")
     */
    async listEntryFiles(entryId: string, subfolder: string): Promise<string[]> {
        const entry = await db.entries.get(entryId);
        if (!entry) throw new Error(`Entry ${entryId} not found`);

        const folder = this.getEntryFolder(entry.filePath);
        const fullPath = `${folder}/${subfolder}`;

        if (!(await fs.exists(fullPath))) {
            return [];
        }

        return await fs.readDirectory(fullPath);
    }

    /**
     * Renames an arbitrary file associated with an entry.
     * @param entryId The ID of the entry
     * @param oldRelativePath Current relative path within the entry's folder
     * @param newRelativePath New relative path within the entry's folder
     */
    async renameEntryFile(entryId: string, oldRelativePath: string, newRelativePath: string): Promise<string> {
        const entry = await db.entries.get(entryId);
        if (!entry) throw new Error(`Entry ${entryId} not found`);

        const folder = this.getEntryFolder(entry.filePath);
        const oldPath = `${folder}/${oldRelativePath}`;
        const newPath = `${folder}/${newRelativePath}`;

        if (!(await fs.exists(oldPath))) {
            throw new Error(`Source file not found: ${oldPath}`);
        }

        // Ensure parent directory for new path exists
        const fileDir = newPath.substring(0, newPath.lastIndexOf('/'));
        if (!(await fs.exists(fileDir))) {
            await fs.createDirectory(fileDir);
        }

        await fs.rename(oldPath, newPath);
        return newPath;
    }

    /**
     * Deletes an arbitrary file associated with an entry.
     * @param entryId The ID of the entry
     * @param relativePath Relative path within the entry's folder
     */
    async deleteEntryFile(entryId: string, relativePath: string): Promise<void> {
        const entry = await db.entries.get(entryId);
        if (!entry) throw new Error(`Entry ${entryId} not found`);

        const folder = this.getEntryFolder(entry.filePath);
        const fullPath = `${folder}/${relativePath}`;

        if (await fs.exists(fullPath)) {
            await fs.deleteFile(fullPath);
        }
    }
    async updateMetadata(id: string, metadata: Partial<any>) {
        const entry = await db.entries.get(id);
        if (!entry) throw new Error('Entry not found');

        // Separate externalized fields
        const { highlights, whiteboard, code, ...otherMetadata } = metadata;

        // Merge Metadata
        const updatedFrontmatter = { ...entry.frontmatter, ...otherMetadata, updated: new Date().toISOString() };
        
        // Ensure externalized fields are NOT in frontmatter
        delete updatedFrontmatter.highlights;
        delete updatedFrontmatter.whiteboard;
        delete updatedFrontmatter.code;

        // Update Entry Object
        const updatedEntry = { 
            ...entry, 
            frontmatter: updatedFrontmatter,
            updatedAt: updatedFrontmatter.updated
        };

        // Map externalized fields to top-level if provided
        if (highlights) updatedEntry.highlights = highlights;
        if (whiteboard) updatedEntry.whiteboard = whiteboard;
        if (code) updatedEntry.code = code;

        // Handle External Storage
        if (highlights) {
            const id = await this.writeExternalMetadata(entry.filePath, 'highlights', highlights, updatedEntry.frontmatter.highlightsId);
            updatedEntry.frontmatter.highlightsId = id;
        }
        if (whiteboard) {
            const id = await this.writeExternalMetadata(entry.filePath, 'board', whiteboard, updatedEntry.frontmatter.whiteboardId);
            updatedEntry.frontmatter.whiteboardId = id;
        }
        if (code) {
            const id = await this.writeExternalMetadata(entry.filePath, 'code', code, updatedEntry.frontmatter.codeId);
            updatedEntry.frontmatter.codeId = id;
        }

        // Map specific system fields
        if (metadata.title) updatedEntry.title = metadata.title;
        if (metadata.tags) updatedEntry.tags = metadata.tags;

        // Dynamic promotion for indexed fields
        for (const field of TOP_LEVEL_FIELDS) {
            // @ts-ignore
            if (metadata[field] !== undefined) {
                // @ts-ignore
                updatedEntry[field] = metadata[field];
            }
        }

        // Write to FS
        // Handle content preservation
        let content = entry.content;
        if (content === undefined) {
             const fileContent = await fs.readFile(entry.filePath);
             content = matter(fileContent).content;
        }

        const newFileContent = matter.stringify(content || '', updatedFrontmatter);
        await fs.writeFile(entry.filePath, newFileContent);

        // Update DB
        await db.entries.put(updatedEntry);
    }

    /**
     * Removes a related link from an entry.
     * If the target is another Codex Entry, it also removes the backlink (bidirectional).
     */
    async removeRelatedLink(sourceId: string, targetLinkId: string) {
        console.log(`[DataManager] Removing link ${targetLinkId} from ${sourceId}`);
        const sourceEntry = await db.entries.get(sourceId);
        if (!sourceEntry) throw new Error('Source entry not found');

        // 1. Remove from Source
        const currentLinks = sourceEntry.relatedLinks || [];
        const newLinks = currentLinks.filter(l => l.id !== targetLinkId);
        
        // Only update if changed
        if (newLinks.length !== currentLinks.length) {
            await this.updateMetadata(sourceId, { relatedLinks: newLinks });
        }

        // 2. Check if Target is a Codex Entry to remove backlink
        const targetEntry = await db.entries.get(targetLinkId);
        if (targetEntry) {
            console.log(`[DataManager] Target is a Codex Entry (${targetEntry.title}). Removing backlink...`);
            const targetLinks = targetEntry.relatedLinks || [];
            const newTargetLinks = targetLinks.filter(l => l.id !== sourceId);

            if (newTargetLinks.length !== targetLinks.length) {
                await this.updateMetadata(targetLinkId, { relatedLinks: newTargetLinks });
                console.log(`[DataManager] Backlink removed from ${targetEntry.id}`);
            }
        }
    }
    // 8. Configuration Management
    async loadConfig(defaultConfig: WorkspaceConfig): Promise<WorkspaceConfig> {
        if (!this.rootPath) {
            console.warn('[DataManager] loadConfig called without rootPath. Returning default.');
            return defaultConfig;
        }
        const configDir = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`;
        const configPath = `${configDir}/${APP_CONSTANTS.PATHS.CONFIG_FILE}`;
        
        // Ensure .codex exists
        await fs.createDirectory(configDir);

        if (await fs.exists(configPath)) {
            try {
                const content = await fs.readFile(configPath);
                let loaded = JSON.parse(content);
                
                // MIGRATION / VALIDATION: 
                // If the loaded config looks like a record of EntryTypeConfig (old schema) 
                // and DOES NOT have an 'entries' key, we must restructure it.
                // Or if it's completely empty or invalid.
                
                let isLegacy = false;
                if (!loaded.entries && !loaded.settings) {
                    // Likely old schema: Record<string, EntryTypeConfig>
                    // We treat the whole object as 'entries'
                    console.log('[DataManager] Detected legacy config structure. Migrating...');
                    loaded = {
                        entries: loaded,
                        settings: {}
                    };
                    isLegacy = true;
                }

                // Merge with defaults to ensure all fields exist
                // Merge with defaults to ensure all fields exist
                const mergedConfig: WorkspaceConfig = {
                    entries: {}, // Start fresh for entries
                    settings: { ...defaultConfig.settings, ...loaded.settings },
                    modules: { ...defaultConfig.modules, ...loaded.modules }
                };

                // Merge entries: Only take what's in 'loaded.entries'
                // but merge them with defaultConfig values for structural completeness
                if (loaded.entries) {
                    for (const [key, value] of Object.entries(loaded.entries)) {
                        // @ts-ignore
                        mergedConfig.entries[key] = {
                            // @ts-ignore
                            ...(defaultConfig.entries[key] || {}), // Get defaults if any
                            // @ts-ignore
                            ...value
                        };
                    }
                } else {
                    // Fallback to all defaults if entries missing altogether (unlikely but safe)
                    mergedConfig.entries = { ...defaultConfig.entries };
                }

                // Update internal state but do NOT save back to disk unless explicitly requested
                // This ensures the JSON file remains the "Pure Source of Truth" without injection.
                /*
                const originalStr = JSON.stringify(JSON.parse(content));
                const newStr = JSON.stringify(mergedConfig);
                
                if (isLegacy || originalStr !== newStr) {
                    console.log('[DataManager] Config structure updated. Saving to disk...');
                    await this.saveConfig(mergedConfig);
                }
                */

                this.config = mergedConfig;
                return mergedConfig;
            } catch (e) {
                console.error('Failed to parse workspace.json, falling back to default', e);
                // Backup corrupted config
                await fs.writeFile(`${configPath}.bak`, await fs.readFile(configPath));
            }
        }

        // Write default config
        // Removed: `await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));`
        // We DO NOT want to write configuration to disk unless the user explicitly 
        // chooses to create a workspace here. Returning it in memory is sufficient.
        console.log('[DataManager] No config found, returning default config in memory.');
        this.config = defaultConfig;
        return defaultConfig;
    }

    async saveConfig(config: WorkspaceConfig): Promise<void> {
        if (!this.rootPath) return;
        const configPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.CONFIG_FILE}`;
        await fs.createDirectory(`${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        this.config = config; // Update internal state
    }

    // 9. RSS Feeds Management
    async loadFeeds(): Promise<any[] | null> {
        if (!this.rootPath) return [];
        const feedsPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.FEED_FILE}`;
        const legacyFeedsPath = `${this.rootPath}/00_Meta/feeds.json`;
        // Migration: Check legacy if missing
        if (!(await fs.exists(feedsPath)) && (await fs.exists(legacyFeedsPath))) {
             console.log('[DataManager] Migrating feeds from 00_Meta...');
             try {
                const content = await fs.readFile(legacyFeedsPath);
                await fs.writeFile(feedsPath, content);
             } catch (e) {
                 console.error('[DataManager] Feed migration failed', e);
             }
        }

        if (await fs.exists(feedsPath)) {
            try {
                const content = await fs.readFile(feedsPath);
                console.log('[RSS_DEBUG] dataManager.loadFeeds read content length:', content.length);
                const savedData = JSON.parse(content);
                
                // Handle both new object format and legacy array format
                const feeds = Array.isArray(savedData) ? savedData : (savedData.feeds || []);
                const pinnedFolders = Array.isArray(savedData) ? [] : (savedData.pinnedFolders || []);

                // MIGRATION: Extract read status and relatedEntries to feed-items.json
                const itemStatus: Record<string, any> = {};
                let needsMigration = false;

                feeds.forEach((feed: any) => {
                    feed.items = feed.items || []; // Ensure items exists
                    feed.items.forEach((item: any) => {
                        // Ensure every item has an ID (Robust migration)
                        if (!item.id) {
                            item.id = item.guid || item.link || `${item.pubDate}-${item.title}`;
                            needsMigration = true;
                        }

                        if (item.read !== undefined || item.relatedEntries !== undefined) {
                            needsMigration = true;
                            itemStatus[item.id] = {
                                read: !!item.read,
                                relatedEntries: item.relatedEntries || []
                            };
                            delete item.read;
                            delete item.relatedEntries;
                        }
                    });
                });

                if (needsMigration) {
                    console.log('[DataManager] Migrating feed item status to feed-items.json...');
                    const currentStatus = await this.loadFeedItems();
                    await this.saveFeedItems({ ...currentStatus, ...itemStatus });
                    // Save in the new format to prevent re-migration
                    await this.saveFeeds({ feeds, pinnedFolders }); 
                }

                // MIGRATION: Support segregation of YouTube feeds to youtube-feeds.json
                const youtubeFeeds = feeds.filter((f: any) => f.type === 'youtube' || f.folder === 'YouTube');
                if (youtubeFeeds.length > 0) {
                    console.log(`[DataManager] Migrating ${youtubeFeeds.length} YouTube feeds to specialized storage...`);
                    const existingYouTube = await this.loadYouTubeFeeds() || [];
                    const mergedYouTube = [...existingYouTube];
                    
                    youtubeFeeds.forEach((yf: any) => {
                        if (!mergedYouTube.some(existing => existing.url === yf.url)) {
                            mergedYouTube.push(yf);
                        }
                    });
                    
                    await this.saveYouTubeFeeds(mergedYouTube);
                    
                    // Remove from normal feeds
                    const remainingFeeds = feeds.filter((f: any) => f.type !== 'youtube' && f.folder !== 'YouTube');
                    await this.saveFeeds({ feeds: remainingFeeds, pinnedFolders });
                    
                    // Update returning value for the current RSS load
                    return Array.isArray(savedData) ? remainingFeeds : { ...savedData, feeds: remainingFeeds };
                }

                return Array.isArray(savedData) ? feeds : savedData;
            } catch (e) {
                console.error('Failed to parse feeds.json', e);
                return null;
            }
        }
        return [];
    }

    async saveFeeds(data: any[] | { feeds: any[], pinnedFolders: string[] }): Promise<void> {
        if (!this.rootPath) return;
        const feedsPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.FEED_FILE}`;
        console.log('[RSS_DEBUG] dataManager.saveFeeds writing to:', feedsPath);
        
        let dataToSave;
        
        if (Array.isArray(data)) {
            dataToSave = data.map(feed => {
                const { items, ...feedWithoutItems } = feed;
                return feedWithoutItems;
            });
        } else if (data && typeof data === 'object') {
            dataToSave = {
                ...data,
                feeds: (data.feeds || []).map(feed => {
                    const { items, ...feedWithoutItems } = feed;
                    return feedWithoutItems;
                })
            };
        } else {
            dataToSave = data;
        }

        // Removed: await fs.createDirectory(`${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`);
        // We do not want to automatically create the .codex config directory here.
        // If it doesn't exist, writeFile will fail, which is correct for a non-Codex repo.
        try {
            await fs.writeFile(feedsPath, JSON.stringify(dataToSave, null, 2));
        } catch (e) {
            console.warn('[DataManager] Could not save feeds. Not a native workspace?');
        }
    }

    async loadFeedItems(): Promise<Record<string, any>> {
        if (!this.rootPath) return {};
        const feedsItemsPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.FEED_ITEMS_FILE}`;
        if (await fs.exists(feedsItemsPath)) {
            try {
                const content = await fs.readFile(feedsItemsPath);
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse feed-items.json', e);
                return {};
            }
        }
        return {};
    }

    async saveFeedItems(items: Record<string, any>): Promise<void> {
        if (!this.rootPath) return;
        const feedsItemsPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.FEED_ITEMS_FILE}`;
        console.log('[RSS_DEBUG] dataManager.saveFeedItems writing to:', feedsItemsPath);
        try {
            await fs.writeFile(feedsItemsPath, JSON.stringify(items, null, 2));
        } catch (e) {
            console.warn('[DataManager] Could not save feed items. Not a native workspace?');
        }
    }

    async loadYouTubeFeeds(): Promise<any[] | null> {
        if (!this.rootPath) return [];
        const youtubeFeedsPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.YOUTUBE_FEED_FILE}`;
        if (await fs.exists(youtubeFeedsPath)) {
            try {
                const content = await fs.readFile(youtubeFeedsPath);
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse youtube-feeds.json', e);
                return null;
            }
        }
        return [];
    }

    async saveYouTubeFeeds(data: any): Promise<void> {
        if (!this.rootPath) return;
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.YOUTUBE_FEED_FILE}`;
        
        let dataToSave;
        if (Array.isArray(data)) {
            dataToSave = data.map(feed => {
                const { items, ...feedWithoutItems } = feed;
                return feedWithoutItems;
            });
        } else {
            dataToSave = data;
        }

        // Removed auto-create directory
        try {
            await fs.writeFile(path, JSON.stringify(dataToSave, null, 2));
        } catch (e) {
            console.warn('[DataManager] Could not save youtube feeds. Not a native workspace?');
        }
    }

    async loadYouTubeFeedItems(): Promise<Record<string, any>> {
        if (!this.rootPath) return {};
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.YOUTUBE_FEED_ITEMS_FILE}`;
        if (await fs.exists(path)) {
            try {
                const content = await fs.readFile(path);
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse youtube-feed-items.json', e);
                return {};
            }
        }
        return {};
    }

    async saveYouTubeFeedItems(items: Record<string, any>): Promise<void> {
        if (!this.rootPath) return;
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.YOUTUBE_FEED_ITEMS_FILE}`;
        // Removed auto-create directory
        try {
            await fs.writeFile(path, JSON.stringify(items, null, 2));
        } catch (e) {
            console.warn('[DataManager] Could not save youtube feed items. Not a native Keep?');
        }
    }

    // --- External Metadata Helpers ---

    private async readExternalMetadata(filePath: string, frontmatter: any): Promise<{ board?: any, highlights?: any[], code?: any, migrationIds?: any }> {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const entryDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        const fileName = normalizedPath.split('/').pop()?.replace('.md', '');
        const result: { board?: any, highlights?: any[], code?: any, migrationIds?: any } = {};
        const migrationIds: any = {};

        if (!fileName) return result;

        const mappings = [
            { key: 'board', dir: APP_CONSTANTS.PATHS.BOARD_DIR, idKey: 'whiteboardId' },
            { key: 'highlights', dir: APP_CONSTANTS.PATHS.HIGHLIGHTS_DIR, idKey: 'highlightsId' },
            { key: 'code', dir: APP_CONSTANTS.PATHS.CODE_DIR, idKey: 'codeId' }
        ] as const;

        // Batch check directory existence to avoid multiple calls per entry
        const dirsToCheck = [APP_CONSTANTS.PATHS.BOARD_DIR, APP_CONSTANTS.PATHS.HIGHLIGHTS_DIR, APP_CONSTANTS.PATHS.CODE_DIR];
        const dirExistence = await Promise.all(dirsToCheck.map(dir => fs.exists(`${entryDir}/${dir}`)));
        const existingDirs = new Set(dirsToCheck.filter((_, i) => dirExistence[i]));

        // Parallelize checking of all external types for existing directories
        await Promise.all(mappings.map(async ({ key, dir, idKey }) => {
            if (!existingDirs.has(dir)) return;

            const id = frontmatter[idKey];
            
            // 1. Try reading by GUID (preferred)
            if (id) {
                const path = `${entryDir}/${dir}/${id}.json`;
                if (await fs.exists(path)) {
                    try {
                        const content = await fs.readFile(path);
                        result[key] = JSON.parse(content);
                        return;
                    } catch (e) { /* ignore parse error */ }
                }
            }

            // 2. Fallback: Named file (only if GUID not found or missing)
            const namedPath = `${entryDir}/${dir}/${fileName}.json`;
            if (await fs.exists(namedPath)) {
                try {
                    const content = await fs.readFile(namedPath);
                    const data = JSON.parse(content);
                    result[key] = data;
                    // Migrate to GUID-based path immediately for consistency
                    const newId = uuidv4();
                    await this.writeExternalMetadata(filePath, key as any, data, newId);
                    migrationIds[idKey] = newId;
                    return;
                } catch (e) { /* ignore */ }
            }

            // 3. Last Fallback: Legacy metadata.json
            const legacyPath = `${entryDir}/${dir}/metadata.json`;
            if (await fs.exists(legacyPath)) {
                try {
                    const content = await fs.readFile(legacyPath);
                    const data = JSON.parse(content);
                    result[key] = data;
                    const newId = uuidv4();
                    await this.writeExternalMetadata(filePath, key as any, data, newId);
                    migrationIds[idKey] = newId;
                } catch (e) { /* ignore */ }
            }
        }));

        result.migrationIds = Object.keys(migrationIds).length > 0 ? migrationIds : undefined;
        return result;
    }

    private async writeExternalMetadata(filePath: string, type: 'board' | 'highlights' | 'code', data: any, existingId?: string): Promise<string> {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const entryDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        
        const id = existingId || uuidv4();

        const dirName = type === 'board' ? APP_CONSTANTS.PATHS.BOARD_DIR : 
                        type === 'highlights' ? APP_CONSTANTS.PATHS.HIGHLIGHTS_DIR : 
                        APP_CONSTANTS.PATHS.CODE_DIR;
                        
        const folderPath = `${entryDir}/${dirName}`;
        const metadataPath = `${folderPath}/${id}.json`;

        await fs.createDirectory(folderPath);
        await fs.writeFile(metadataPath, JSON.stringify(data, null, 2));

        return id;
    }

    async handleFileChange(event: { type: 'add' | 'change' | 'unlink', path: string }) {
        if (this.isSyncing) return; // Don't process watcher events during full sync

        console.log(`[DataManager] handleFileChange: ${event.type} -> ${event.path}`);

        if (event.type === 'unlink') {
            const entry = await db.entries.where('filePath').equals(event.path).first();
            if (entry) {
                console.log(`[DataManager] Removing orphaned entry: ${entry.id}`);
                await db.entries.delete(entry.id);
                await db.indexStatus.delete(entry.id);
            }
            return;
        }

        if (event.path.endsWith('.md')) {
            try {
                // Wait a tiny bit for the file to be readable (sometimes git lock)
                await new Promise(r => setTimeout(r, 50));
                
                const content = await fs.readFile(event.path);
                const { data, content: markdownBody } = matter(content);

                if (!data.id) return;

                // Determine entry type from folder if not explicit
                const normalizedPath = event.path.replace(/\\/g, '/');
                const pathParts = normalizedPath.split('/');
                const folderName = pathParts[pathParts.length - 2];
                
                // RESTRICTION: Only process files in configured entry folders
                const typeEntry = Object.entries(this.config.entries).find(([_, c]) => c.folder === folderName);
                if (!typeEntry) {
                    return; 
                }
                const [typeKey] = typeEntry;

                const externalData = await this.readExternalMetadata(event.path, data);

                const entry: CodexEntry = {
                    id: data.id,
                    title: data.title || pathParts[pathParts.length - 1].replace('.md', ''),
                    type: data.type || typeKey,
                    tags: data.tags || [],
                    filePath: event.path,
                    createdAt: data.created || new Date().toISOString(),
                    updatedAt: data.updated || new Date().toISOString(),
                    frontmatter: data,
                    content: markdownBody,
                    highlights: externalData.highlights || [],
                    whiteboard: externalData.board,
                    code: externalData.code
                };

                // Dynamic promotion
                for (const field of TOP_LEVEL_FIELDS) {
                    if (data[field] !== undefined) {
                        // @ts-ignore
                        entry[field] = data[field];
                    }
                }

                await db.entries.put(entry);
                console.log(`[DataManager] Incrementally updated entry: ${entry.id}`);
            } catch (e) {
                console.error(`[DataManager] Failed to handle incremental update for ${event.path}:`, e);
            }
        } else if (event.path.endsWith('.json')) {
            // Handle external metadata changes (highlights, board, code)
            try {
                const normalizedPath = event.path.replace(/\\/g, '/');
                const pathParts = normalizedPath.split('/');
                const fileName = pathParts[pathParts.length - 1];
                const metaId = fileName.replace('.json', '');
                const parentFolder = pathParts[pathParts.length - 2];

                // Determine which field this corresponds to
                const fieldMap: Record<string, keyof CodexEntry> = {
                    [APP_CONSTANTS.PATHS.HIGHLIGHTS_DIR]: 'highlights',
                    [APP_CONSTANTS.PATHS.BOARD_DIR]: 'whiteboard',
                    [APP_CONSTANTS.PATHS.CODE_DIR]: 'code'
                };

                const fieldName = fieldMap[parentFolder];
                const idKeyMap: Record<string, string> = {
                    highlights: 'highlightsId',
                    whiteboard: 'whiteboardId',
                    code: 'codeId'
                };

                // RESTRICTION: JSON files must be in known metadata subfolders or .codex
                const isConfigDir = normalizedPath.includes(`/${APP_CONSTANTS.PATHS.CONFIG_DIR}/`);
                if (!fieldName && !isConfigDir) {
                    return;
                }

                const idKey = idKeyMap[fieldName as string];

                if (fieldName && idKey) {
                    const entry = await db.entries.where(`frontmatter.${idKey}`).equals(metaId).first();
                    if (entry) {
                        const content = await fs.readFile(event.path);
                        const jsonData = JSON.parse(content);
                        
                        // Check if actually changed to avoid loop (though watcher is usually one-way)
                        const currentData = entry[fieldName];
                        if (JSON.stringify(currentData) !== JSON.stringify(jsonData)) {
                            await db.entries.update(entry.id, { 
                                [fieldName]: jsonData,
                                updatedAt: new Date().toISOString()
                            });
                            console.log(`[DataManager] Incrementally updated ${fieldName} for entry: ${entry.id}`);
                        }
                    }
                }
            } catch (e) {
                console.error(`[DataManager] Failed to handle metadata sync for ${event.path}:`, e);
            }
        }
    }


    async loadBoards(): Promise<any[] | null> {
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/boards.json`;
        if (await fs.exists(path)) {
            try {
                const content = await fs.readFile(path);
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse boards.json', e);
                return null;
            }
        }
        return [];
    }

    async saveBoards(boards: any[]): Promise<void> {
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/boards.json`;
        await fs.createDirectory(`${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`);
        await fs.writeFile(path, JSON.stringify(boards, null, 2));
    }

    async loadNotebooks(): Promise<any[] | null> {
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.NOTEBOOK_FILE}`;
        if (await fs.exists(path)) {
            try {
                const content = await fs.readFile(path);
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse notebooks.json', e);
                return null;
            }
        }
        return [];
    }

    async saveNotebooks(notebooks: any[]): Promise<void> {
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.NOTEBOOK_FILE}`;
        await fs.createDirectory(`${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`);
        await fs.writeFile(path, JSON.stringify(notebooks, null, 2));
    }

    // 10. LaTeX Persistence
    async loadLatexFiles(): Promise<{ name: string; content: string | null; isBinary?: boolean }[]> {
        const latexDir = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.LATEX_DIR}`;
        if (await fs.exists(latexDir)) {
            try {
                // Recursive file loading
                const getAllFiles = async (dir: string, relativePath: string = ''): Promise<{ name: string; content: string | null; isBinary?: boolean }[]> => {
                    const entries = await fs.readDirectory(dir);
                    const results: { name: string; content: string | null; isBinary?: boolean }[] = [];

                    for (const entry of entries) {
                         const fullPath = `${dir}/${entry}`;
                         const relPath = relativePath ? `${relativePath}/${entry}` : entry;
                         
                         // Check if directory
                         if (!entry.includes('.')) { // Simple heuristic: if no extension, assume directory
                             try {
                                 const subFiles = await getAllFiles(fullPath, relPath);
                                 results.push(...subFiles);
                                 continue;
                             } catch (e) {
                                 // If readDirectory fails, it's likely a file. Continue to file processing.
                             }
                         }
                         
                         const isImage = entry.match(/\.(png|jpg|jpeg|pdf)$/i);
                         
                         if (isImage) {
                            // For binary files, we only return the name and a flag, not the content
                            results.push({ name: relPath, content: null, isBinary: true });
                         } else {
                            // For text files, we load content
                            try {
                                const content = await fs.readFile(fullPath);
                                results.push({ name: relPath, content });
                            } catch (err) {
                                console.warn(`Skipping file ${entry}`, err);
                            }
                         }
                    }
                    return results;
                };

                return await getAllFiles(latexDir);
            } catch (e) {
                console.error('Failed to load latex files', e);
                return [];
            }
        }
        return [];
    }

    async saveLatexFile(name: string, content: string, isBinary: boolean = false): Promise<void> {
        if (!this.rootPath) {
            throw new Error("Cannot save file: No active Keep.");
        }

        const latexDir = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.LATEX_DIR}`;
        const path = `${latexDir}/${name}`;
        
        // Ensure parent directory exists
        const parentDir = path.substring(0, path.lastIndexOf('/'));
        if (!(await fs.exists(parentDir))) {
            await fs.createDirectory(parentDir);
        }

        if (isBinary) {
            // Content should be base64 string if it came from our loadLatexFiles
            // We need to convert it back to Uint8Array for writeAsset
            const binaryString = window.atob(content);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            await fs.writeAsset(path, bytes);
        } else {
            await fs.writeFile(path, content);
        }
    }
    
    async renameLatexFile(oldName: string, newName: string): Promise<void> {
        if (!this.rootPath) {
            throw new Error("Cannot rename file: No active Keep.");
        }
        const latexDir = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.LATEX_DIR}`;
        const oldPath = `${latexDir}/${oldName}`;
        const newPath = `${latexDir}/${newName}`;
        await fs.rename(oldPath, newPath);
    }    
    
    async deleteLatexFile(name: string): Promise<void> {
        if (!this.rootPath) {
             throw new Error("Cannot delete file: No active Keep.");
        }
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.LATEX_DIR}/${name}`;
        if (await fs.exists(path)) {
            await fs.deleteFile(path);
        }
    }

    async getLatexFileContent(name: string, isBinary: boolean): Promise<string | null> {
        if (!this.rootPath) return null;
        const fullPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.LATEX_DIR}/${name}`;
        
        try {
            if (isBinary) {
                const buffer = await fs.readFileBinary(fullPath);
                if (buffer instanceof Uint8Array) {
                    return await new Promise<string>((resolve) => {
                        const blob = new Blob([buffer as any]);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            const base64Content = dataUrl.split(',')[1];
                            resolve(base64Content);
                        };
                        reader.readAsDataURL(blob);
                    });
                }
                return null;
            } else {
                return await fs.readFile(fullPath);
            }
        } catch (e) {
            console.error(`Failed to read latex file content for ${name}`, e);
            return null;
        }
    }

    async loadTagCategories(): Promise<any[]> {
        if (!this.rootPath) return [];
        const path = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.TAGS_FILE}`;
        try {
            if (await fs.exists(path)) {
                const content = await fs.readFile(path);
                return JSON.parse(content);
            }
        } catch (e) {
            console.error('Failed to load tag categories', e);
        }
        return [];
    }

    async saveTagCategories(categories: any[]): Promise<void> {
        if (!this.rootPath) {
            throw new Error("Cannot save tag categories: No active Keep.");
        }
        const tagsPath = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}/${APP_CONSTANTS.PATHS.TAGS_FILE}`;
        try {
            // Ensure .codex directory exists (using async wrapper)
            const configDir = `${this.rootPath}/${APP_CONSTANTS.PATHS.CONFIG_DIR}`;
            if (!(await fs.exists(configDir))) {
                await fs.createDirectory(configDir);
            }
            await fs.writeFile(tagsPath, JSON.stringify(categories, null, 2));
        } catch (error) {
            console.error('[DataManager] Failed to save tag categories:', error);
            this.notify('error', `Failed to save tag categories to disk: ${error instanceof Error ? error.message : error}`);
            throw error;
        }
    }
}

export const dataManager = new DataManager();
