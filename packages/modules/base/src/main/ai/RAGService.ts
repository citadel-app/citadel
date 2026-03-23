/**
 * RAG Service — Retrieval-Augmented Generation logic for Main process.
 * Handles indexing, semantic search, and context retrieval.
 */
import type { CodexEntry, IndexStatus, VectorPoint } from '@citadel-app/core';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { extractAllFromEntry } from './content-extractor';
import { AppSettingsService } from '../services/AppSettingsService';

/**
 * Simple hash function for content change detection
 */
function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

export class RAGService {
    private providerRegistry: ProviderRegistry;
    private _appSettings: AppSettingsService;
    private _coreDb: any; // CoreDatabase instance

    constructor(providerRegistry: ProviderRegistry, appSettings: AppSettingsService, coreDb: any) {
        this.providerRegistry = providerRegistry;
        this._appSettings = appSettings;
        this._coreDb = coreDb;
    }

    /**
     * Check if RAG is available.
     */
    async isAvailable(): Promise<{ available: boolean; reason?: string }> {
        const vectorStore = this.providerRegistry.getVectorStore();
        const connected = await vectorStore.checkConnection();
        if (!connected) {
            return { available: false, reason: `${vectorStore.name} not connected` };
        }

        const embeddingProvider = this.providerRegistry.getEmbeddingProvider();
        if (embeddingProvider.name === 'ollama') {
            const llm = this.providerRegistry.getLLMProvider();
            const models = await llm.getModels();
            const settings = this._appSettings.getSettings();
            const modelName = settings.ai?.ollama?.embeddingModel || 'nomic-embed-text';
            const hasModel = models.some(m => m.name.toLowerCase().includes(modelName.toLowerCase()));
            if (!hasModel) {
                return { available: false, reason: `Embedding model (${modelName}) not available.` };
            }
        }

        return { available: true };
    }

    /**
     * Index an entry - extract content, chunk, embed, store in vector store.
     */
    async indexEntry(
        entry: CodexEntry,
        config: { 
            chunkSize?: number; 
            chunkOverlap?: number;
            indexPdf?: boolean;
            indexUrl?: boolean;
            indexMarkdown?: boolean;
            folderWhitelist?: string[];
        } = {}
    ): Promise<{ success: boolean; chunkCount: number; error?: string }> {
        try {
            // 1. Extract content
            const extraction = await extractAllFromEntry(entry, {
                ...config
            });

            if (extraction.chunks.length === 0) {
                return { success: true, chunkCount: 0 };
            }

            const vectorStore = this.providerRegistry.getVectorStore();
            const embeddingProvider = this.providerRegistry.getEmbeddingProvider();

            // 2. Prepare Vector DB
            await vectorStore.ensureCollection(embeddingProvider.getVectorSize());
            
            // 3. Delete existing points for this entry
            await vectorStore.deleteByFilter({
                must: [{ key: 'entryId', match: { value: entry.id } }]
            });

            // 4. Generate Embeddings and Upsert
            const points: VectorPoint[] = [];
            const CONCURRENCY_LIMIT = 3;
            const chunks = extraction.chunks;

            for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
                const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);
                const batchResults = await Promise.all(batch.map(async (chunk) => {
                    try {
                        const vector = await embeddingProvider.embed(chunk.text);
                        if (vector) {
                            const point: VectorPoint = {
                                id: chunk.id,
                                vector,
                                payload: {
                                    entryId: entry.id,
                                    text: chunk.text,
                                    sourceType: chunk.sourceType as any,
                                    chunkIndex: chunk.chunkIndex,
                                    entryTitle: entry.title
                                }
                            };
                            return point;
                        }
                    } catch (err) {
                        console.error(`[RAGService] Failed to embed chunk ${chunk.id}:`, err);
                    }
                    return null;
                }));

                const validPoints = batchResults.filter((p): p is VectorPoint => p !== null);
                points.push(...validPoints);
            }

            if (points.length > 0) {
                const upserted = await vectorStore.upsert(points);
                if (!upserted) throw new Error('Failed to upsert points to Vector DB');
            }

