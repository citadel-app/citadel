import { chatPrompt, ragAnswerPrompt } from '../registry/ChatPrompts';
import { promptEngine } from '../core/PromptEngine';
import { providerRegistry } from '../providers/ProviderRegistry';

export class ChatService {
    /**
     * Streams a chat response from the AI.
     * Routes to Ollama IPC or cloud SSE IPC based on the active provider.
     */
    async chatStream(
        query: string,
        context: string,
        history: { role: 'user' | 'assistant'; content: string }[],
        onChunk: (text: string) => void,
        isRag: boolean = false
    ): Promise<string | null> {
        const llm = providerRegistry.getLLMProvider();
        const settings = await llm.getSettings();
        const providerName = llm.name;
        console.log(`[ChatService] Using provider: ${providerName}, model: ${settings.model}`);

        // Verify connection
        const isOnline = await llm.checkConnection();
        if (!isOnline) {
            console.error(`[ChatService] ${providerName} is offline`);
            onChunk(`⚠️ Error: ${providerName} is not running or not configured.`);
            return null;
        }
        
        // 1. Render Template
        const templateName = isRag ? ragAnswerPrompt['definition'].template : chatPrompt['definition'].template;
        
        const serializedHistory = history
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n\n');

        let prompt: string;
        try {
            prompt = await promptEngine.render(templateName, {
                query,
                context,
                history: serializedHistory
            });
        } catch (e) {
            console.error('[ChatService] Template rendering failed:', e);
            onChunk(`⚠️ Error: Failed to render prompt template. Check console.`);
            throw e;
        }

        console.log(`[ChatService] Rendered Prompt (length: ${prompt.length}):`, prompt.substring(0, 100) + '...');
        
        // 2. Stream via IPC
        try {
            let fullText = '';
            let chunkCount = 0;
            const unsubscribe = window.api.ai.onChatUpdate((chunk: string) => {
                fullText += chunk;
                chunkCount++;
                if (chunkCount === 1) console.log('[ChatService] First chunk received:', chunk.substring(0, 20));
                onChunk(chunk);
            });

            try {
                let result: any;

                if (providerName === 'ollama') {
                    // Ollama: use the original NDJSON streaming endpoint
                    const ollamaProvider = providerRegistry.getOllamaProvider();
                    const baseUrl = ollamaProvider.getBaseUrl();
                    const payload = {
                        model: settings.model,
                        prompt,
                        options: { temperature: settings.temperature }
                    };
                    result = await window.api.ai.chatStream(baseUrl, payload);
                } else {
                    // Cloud providers: use SSE streaming endpoint
                    const config = providerRegistry.getCurrentConfig();
                    const appSettings = await window.api.appSettings.getSettings();
                    const ai = appSettings.ai || {};
                    
                    let baseUrl: string;
                    let apiKey: string;

                    if (providerName === 'gemini') {
                        baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
                        apiKey = ai.gemini?.apiKey || '';
                    } else {
                        // openai / azure-foundry
                        baseUrl = ai.openai?.baseUrl || 'https://api.openai.com/v1';
                        apiKey = ai.openai?.apiKey || '';
                    }

                    result = await window.api.ai.cloudChatStream({
                        provider: config.llmProvider as 'openai' | 'gemini' | 'azure-foundry',
                        baseUrl,
                        apiKey,
                        model: settings.model,
                        prompt,
                        temperature: settings.temperature
                    });
                }

                return typeof result === 'string' ? result : fullText;
            } finally {
                unsubscribe();
            }
        } catch (e) {
            console.error('[ChatService] Chat stream failed:', e);
            throw e;
        }
    }
}

export const chatService = new ChatService();
