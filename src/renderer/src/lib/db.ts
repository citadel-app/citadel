import Dexie, { type Table } from 'dexie';
import { simpleHash } from './hash-utils';

export interface CodexEntry {
    id: string;
    title: string;
    type: string;
    tags: string[];
    filePath: string; // Absolute path to the backing md file
    createdAt: string;
    updatedAt: string;
    
    // Module specific fields (stored as generic properties for indexing or JSON content for details)
    sourceUrl?: string;
    companies?: string[];
    difficulty?: string;
    author?: string;
    publishedAt?: string;
    status?: string;
    
    // Links to other entities
    relatedLinks?: { id: string; type: string; title: string; url?: string }[];
    
    // We might not index everything, but we store the full object
    frontmatter: any; // Complete parsing result
    content?: string; // Markdown body content
    highlights?: any[]; // PDF highlights
    whiteboard?: any; // Whiteboard data (Snapshot object)
    code?: any; // Code data
}

export interface WhiteboardData {
    id: string; // 'default' for now
    elements: any[];
    appState: any;
    files: any;
    updatedAt: string;
}

export interface EditorData {
    id: string; // 'default' for now
    content: string;
    language: string;
    updatedAt: string;
}

export interface NotesData {
    id: string; // 'default' for now
    content: string;
    updatedAt: string;
}

export interface IndexStatus {
    entryId: string;
    lastIndexed: Date;
    chunkCount: number;
    contentHash: string;
    lastError?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: { id: string; type: string; title: string }[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface LatexData {
    id: string; // 'default' for now
    content: string;
    updatedAt: string;
}

export class CodexDatabase extends Dexie {
    entries!: Table<CodexEntry, string>;
    whiteboard!: Table<WhiteboardData, string>;
    editor!: Table<EditorData, string>;
    latex!: Table<LatexData, string>;
    indexStatus!: Table<IndexStatus, string>;
    chatSessions!: Table<ChatSession, string>;
    notes!: Table<NotesData, string>;

    constructor(dbName: string = 'CodexDB_General') {
        super(dbName);
        this.version(1).stores({
            entries: 'id, title, type, *tags, *companies, difficulty, updatedAt'
        });
        this.version(2).stores({
            whiteboard: 'id, updatedAt',
            editor: 'id, language, updatedAt'
        });
        this.version(3).stores({
            indexStatus: 'entryId, lastIndexed'
        });
        this.version(4).stores({
            chatSessions: 'id, title, updatedAt'
        });
        this.version(5).stores({
            latex: 'id, updatedAt'
        });
        this.version(6).stores({
            notes: 'id, updatedAt'
        });
        this.version(9).stores({
            entries: 'id, title, type, status, filePath, frontmatter.highlightsId, frontmatter.whiteboardId, frontmatter.codeId, *tags, *companies, difficulty, updatedAt'
        });
    }
}

// Global instance that will be swapped on workspace change
export let db = new CodexDatabase();

export function initDatabase(workspacePath: string | null) {
    if (!workspacePath) {
        console.warn('[Database] Initializing in non-workspace mode (General DB)');
        db = new CodexDatabase('CodexDB_General');
        return;
    }
    
    const hash = simpleHash(workspacePath);
    const dbName = `CodexDB_${hash}`;
    console.log(`[Database] Initializing for workspace: ${workspacePath} (${dbName})`);
    
    // Close existing if open
    if (db.isOpen()) {
        db.close();
    }
    
    db = new CodexDatabase(dbName);
}