            // 5. Update Index Status in Main DB
            const status: IndexStatus = {
                entryId: entry.id,
                lastIndexed: new Date().toISOString(),
                chunkCount: points.length,
                contentHash: hashContent(entry.content || entry.title)
            };
            
            await this._coreDb.updateAIIndexStatus(status);

            return { success: true, chunkCount: points.length };
        } catch (e) {
            console.error('[RAGService] Indexing failed:', e);
            return { success: false, chunkCount: 0, error: String(e) };
        }
    }

    /**
     * Query relevant chunks for a specific entry
     */
    async queryEntry(entryId: string, query: string, topK: number = 5): Promise<Array<{ text: string; score: number; sourceType: string }>> {
        const embeddingProvider = this.providerRegistry.getEmbeddingProvider();
        const vector = await embeddingProvider.embed(query);
        if (!vector) return [];

        const vectorStore = this.providerRegistry.getVectorStore();
        const results = await vectorStore.search(vector, topK, entryId);
        return results.map(r => ({
            text: r.payload.text,
            score: r.score,
            sourceType: r.payload.sourceType
        }));
    }

    /**
     * Get semantic context for a prompt
     */
    async getContextForPrompt(entryId: string, query: string, maxChunks: number = 5): Promise<string> {
        const chunks = await this.queryEntry(entryId, query, maxChunks);
        if (chunks.length === 0) return '[NO RELEVANT SEMANTIC SEGMENTS FOUND]';

        return chunks
            .map(c => `[${c.sourceType}] ${c.text}`)
            .join('\n\n---\n\n');
    }

    /**
     * Search for relevant content across all entries.
     */
    async search(query: string, limit: number = 20): Promise<Array<{ text: string; score: number; entryId: string; sourceType: string }>> {
        const embeddingProvider = this.providerRegistry.getEmbeddingProvider();
        const vector = await embeddingProvider.embed(query);
        if (!vector) return [];

        const vectorStore = this.providerRegistry.getVectorStore();
        const results = await vectorStore.search(vector, limit);
        return results.map(r => ({
            text: r.payload.text,
            score: r.score,
            entryId: r.payload.entryId,
            sourceType: r.payload.sourceType
        }));
    }

    /**
     * Check if entry needs re-indexing
     */
    async needsIndexing(entryId: string, reindexIntervalHours: number = 24): Promise<boolean> {
        try {
            const status = await this._coreDb.getAIIndexStatus(entryId);
            if (!status || status.chunkCount === 0) return true;

            const ageMs = Date.now() - new Date(status.lastIndexed).getTime();
            const maxAgeMs = reindexIntervalHours * 60 * 60 * 1000;
            return ageMs > maxAgeMs;
        } catch (e) {
            return true;
        }
    }

    /**
     * Get structural context (first N chunks)
     */
    async getStructuralContext(entryId: string, maxChunks: number = 3): Promise<string> {
        try {
            const vectorStore = this.providerRegistry.getVectorStore();
            const results = await vectorStore.getPointsByFilter({
                must: [
                    { key: 'entryId', match: { value: entryId } },
                    { key: 'chunkIndex', range: { lt: maxChunks } }
                ]
            }, maxChunks);

            if (results.length === 0) return '[NO STRUCTURAL CONTEXT FOUND]';

            return results
                .sort((a: any, b: any) => (a.payload.chunkIndex as number) - (b.payload.chunkIndex as number))
                .map((r: any) => `[${r.payload.sourceType} @ Chunk ${r.payload.chunkIndex}] ${r.payload.text}`)
                .join('\n\n---\n\n');
        } catch (e) {
            console.error('[RAGService] Failed to get structural context:', e);
            return '';
        }
    }

    /**
     * Delete entry from index
     */
    async deleteEntryIndex(entryId: string): Promise<void> {
        try {
            const vectorStore = this.providerRegistry.getVectorStore();
            await vectorStore.deleteByFilter({
                must: [{ key: 'entryId', match: { value: entryId } }]
            });
            await this._coreDb.deleteAIIndexStatus(entryId);
        } catch (e) {
            console.error('[RAGService] Failed to delete entry index:', e);
        }
    }
}
