/**
 * OllamaProvider — LLM + Embedding provider wrapping the existing OllamaClient.
 * Refactored for Main process.
 */
import { net } from 'electron';
import type { LLMProvider, EmbeddingProvider, AIModelSettings, GenerateOptions, AIModel } from '../../../shared';

export class OllamaProvider implements LLMProvider, EmbeddingProvider {
    readonly name = 'ollama';
    private baseUrl: string;
    private appSettings: any;

    constructor(baseUrl: string = 'http://127.0.0.1:11434', appSettings?: any) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.appSettings = appSettings;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url.replace(/\/$/, '');
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    setAppSettings(settings: any) {
        this.appSettings = settings;
    }

    // ─── LLMProvider ──────────────────────────────

    async checkConnection(): Promise<boolean> {
        try {
            const response = await net.fetch(`${this.baseUrl}/`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async getModels(): Promise<AIModel[]> {
        try {
            const response = await net.fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
            const data = await response.json() as any;
            return data.models || [];
        } catch (e) {
            console.error('[OllamaProvider] Failed to get models:', e);
            throw e;
        }
    }

    async getSettings(): Promise<AIModelSettings> {
        let model: string | undefined;
        let temperature = 0.7;

        if (this.appSettings) {
            const settings = this.appSettings.getSettings();
            model = settings.ai?.ollama?.model;
            if (settings.ai?.aiTemperature !== undefined) {
                temperature = settings.ai.aiTemperature;
            }
        }

        if (!model) {
            const models = await this.getModels();
            if (models.length > 0) {
                model = models[0].name;
            } else {
                model = 'llama3';
            }
        }

        return { model, temperature };
    }

    async generate(options: GenerateOptions): Promise<string | null> {
        try {
            const body = {
                model: options.model,
                prompt: options.prompt,
                system: options.system,
                template: options.template,
                context: options.context,
                stream: options.stream ?? false,
                format: options.format,
                options: {
                    temperature: options.temperature ?? 0.7
                }
            };

            const response = await net.fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OllamaProvider] Generation failed (${response.status}):`, errorText);
                return `[OllamaProvider] Generation failed (${response.status}): ${errorText}`;
            }

            const data = await response.json() as any;
            return data.response || null;
        } catch (e) {
            console.error('[OllamaProvider] Request failed:', e);
            return null;
        }
    }

    async abortChat(): Promise<void> {
        // Handled by AbortController in Orchestrator
    }

    // ─── EmbeddingProvider ────────────────────────

    async embed(text: string, model: string = 'nomic-embed-text'): Promise<number[] | null> {
        try {
            const response = await net.fetch(`${this.baseUrl}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, input: text })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OllamaProvider] Embedding failed (${response.status}):`, errorText);
                return null;
            }
            const data = await response.json() as any;
            return data.embeddings?.[0] || null;
        } catch (e) {
            console.error('[OllamaProvider] Embedding failed:', e);
            return null;
        }
    }

    getVectorSize(): number {
        return 768; // nomic-embed-text default
    }

    // ─── Ollama-specific (hardware, model management) ──

    async pullModel(_model: string, _onProgress?: (data: { status: string; completed?: number; total?: number; digest?: string }) => void): Promise<boolean> {
        // Implementation for pulling models via net.fetch stream if needed in Main
        // For now, this might stay an IPC if it's strictly a UI action, 
        // but here it's easier to use the existing Main-side pull logic if it exists.
        console.warn('[OllamaProvider] pullModel not fully implemented in Main yet');
        return false;
    }

    async getHardwareSpecs(): Promise<any> {
       // This would call internal OS utils in Main
       return {}; 
    }

    scoreModel(model: { parameters: string }, specs: { totalMemory: number; gpus: { model: string; vram: number }[] }): { score: 'excellent' | 'good' | 'poor'; reason: string } {
        const ramGB = specs.totalMemory / (1024 * 1024 * 1024);
        const vramGB = specs.gpus.reduce((acc, gpu) => acc + (gpu.vram || 0), 0) / 1024;
        const paramsMatch = model.parameters.match(/([\d.]+)B/);
        const params = paramsMatch ? parseFloat(paramsMatch[1]) : 0;

        if (vramGB > 0) {
            if (params <= 3 && vramGB >= 4) return { score: 'excellent', reason: 'Fits in VRAM (Fast)' };
            if (params <= 9 && vramGB >= 8) return { score: 'excellent', reason: 'Fits in VRAM (Fast)' };
            if (params <= 14 && vramGB >= 12) return { score: 'excellent', reason: 'Fits in VRAM (Fast)' };
            if (params >= 30 && vramGB >= 24) return { score: 'excellent', reason: 'Fits in VRAM (Fast)' };
        }

        if (params <= 3) {
            if (ramGB >= 8) return { score: 'excellent', reason: 'Plenty of RAM' };
            if (ramGB >= 4) return { score: 'good', reason: 'Sufficient RAM' };
            return { score: 'poor', reason: 'Low RAM (May freeze)' };
        }
        if (params <= 9) {
            if (ramGB >= 16) return { score: 'good', reason: 'Good RAM capacity' };
            if (ramGB >= 8) return { score: 'good', reason: 'Minimum RAM met' };
            return { score: 'poor', reason: 'Insufficient RAM' };
        }
        if (params <= 14) {
            if (ramGB >= 32) return { score: 'good', reason: 'Good RAM capacity' };
            if (ramGB >= 16) return { score: 'good', reason: 'Minimum RAM met' };
            return { score: 'poor', reason: 'Requires 16GB+ RAM' };
        }
        if (params >= 30) {
            if (ramGB >= 64) return { score: 'good', reason: 'Good RAM capacity' };
            if (ramGB >= 32) return { score: 'good', reason: 'Minimum RAM met' };
            return { score: 'poor', reason: 'Requires 32GB+ RAM' };
        }

        return { score: 'good', reason: 'Unknown requirements' };
    }
}
