export interface AIModel {
    name: string;
    size?: number;
    digest?: string;
    details?: {
        parameter_size?: string;
        quantization_level?: string;
        family?: string;
    }
}

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

export interface AIModelSettings {
    model: string;
    temperature: number;
}
export interface PopularModel {
    name: string;
    displayName: string;
    parameters: string;
    size: string;
    installCommand: string;
}
