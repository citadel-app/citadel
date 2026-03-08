import { 
    ChatMessage, 
    AIModel, 
    MetadataInput, 
    EntryMetadataPatch, 
    SummaryInput, 
    ProofreadInput, 
    SectionBatteryInput,
    IntentResult,
    CodexEntry
} from '@shared';

interface AIAPI {
    isAvailable: () => Promise<{ 
        available: boolean; 
        reason?: string; 
        services?: { ollama: boolean; active: boolean; ragAvailable: boolean } 
    }>;
    chat: (messages: ChatMessage[], options?: any) => Promise<any>;
    chatStream: (messages: ChatMessage[], options?: any) => Promise<void>;
    onChatUpdate: (callback: (chunk: string) => void) => () => void;
    onChatEnd: (callback: () => void) => () => void;
    generateMetadata: (input: MetadataInput) => Promise<EntryMetadataPatch | null>;
    generateSummary: (input: SummaryInput) => Promise<string | null>;
    proofread: (input: ProofreadInput) => Promise<string | null>;
    generateSection: (input: SectionBatteryInput) => Promise<string | null>;
    indexEntry: (entry: CodexEntry, config?: any) => Promise<{ success: boolean; chunkCount: number; error?: string }>;
    needsIndexing: (entryId: string, reindexIntervalHours?: number) => Promise<boolean>;
    getStructuralContext: (entryId: string, maxChunks?: number) => Promise<string>;
    getContext: (entryId: string, query: string, maxChunks?: number) => Promise<string>;
    search: (query: string, limit?: number) => Promise<any[]>;
    deleteEntryIndex: (entryId: string) => Promise<void>;
    getHardwareSpecs: () => Promise<any>;
    scoreModel: (model: any, specs: any) => Promise<{ score: 'excellent' | 'good' | 'poor'; reason: string }>;
    pullModel: (model: string) => Promise<boolean>;
    onPullProgress: (callback: (data: any) => void) => () => void;
    analyzeIntent: (query: string, entryTypes?: any) => Promise<IntentResult | null>;
    getModels: () => Promise<AIModel[]>;
    abortChat: () => Promise<void>;
}

declare global {
  interface Window {
    electron: any;
    api: {
        fs: any;
        app: {
        openExternal: (url: string) => Promise<void>;
        getInitContext: () => Promise<any>;
        getDownloadsPath: () => Promise<string>;
        openWorkspace: (path: string) => Promise<void>;
    };
        lsp: any;
        net: any;
        window: any;
        dialog: any;
        git: any;
        github: any;
        secrets: any;
        appSettings: any;
        ai: AIAPI;
        system: any;
        latex: any;
        service: any;
        repl: any;
        db: any;
    };
  }
}

export {};
