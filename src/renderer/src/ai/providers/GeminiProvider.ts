/**
 * GeminiProvider — LLM + Embedding provider for Google Gemini API.
 */
import type { LLMProvider, EmbeddingProvider, AIModel, AIModelSettings, GenerateOptions } from './interfaces';

export class GeminiProvider implements LLMProvider, EmbeddingProvider {
    readonly name = 'gemini';
    private apiKey: string = '';
    private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
    private defaultModel: string = 'gemini-2.0-flash';
    private defaultEmbedModel: string = 'text-embedding-004';

    configure(config: { apiKey?: string; model?: string; embedModel?: string }) {
        if (config.apiKey) this.apiKey = config.apiKey;
        if (config.model) this.defaultModel = config.model;
        if (config.embedModel) this.defaultEmbedModel = config.embedModel;
    }

    // ─── LLMProvider ──────────────────────────────

    async checkConnection(): Promise<boolean> {
        if (!this.apiKey) return false;
        try {
            const response = await window.api.net.fetch(
                `${this.baseUrl}/models?key=${this.apiKey}`
            );
            return response.ok;
        } catch {
            return false;
        }
    }

    async getModels(): Promise<AIModel[]> {
        try {
            const response = await window.api.net.fetch(
                `${this.baseUrl}/models?key=${this.apiKey}`
            );
            if (!response.ok) return [];
            const data = JSON.parse(response.text);
            return (data.models || []).map((m: any) => ({
                name: m.name?.replace('models/', '') || m.name,
                details: {
                    family: 'gemini',
                    parameter_size: m.displayName
                }
            }));
        } catch (e) {
            console.error('[GeminiProvider] Failed to get models:', e);
            return [];
        }
    }

    async getSettings(): Promise<AIModelSettings> {
        let model = this.defaultModel;
        let temperature = 0.7;

        try {
            const settings = await window.api.appSettings.getSettings();
            if (settings.ai?.gemini?.model) model = settings.ai.gemini.model;
            if (settings.ai?.aiTemperature !== undefined) temperature = settings.ai.aiTemperature;
        } catch (e) {
            console.warn('[GeminiProvider] Failed to fetch settings:', e);
        }

        return { model, temperature };
    }

    async generate(options: GenerateOptions): Promise<string | null> {
        if (!this.apiKey) {
            console.error('[GeminiProvider] No API key configured');
            return null;
        }

        try {
            const model = options.model || this.defaultModel;
            const contents: any[] = [];

            if (options.system) {
                contents.push({ role: 'user', parts: [{ text: options.system }] });
                contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
            }
            contents.push({ role: 'user', parts: [{ text: options.prompt }] });

            const body: any = {
                contents,
                generationConfig: {
                    temperature: options.temperature ?? 0.7,
                }
            };

            if (options.format === 'json') {
                body.generationConfig.responseMimeType = 'application/json';
            }

            const response = await window.api.net.fetch(
                `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                console.error(`[GeminiProvider] Generation failed (${response.status}):`, response.text);
                return null;
            }

            const data = JSON.parse(response.text);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (e) {
            console.error('[GeminiProvider] Request failed:', e);
            return null;
        }
    }

    async abortChat(): Promise<void> {
        await window.api.ai.abortChat();
    }

    // ─── EmbeddingProvider ────────────────────────

    async embed(text: string, model?: string): Promise<number[] | null> {
        if (!this.apiKey) {
            console.error('[GeminiProvider] No API key configured for embedding');
            return null;
        }

        try {
            const embedModel = model || this.defaultEmbedModel;

            const response = await window.api.net.fetch(
                `${this.baseUrl}/models/${embedModel}:embedContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: `models/${embedModel}`,
                        content: { parts: [{ text }] }
                    })
                }
            );

            if (!response.ok) {
                console.error(`[GeminiProvider] Embedding failed (${response.status}):`, response.text);
                return null;
            }

            const data = JSON.parse(response.text);
            return data.embedding?.values || null;
        } catch (e) {
            console.error('[GeminiProvider] Embedding failed:', e);
            return null;
        }
    }

    getVectorSize(): number {
        // text-embedding-004 = 768
        return 768;
    }
}
