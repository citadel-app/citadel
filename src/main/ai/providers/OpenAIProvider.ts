/**
 * OpenAIProvider — LLM + Embedding provider for OpenAI-compatible APIs.
 * Refactored for Main process.
 */
import { net } from 'electron';
import type { LLMProvider, EmbeddingProvider, AIModelSettings, GenerateOptions, AIModel } from '../../../shared';

export class OpenAIProvider implements LLMProvider, EmbeddingProvider {
    readonly name = 'openai';
    private apiKey: string = '';
    private baseUrl: string = 'https://api.openai.com/v1';
    private defaultModel: string = 'gpt-4o-mini';
    private defaultEmbedModel: string = 'text-embedding-3-small';
    private appSettings: any;

    constructor(appSettings?: any) {
        this.appSettings = appSettings;
    }

    configure(config: { apiKey?: string; baseUrl?: string; model?: string; embedModel?: string }) {
        if (config.apiKey) this.apiKey = config.apiKey;
        if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
        if (config.model) this.defaultModel = config.model;
        if (config.embedModel) this.defaultEmbedModel = config.embedModel;
    }

    setAppSettings(settings: any) {
        this.appSettings = settings;
    }

    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
    }

    // ─── LLMProvider ──────────────────────────────

    async checkConnection(): Promise<boolean> {
        return !!this.apiKey;
    }

    async getModels(): Promise<AIModel[]> {
        try {
            const response = await net.fetch(`${this.baseUrl}/models`, {
                headers: this.getHeaders()
            });
            if (!response.ok) return [];
            const data = await response.json() as any;
            return (data.data || []).map((m: any) => ({
                name: m.id,
                details: { family: m.owned_by }
            }));
        } catch (e) {
            console.error('[OpenAIProvider] Failed to get models:', e);
            return [];
        }
    }

    async getSettings(): Promise<AIModelSettings> {
        let model = this.defaultModel;
        let temperature = 0.7;

        if (this.appSettings) {
            const settings = this.appSettings.getSettings();
            if (settings.ai?.openai?.model) model = settings.ai.openai.model;
            if (settings.ai?.aiTemperature !== undefined) temperature = settings.ai.aiTemperature;
        }

        return { model, temperature };
    }

    async generate(options: GenerateOptions): Promise<string | null> {
        if (!this.apiKey) {
            console.error('[OpenAIProvider] No API key configured');
            return null;
        }

        try {
            const messages: any[] = [];
            if (options.system) {
                messages.push({ role: 'system', content: options.system });
            }
            messages.push({ role: 'user', content: options.prompt });

            const body: any = {
                model: options.model || this.defaultModel,
                messages,
                temperature: options.temperature ?? 0.7,
                stream: false
            };

            if (options.format === 'json') {
                body.response_format = { type: 'json_object' };
            }

            const response = await net.fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OpenAIProvider] Generation failed (${response.status}):`, errorText);
                return `[OpenAIProvider] Generation failed (${response.status}): ${errorText}`;
            }

            const data = await response.json() as any;
            return data.choices?.[0]?.message?.content || null;
        } catch (e) {
            console.error('[OpenAIProvider] Request failed:', e);
            return null;
        }
    }

    async abortChat(): Promise<void> {
        // Handled via AbortController in Orchestrator
    }

    // ─── EmbeddingProvider ────────────────────────

    async embed(text: string, model?: string): Promise<number[] | null> {
        if (!this.apiKey) {
            console.error('[OpenAIProvider] No API key configured for embedding');
            return null;
        }

        try {
            const response = await net.fetch(`${this.baseUrl}/embeddings`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    model: model || this.defaultEmbedModel,
                    input: text
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OpenAIProvider] Embedding failed (${response.status}):`, errorText);
                return null;
            }

            const data = await response.json() as any;
            return data.data?.[0]?.embedding || null;
        } catch (e) {
            console.error('[OpenAIProvider] Embedding failed:', e);
            return null;
        }
    }

    getVectorSize(): number {
        if (this.defaultEmbedModel.includes('3-large')) return 3072;
        return 1536;
    }
}
