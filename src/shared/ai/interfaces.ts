import { AIModel } from './types';

export interface AIModelSettings {
    model: string;
    temperature: number;
}

export interface GenerateOptions {
    model: string;
    prompt: string;
    system?: string;
    template?: string;
    context?: number[];
    stream?: boolean;
    format?: 'json';
    temperature?: number;
}

export interface VectorPoint {
    id: string;
    vector: number[];
    payload: Record<string, any>;
}

// ─── LLM Provider ─────────────────────────────────────────

export interface LLMProvider {
    readonly name: string;

    /** Check if the provider is reachable */
    checkConnection(): Promise<boolean>;

    /** Get available models */
    getModels(): Promise<AIModel[]>;

    /** Get resolved model + temperature from settings */
    getSettings(): Promise<AIModelSettings>;

    /** Non-streaming text generation */
    generate(options: GenerateOptions): Promise<string | null>;

    /** Abort any in-progress streaming chat */
    abortChat(): Promise<void>;
}

// ─── Embedding Provider ───────────────────────────────────

export interface EmbeddingProvider {
    readonly name: string;

    /** Generate embedding vector for text */
    embed(text: string, model?: string): Promise<number[] | null>;

    /** Expected vector dimensionality (for collection creation) */
    getVectorSize(): number;
}

// ─── Vector Store Provider ────────────────────────────────

export interface VectorStoreProvider {
    readonly name: string;

    /** Check if the store is reachable */
    checkConnection(): Promise<boolean>;

    /** Ensure the target collection/index exists */
    ensureCollection(vectorSize?: number): Promise<boolean>;

    /** Upsert points into the store */
    upsert(points: VectorPoint[]): Promise<boolean>;

    /** Semantic vector search */
    search(vector: number[], limit: number, filter?: any): Promise<any[]>;

    /** Delete points matching a filter */
    deleteByFilter(filter: any): Promise<boolean>;

    /** Delete all points */
    clearAll(): Promise<boolean>;

    /** Get points by payload filter (scroll) */
    getPointsByFilter(filter: any, limit?: number): Promise<any[]>;

    /** Delete the entire collection */
    deleteCollection(): Promise<boolean>;

    /** Get count of vectors for an entry */
    getEntryVectorCount(entryId: string): Promise<number>;

    /** Get store info (version, status, etc.) */
    getInfo(): Promise<any>;

    /** Get list of all collections/indexes */
    getCollections(): Promise<string[]>;

    /** Get detailed info for a specific collection */
    getCollectionInfo(name: string): Promise<any>;
}
