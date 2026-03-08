export interface AIModel {
    name: string;
    size?: number;
    digest?: string;
    details?: {
        parameter_size?: string;
        quantization_level?: string;
        family?: string;
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: { id: string; type: string; title: string }[];
    commandProposal?: {
        commandId: string;
        args?: any[];
        status: 'pending' | 'approved' | 'rejected';
    };
}

export interface AIResponseChunk {
    content?: string;
    done: boolean;
    error?: string;
}

export interface IntentResult {
    searchQuery: string;
    navigationIntent: {
        intent: 'navigate_app' | 'navigate_entry';
        target: string;
        confidence: number;
    } | null;
    commandIntent: {
        commandId: string;
        args: any[];
        confidence: number;
    } | null;
    isComplex: boolean;
    requiresContext: boolean;
}

export interface SmartActionResult {
    success: boolean;
    data?: any;
    error?: string;
}

export type SmartActionType = 'summarize' | 'fix-grammar' | 'suggest-tags';

export interface OllamaGenerateResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

// --- Metadata & Smart Actions ---
export interface EntryMetadataPatch {
    title?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface MetadataInput {
    content: string;
    title: string;
    existingTags: string[];
    schema: string;
    context: string;
}

export interface SummaryInput {
    content: string;
    context?: string;
}

export interface ProofreadInput {
    content: string;
}

export interface SectionBatteryInput {
    sectionTitle: string;
    instructions: string;
    context: string;
    currentContent: string;
}
