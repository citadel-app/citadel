/**
 * GeminiProvider — LLM + Embedding provider for Google Gemini API.
 * Refactored for Main process.
 */
import { net } from 'electron';
import type { LLMProvider, EmbeddingProvider, AIModelSettings, GenerateOptions, AIModel } from '@citadel-app/core';

export class GeminiProvider implements LLMProvider, EmbeddingProvider {
    readonly name = 'gemini';
    private apiKey: string = '';
    private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
    private defaultModel: string = 'gemini-2.0-flash';
    private defaultEmbedModel: string = 'text-embedding-004';
    private appSettings: any;

    constructor(appSettings?: any) {
        this.appSettings = appSettings;
    }

    configure(config: { apiKey?: string; model?: string; embedModel?: string }) {
        console.log(`[GeminiProvider] Configuring with: API Key: ${config.apiKey ? 'PRESENT' : 'MISSING'}, Model: ${config.model}`);
        if (config.apiKey !== undefined) this.apiKey = config.apiKey;
        if (config.model) this.defaultModel = config.model;
        if (config.embedModel) this.defaultEmbedModel = config.embedModel;
    }

    setAppSettings(settings: any) {
        this.appSettings = settings;
    }

    // ─── LLMProvider ──────────────────────────────

    async checkConnection(): Promise<boolean> {
        return !!this.apiKey;
    }

    async getModels(): Promise<AIModel[]> {
        try {
            const response = await net.fetch(
                `${this.baseUrl}/models?key=${this.apiKey}`
            );
            if (!response.ok) return [];
            const data = await response.json() as any;
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

        if (this.appSettings) {
            const settings = this.appSettings.getSettings();
            if (settings.ai?.gemini?.model) model = settings.ai.gemini.model;
            if (settings.ai?.aiTemperature !== undefined) temperature = settings.ai.aiTemperature;
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

            const response = await net.fetch(
                `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[GeminiProvider] Generation failed (${response.status}):`, errorText);
                return `[GeminiProvider] Generation failed (${response.status}): ${errorText}`;
            }

            const data = await response.json() as any;
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (e) {
            console.error('[GeminiProvider] Request failed:', e);
            return null;
        }
    }

    async abortChat(): Promise<void> {
        // Handled via AbortController in Orchestrator
    }

    // ─── EmbeddingProvider ────────────────────────

    async embed(text: string, model?: string): Promise<number[] | null> {
        if (!this.apiKey) {
            console.error('[GeminiProvider] No API key configured for embedding');
            return null;
        }

        try {
            const embedModel = model || this.defaultEmbedModel;

            const response = await net.fetch(
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
                const errorText = await response.text();
                console.error(`[GeminiProvider] Embedding failed (${response.status}):`, errorText);
                return null;
            }

            const data = await response.json() as any;
            return data.embedding?.values || null;
        } catch (e) {
            console.error('[GeminiProvider] Embedding failed:', e);
            return null;
        }
    }

    getVectorSize(): number {
        return 768;
    }
}
