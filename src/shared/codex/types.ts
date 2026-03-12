/**
 * Shared types for Codex entries and indexing.
 */

export interface CodexEntry {
    id: string;
    title: string;
    type: string;
    tags: string[];
    filePath: string;
    createdAt: string;
    updatedAt: string;
    sourceUrl?: string;
    frontmatter?: any;
    content?: string;
    highlights?: any[];
    relatedLinks?: any[];
    whiteboard?: any;
    code?: any;
    // Common metadata often promoted to top-level
    status?: string;
    author?: string;
    publishedAt?: string;
    difficulty?: string;
    [key: string]: any; // Allow for other dynamic/promoted fields
}

export interface IndexStatus {
    entryId: string;
    lastIndexed: Date | string;
    chunkCount: number;
    contentHash: string;
    lastError?: string;
}

export interface EmbeddingsBatch {
    entryId: string;
    embeddings: {
        id: string;
        vector: number[];
        metadata: any;
    }[];
}
