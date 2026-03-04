/**
 * OllamaProvider — LLM + Embedding provider wrapping the existing OllamaClient.
 */
import type { LLMProvider, EmbeddingProvider, AIModel, AIModelSettings, GenerateOptions } from './interfaces';

export class OllamaProvider implements LLMProvider, EmbeddingProvider {
    readonly name = 'ollama';
    private baseUrl: string;

    constructor(baseUrl: string = 'http://127.0.0.1:11434') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    setBaseUrl(url: string) {
        this.baseUrl = url.replace(/\/$/, '');
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    // ─── LLMProvider ──────────────────────────────

    async checkConnection(): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async getModels(): Promise<AIModel[]> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
            const data = JSON.parse(response.text);
            return data.models || [];
        } catch (e) {
            console.error('[OllamaProvider] Failed to get models:', e);
            throw e;
        }
    }

    async getSettings(): Promise<AIModelSettings> {
        let model: string | undefined;
        let temperature = 0.7;

        try {
            const settings = await window.api.appSettings.getSettings();
            model = settings.ai?.ollama?.model;
            if (settings.ai?.aiTemperature !== undefined) {
                temperature = settings.ai.aiTemperature;
            }
        } catch (e) {
            console.warn('[OllamaProvider] Failed to fetch settings:', e);
        }

        if (!model) {
            model = localStorage.getItem('ai_ollama_model') || undefined;
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

            const response = await window.api.net.fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                console.error(`[OllamaProvider] Generation failed (${response.status}):`, response.text);
                return null;
            }

            const data = JSON.parse(response.text);
            return data.response || null;
        } catch (e) {
            console.error('[OllamaProvider] Request failed:', e);
            return null;
        }
    }

    async abortChat(): Promise<void> {
        await window.api.ai.abortChat();
    }

    // ─── EmbeddingProvider ────────────────────────

    async embed(text: string, model: string = 'nomic-embed-text'): Promise<number[] | null> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, input: text })
            });

            if (!response.ok) {
                console.error(`[OllamaProvider] Embedding failed (${response.status}):`, response.text);
                return null;
            }
            const data = JSON.parse(response.text);
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

    async pullModel(model: string, onProgress?: (data: { status: string; completed?: number; total?: number; digest?: string }) => void): Promise<boolean> {
        let unsubscribe: (() => void) | undefined;
        try {
            if (onProgress) {
                unsubscribe = window.api.ai.onPullProgress(onProgress);
            }
            await window.api.ai.pullModel(this.baseUrl, model);
            return true;
        } catch (e) {
            console.error('[OllamaProvider] Failed to pull model:', e);
            if (onProgress) onProgress({ status: `Error: ${e}` });
            return false;
        } finally {
            if (unsubscribe) unsubscribe();
        }
    }

    async getHardwareSpecs(): Promise<any> {
        return window.api.ai.getHardwareSpecs();
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
