import Dexie, { type Table } from 'dexie';
import { 
    CodexEntry, 
    IndexStatus, 
    ChatMessage, 
    WhiteboardData, 
    EditorData, 
    NotesData, 
    LatexData, 
    ChatSession,
    simpleHash 
} from '@citadel-app/core';

export type { CodexEntry, IndexStatus, ChatMessage, WhiteboardData, EditorData, NotesData, LatexData, ChatSession };


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

