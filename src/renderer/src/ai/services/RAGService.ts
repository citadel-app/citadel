import type { CodexEntry, IndexStatus } from '../../lib/db';

export class RAGService {
    /**
     * Check if RAG is available.
     */
    async isAvailable(): Promise<{ available: boolean; reason?: string }> {
        return window.api.ai.isAvailable();
    }

    /**
     * Index an entry - extract content, chunk, embed, store in vector store.
     */
    async indexEntry(
        entry: CodexEntry,
        config: any = {}
    ): Promise<{ success: boolean; chunkCount: number; error?: string }> {
        return window.api.ai.indexEntry(entry, config);
    }

    /**
     * Check if entry needs re-indexing
     */
    async needsIndexing(entry: CodexEntry, reindexIntervalHours: number = 24): Promise<boolean> {
        return window.api.ai.needsIndexing(entry.id, reindexIntervalHours);
    }

    /**
     * Query relevant chunks for a specific entry
     */
    async queryEntry(entryId: string, query: string, topK: number = 5): Promise<Array<{ text: string; score: number; sourceType: string }>> {
        const results = await window.api.ai.getContext(entryId, query, topK);
        // getContext returns a string in current Main impl, 
        // if we need structured results we might need to adjust Main getContext or add a new IPC.
        // For now, returning as text.
        return [{ text: results, score: 1, sourceType: 'merged' }];
    }

    async getStructuralContext(entryId: string, maxChunks: number = 3): Promise<string> {
        return window.api.ai.getStructuralContext(entryId, maxChunks);
    }

    async getContextForPrompt(entryId: string, query: string, maxChunks: number = 5): Promise<string> {
        return window.api.ai.getContext(entryId, query, maxChunks);
    }

    async search(query: string, limit: number = 30): Promise<Array<{ text: string; score: number; entryId: string; sourceType: string }>> {
        return window.api.ai.search(query, limit);
    }

    async getIndexStatus(entryId: string): Promise<IndexStatus | null> {
        return window.api.db.getAIIndexStatus(entryId);
    }

    async deleteEntryIndex(entryId: string): Promise<void> {
        await window.api.ai.deleteEntryIndex(entryId);
    }

    async purgeAllIndexes(): Promise<void> {
        // Need to add this to Main AIOrchestrator if needed
    }
}

export const ragService = new RAGService();
