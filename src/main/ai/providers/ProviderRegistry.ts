/**
 * ProviderRegistry — Resolves the active LLM, embedding, and vector store providers.
 * Refactored for Main process.
 */
import type { LLMProvider, EmbeddingProvider, VectorStoreProvider } from '../../../shared';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { QdrantStore } from './QdrantStore';

export type LLMProviderType = 'ollama' | 'openai' | 'gemini' | 'azure-foundry';
export type EmbeddingProviderType = 'ollama' | 'openai' | 'gemini' | 'azure-foundry';
export type VectorStoreType = 'qdrant' | 'azure-search';

export class ProviderRegistry {
    // Provider instances
    private ollamaProvider: OllamaProvider;
    private openaiProvider: OpenAIProvider;
    private geminiProvider: GeminiProvider;
    private qdrantStore: QdrantStore;

    // Cached settings
    private _llmProviderType: LLMProviderType = 'ollama';
    private _embeddingProviderType: EmbeddingProviderType = 'ollama';
    private _vectorStoreType: VectorStoreType = 'qdrant';

    constructor(appSettings: any) {
        this.ollamaProvider = new OllamaProvider('http://127.0.0.1:11434', appSettings);
        this.openaiProvider = new OpenAIProvider(appSettings);
        this.geminiProvider = new GeminiProvider(appSettings);
        this.qdrantStore = new QdrantStore();
        
        this.configure(appSettings.getSettings());
    }

    /**
     * Configure providers from app settings.
     */
    configure(settings: any) {
        const ai = settings?.ai;
        if (!ai) return;

        // LLM provider
        if (ai.llmProvider) {
            this._llmProviderType = ai.llmProvider;
        } else if (ai.provider) {
            this._llmProviderType = ai.provider;
        }

        // Embedding provider
        if (ai.embeddingProvider) {
            this._embeddingProviderType = ai.embeddingProvider;
        } else if (ai.llmProvider || ai.provider) {
            this._embeddingProviderType = ai.llmProvider || ai.provider;
        }

        // Vector store
        if (ai.vectorStore) {
            this._vectorStoreType = ai.vectorStore;
        }

        // Configure Ollama base URL
        if (ai.ollama?.baseUrl) {
            this.ollamaProvider.setBaseUrl(ai.ollama.baseUrl);
        }

        // Configure OpenAI
        this.openaiProvider.configure({
            apiKey: ai.openai?.apiKey,
            baseUrl: ai.openai?.baseUrl,
            model: ai.openai?.model,
            embedModel: ai.openai?.embedModel
        });

        // Configure Gemini
        this.geminiProvider.configure({
            apiKey: ai.gemini?.apiKey,
            model: ai.gemini?.model,
            embedModel: ai.gemini?.embedModel
        });
        console.log(`[ProviderRegistry] Configured Gemini with API Key: ${ai.gemini?.apiKey ? 'PRESENT' : 'MISSING'}`);

        // Configure Qdrant
        if (ai.qdrant?.baseUrl) {
            this.qdrantStore.setBaseUrl(ai.qdrant.baseUrl);
        }
    }

    // ─── Provider Resolution ──────────────────────

    getLLMProvider(): LLMProvider {
        switch (this._llmProviderType) {
            case 'ollama':
                return this.ollamaProvider;
            case 'openai':
                return this.openaiProvider;
            case 'gemini':
                return this.geminiProvider;
            case 'azure-foundry':
                return this.openaiProvider;
            default:
                console.warn(`[ProviderRegistry] Unknown LLM provider: ${this._llmProviderType}, falling back to ollama`);
                return this.ollamaProvider;
        }
    }

    getEmbeddingProvider(): EmbeddingProvider {
        switch (this._embeddingProviderType) {
            case 'ollama':
                return this.ollamaProvider;
            case 'openai':
                return this.openaiProvider;
            case 'gemini':
                return this.geminiProvider;
            case 'azure-foundry':
                return this.openaiProvider;
            default:
                console.warn(`[ProviderRegistry] Unknown embedding provider: ${this._embeddingProviderType}, falling back to ollama`);
                return this.ollamaProvider;
        }
    }

    getVectorStore(): VectorStoreProvider {
        switch (this._vectorStoreType) {
            case 'qdrant':
                return this.qdrantStore;
            default:
                console.warn(`[ProviderRegistry] Unknown vector store: ${this._vectorStoreType}, falling back to qdrant`);
                return this.qdrantStore;
        }
    }

    getOllamaProvider(): OllamaProvider {
        return this.ollamaProvider;
    }

    getCurrentConfig() {
        return {
            llmProvider: this._llmProviderType,
            embeddingProvider: this._embeddingProviderType,
            vectorStore: this._vectorStoreType
        };
    }
}
