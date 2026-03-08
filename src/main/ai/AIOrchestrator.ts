/**
 * AI Orchestrator — Central coordinator for all AI capabilities in the Main process.
 * Handles IPC communication, authorization, RAG retrieval, and provider selection.
 */
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { AppSettingsService } from '../services/AppSettingsService';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { RAGService } from './RAGService';
import { IntentService } from './IntentService';
import { PromptEngine } from './PromptEngine';
import { CodexEntry, ChatMessage, MetadataInput, SummaryInput, ProofreadInput, SectionBatteryInput, IPC_CHANNELS } from '../../shared';
import * as MetadataPrompts from './registry/MetadataPrompts';

export class AIOrchestrator {
    private appSettings: AppSettingsService;
    private providerRegistry: ProviderRegistry;
    private ragService: RAGService;
    private intentService: IntentService;
    private promptEngine: PromptEngine;
    private feedDb: any;
    private registeredCommands: any[] = [];

    constructor(appSettings: AppSettingsService, feedDb: any) {
        this.appSettings = appSettings;
        this.feedDb = feedDb;
        this.providerRegistry = new ProviderRegistry(appSettings);
        this.promptEngine = new PromptEngine();
        this.ragService = new RAGService(this.providerRegistry, appSettings, this.feedDb);
        this.intentService = new IntentService(this.promptEngine, this.providerRegistry);

        // Listen for settings changes
        this.appSettings.on('changed', (settings) => {
            console.log('[AIOrchestrator] Settings changed, reconfiguring providers...');
            this.providerRegistry.configure(settings);
        });
    }

    /**
     * Register IPC handlers for AI capabilities.
     */
    registerHandlers() {
        ipcMain.handle(IPC_CHANNELS.AI_IS_AVAILABLE, () => this.isAvailable());
        ipcMain.handle(IPC_CHANNELS.AI_CHAT, (_event, messages: ChatMessage[], options?: any) => this.chat(messages, options));
        ipcMain.handle(IPC_CHANNELS.AI_STREAM, (_event, messages: ChatMessage[], options?: any) => this.chatStream(_event, messages, options));
        ipcMain.handle(IPC_CHANNELS.AI_ANALYZE_INTENT, (_event, query: string, entryTypes: any) => this.intentService.analyze(query, entryTypes, this.registeredCommands));
        
        ipcMain.on('command:sync-to-main', (_event, commands: any[]) => {
            console.log(`[AIOrchestrator] Synced ${commands.length} commands from renderer`);
            this.registeredCommands = commands;
        });

        ipcMain.handle(IPC_CHANNELS.AI_INDEX_ENTRY, (_event, entry: CodexEntry, config: any) => this.ragService.indexEntry(entry, config));
        ipcMain.handle(IPC_CHANNELS.AI_SEARCH, (_event, query: string, limit?: number) => this.ragService.search(query, limit));
        ipcMain.handle(IPC_CHANNELS.AI_GET_CONTEXT, (_event, entryId: string, query: string, maxChunks?: number) => this.ragService.getContextForPrompt(entryId, query, maxChunks));
        ipcMain.handle(IPC_CHANNELS.AI_GET_STRUCTURAL_CONTEXT, (_event, entryId: string, maxChunks?: number) => this.ragService.getStructuralContext(entryId, maxChunks));
        ipcMain.handle(IPC_CHANNELS.AI_NEEDS_INDEXING, (_event, entryId: string, reindexIntervalHours?: number) => this.ragService.needsIndexing(entryId, reindexIntervalHours));
        ipcMain.handle(IPC_CHANNELS.AI_DELETE_ENTRY_INDEX, (_event, entryId: string) => this.ragService.deleteEntryIndex(entryId));
        ipcMain.handle(IPC_CHANNELS.AI_GET_HARDWARE_SPECS, () => this.getOllamaProvider()?.getHardwareSpecs() || {});
        ipcMain.handle(IPC_CHANNELS.AI_SCORE_MODEL, (_event, model: any, specs: any) => this.getOllamaProvider()?.scoreModel(model, specs));
        ipcMain.handle(IPC_CHANNELS.AI_PULL_MODEL, (event, model: string) => 
            this.getOllamaProvider()?.pullModel(model, (data: any) => 
                event.sender.send(IPC_CHANNELS.AI_PULL_PROGRESS, { model, ...data })
            )
        );
        ipcMain.handle(IPC_CHANNELS.AI_GET_MODELS, () => this.providerRegistry.getLLMProvider().getModels());
        ipcMain.handle(IPC_CHANNELS.AI_ABORT_CHAT, () => this.providerRegistry.getLLMProvider().abortChat());

        // Metadata & Smart Features
        ipcMain.handle(IPC_CHANNELS.AI_GENERATE_METADATA, (_event, input: MetadataInput) => 
            MetadataPrompts.createSmartTagsPrompt(this.promptEngine, this.providerRegistry).execute(input));
        ipcMain.handle(IPC_CHANNELS.AI_GENERATE_SUMMARY, (_event, input: SummaryInput) => 
            MetadataPrompts.createSummaryPrompt(this.promptEngine, this.providerRegistry).execute(input));
        ipcMain.handle(IPC_CHANNELS.AI_PROOFREAD, (_event, input: ProofreadInput) => 
            MetadataPrompts.createProofreadPrompt(this.promptEngine, this.providerRegistry).execute(input));
        ipcMain.handle(IPC_CHANNELS.AI_GENERATE_SECTION, (_event, input: SectionBatteryInput) => 
            MetadataPrompts.createSectionBatteryPrompt(this.promptEngine, this.providerRegistry).execute(input));
    }

