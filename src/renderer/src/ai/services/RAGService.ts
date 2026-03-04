import { db, type CodexEntry, type IndexStatus } from '../../lib/db';
import { providerRegistry } from '../providers/ProviderRegistry';
import type { VectorPoint } from '../providers/interfaces';
import { extractAllFromEntry } from '../../services/content-extractor';
import { dataManager } from '../../lib/data-manager';

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
    private indexStatusCache: Map<string, IndexStatus> = new Map();

    /**
     * Check if RAG is available.
     */
    async isAvailable(): Promise<{ available: boolean; reason?: string }> {
        const vectorStore = providerRegistry.getVectorStore();
        const qdrantConnected = await vectorStore.checkConnection();
        if (!qdrantConnected) {
            return { available: false, reason: `${vectorStore.name} not connected` };
        }

        const embeddingProvider = providerRegistry.getEmbeddingProvider();
        
        // For Ollama, check if embedding model is available
        if (embeddingProvider.name === 'ollama') {
            const llm = providerRegistry.getLLMProvider();
            const models = await llm.getModels();
            const hasEmbedding = models.some(m => m.name.toLowerCase().includes('nomic-embed-text'));
            if (!hasEmbedding) {
                return { available: false, reason: 'Embedding model (nomic-embed-text) not available.' };
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
            // Check folder whitelist
            if (config.folderWhitelist && config.folderWhitelist.length > 0) {
                const isWhitelisted = config.folderWhitelist.some(folder => 
                    entry.filePath.startsWith(folder) || entry.filePath.toLowerCase().startsWith(folder.toLowerCase())
                );
                if (!isWhitelisted) {
                    return { success: false, chunkCount: 0, error: 'File not in whitelisted folders' };
                }
            }

            // 1. Extract content
            const configData = dataManager.getConfig();
            const typeConfig = configData.entries[entry.type];
            const extraction = await extractAllFromEntry(entry, {
                ...config,
                typeConfig
            });

            if (extraction.chunks.length === 0) {
                return { success: true, chunkCount: 0 };
            }

            const vectorStore = providerRegistry.getVectorStore();
            const embeddingProvider = providerRegistry.getEmbeddingProvider();

            // 2. Prepare Vector DB
            await vectorStore.ensureCollection(embeddingProvider.getVectorSize());
            
            // 3. Delete existing points for this entry
            await vectorStore.deleteByFilter({
                must: [{ key: 'entryId', match: { value: entry.id } }]
            });

            // 4. Generate Embeddings and Upsert in parallel with concurrency limit
            const points: VectorPoint[] = [];
            const CONCURRENCY_LIMIT = 5;
            const chunks = extraction.chunks;

            for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
                const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);
                const batchResults = await Promise.all(batch.map(async (chunk) => {
                    try {
                        const vector = await embeddingProvider.embed(chunk.text);
                        if (vector) {
                            return {
                                id: chunk.id,
                                vector,
                                payload: {
                                    entryId: entry.id,
                                    text: chunk.text,
                                    sourceType: chunk.sourceType,
                                    chunkIndex: chunk.chunkIndex,
                                    entryTitle: entry.title
                                }
                            };
                        }
                    } catch (err) {
                        console.error(`[RAGService] Failed to embed chunk ${chunk.id}:`, err);
                    }
                    return null;
                }));

                const validPoints = batchResults.filter((p): p is any => p !== null && p.payload !== undefined && p.payload !== null && typeof p.payload === 'object' && 'entryId' in p.payload) as unknown as VectorPoint[];
                points.push(...validPoints);
            }

            if (points.length > 0) {
                const upserted = await vectorStore.upsert(points);
                if (!upserted) throw new Error('Failed to upsert points to Vector DB');
            }

            // 5. Update Index Status in DB
            const status: IndexStatus = {
                entryId: entry.id,
                lastIndexed: new Date(),
                chunkCount: points.length,
                contentHash: hashContent(entry.content || entry.title)
            };
            await db.indexStatus.put(status);
            this.indexStatusCache.set(entry.id, status);

            return { success: true, chunkCount: points.length };
        } catch (e) {
            console.error('[RAGService] Indexing failed:', e);
            return { success: false, chunkCount: 0, error: String(e) };
        }
    }

    /**
     * Check if entry needs re-indexing
     */
    async needsIndexing(entry: CodexEntry, reindexIntervalHours: number = 24): Promise<boolean> {
        try {
            let status = this.indexStatusCache.get(entry.id);
            if (!status) {
                status = await db.indexStatus.get(entry.id);
                if (status) this.indexStatusCache.set(entry.id, status);
            }

            if (!status || status.chunkCount === 0) return true;

            const currentHash = hashContent(entry.content || entry.title);
            if (status.contentHash !== currentHash) return true;

            if (reindexIntervalHours === 0) return false;

            const ageMs = Date.now() - new Date(status.lastIndexed).getTime();
            const maxAgeMs = reindexIntervalHours * 60 * 60 * 1000;
            return ageMs > maxAgeMs;
        } catch (e) {
            return true;
        }
    }

    /**
     * Query relevant chunks for a specific entry
     */
    async queryEntry(entryId: string, query: string, topK: number = 5): Promise<Array<{ text: string; score: number; sourceType: string }>> {
        const embeddingProvider = providerRegistry.getEmbeddingProvider();
        const vector = await embeddingProvider.embed(query);
        if (!vector) return [];

        const vectorStore = providerRegistry.getVectorStore();
        const results = await vectorStore.search(vector, topK, entryId);
        return results.map(r => ({
            text: r.payload.text,
            score: r.score,
            sourceType: r.payload.sourceType
        }));
    }

    /**
     * Get structural context (first N chunks)
     */
    async getStructuralContext(entryId: string, maxChunks: number = 3): Promise<string> {
        try {
            const vectorStore = providerRegistry.getVectorStore();
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
            return '';
        }
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
    async search(query: string, limit: number = 30): Promise<Array<{ text: string; score: number; entryId: string; sourceType: string }>> {
        const embeddingProvider = providerRegistry.getEmbeddingProvider();
        const vector = await embeddingProvider.embed(query);
        if (!vector) return [];

        const vectorStore = providerRegistry.getVectorStore();
        const results = await vectorStore.search(vector, limit);
        return results.map(r => ({
            text: r.payload.text,
            score: r.score,
            entryId: r.payload.entryId,
            sourceType: r.payload.sourceType
        }));
    }

    async getIndexStatus(entryId: string): Promise<IndexStatus | null> {
        let status = this.indexStatusCache.get(entryId);
        if (!status) {
            status = await db.indexStatus.get(entryId);
        }
        return status || null;
    }

    async deleteEntryIndex(entryId: string): Promise<void> {
        const vectorStore = providerRegistry.getVectorStore();
        await vectorStore.deleteByFilter({
            must: [{ key: 'entryId', match: { value: entryId } }]
        });
        await db.indexStatus.delete(entryId);
        this.indexStatusCache.delete(entryId);
    }

    async purgeAllIndexes(): Promise<void> {
        const vectorStore = providerRegistry.getVectorStore();
        await vectorStore.clearAll();
        await db.indexStatus.clear();
        this.indexStatusCache.clear();
    }
}

export const ragService = new RAGService();