    /**
     * Check if AI is enabled and providers are reachable.
     */
    async isAvailable() {
        const settings = this.appSettings.getSettings();
        if (!settings.ai?.enabled) {
            return { available: false, reason: 'AI is disabled in settings.' };
        }

        const stats = {
            ollama: false,
            active: false,
            ragAvailable: false
        };

        try {
            // 1. Check Ollama (Target for "Watchtower")
            const ollama = this.providerRegistry.getOllamaProvider();
            stats.ollama = await ollama.checkConnection();

            // 2. Check Active LLM
            const llm = this.providerRegistry.getLLMProvider();
            if (llm.name === 'ollama') {
                stats.active = stats.ollama;
            } else {
                stats.active = await llm.checkConnection();
            }

            // 3. Check RAG
            const ragStatus = await this.ragService.isAvailable();
            stats.ragAvailable = ragStatus.available;

            return { 
                available: stats.active, 
                services: stats,
                ragAvailable: stats.ragAvailable,
                ragReason: ragStatus.reason 
            };
        } catch (e) {
            return { available: false, reason: String(e), services: stats };
        }
    }

    /**
     * Non-streaming chat.
     */
    async chat(messages: ChatMessage[], options: any = {}) {
        const settings = this.appSettings.getSettings();
        if (!settings.ai?.enabled) throw new Error('AI is disabled');

        const llm = this.providerRegistry.getLLMProvider();
        const llmSettings = await llm.getSettings();

        // 1. Resolve Template & Context
        const templateName = options.useRAG ? 'chat-answer' : 'quick-ask';
        let contextData = '';
        
        if (options.useRAG && options.entryId) {
            contextData = await this.ragService.getContextForPrompt(options.entryId, messages[messages.length - 1].content);
        }

        const history = messages.slice(0, -1)
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const renderedPrompt = await this.promptEngine.render(templateName, {
            query: messages[messages.length - 1].content,
            context: contextData,
            history
        });

        // 2. Generate
        return llm.generate({
            model: options.model || llmSettings.model,
            prompt: renderedPrompt,
            system: options.system || 'You are Citadel, a helpful research assistant.',
            temperature: options.temperature ?? llmSettings.temperature,
            stream: false
        });
    }

    /**
     * Streaming chat via IPC events.
     */
    async chatStream(event: IpcMainInvokeEvent, messages: ChatMessage[], options: any = {}) {
        const settings = this.appSettings.getSettings();
        if (!settings.ai?.enabled) throw new Error('AI is disabled');

        const llm = this.providerRegistry.getLLMProvider();
        const llmSettings = await llm.getSettings();
        
        // 1. Resolve Template & Context
        const templateName = options.useRAG ? 'chat-answer' : 'quick-ask';
        let contextData = '';
        
        if (options.useRAG && options.entryId) {
            contextData = await this.ragService.getContextForPrompt(options.entryId, messages[messages.length - 1].content);
        }

        const history = messages.slice(0, -1)
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const renderedPrompt = await this.promptEngine.render(templateName, {
            query: messages[messages.length - 1].content,
            context: contextData,
            history
        });

        const system = options.system || 'You are Citadel, a helpful research assistant.';
        
        console.log(`[AIOrchestrator] Starting stream using template: ${templateName}`);
        
        // Non-streaming fallback (providers need update for real streaming)
        const result = await llm.generate({
            model: options.model || llmSettings.model,
            prompt: renderedPrompt,
            system,
            temperature: options.temperature ?? llmSettings.temperature,
            stream: false
        });

        if (result) {
            event.sender.send(IPC_CHANNELS.AI_CHAT_CHUNK, result);
        }
        event.sender.send(IPC_CHANNELS.AI_CHAT_END);
    }

    private getOllamaProvider(): any {
        const provider = this.providerRegistry.getLLMProvider();
        return provider.name === 'ollama' ? provider : null;
    }
}
