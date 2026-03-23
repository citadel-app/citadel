export interface AppCommand {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    category?: string; // e.g., 'Navigation', 'AI', 'System', 'Git'
    shortcut?: string; // e.g., 'Ctrl+S'
    handler: (context?: any) => void | Promise<void>;
    navigationTarget?: string; // Optional path to navigate to before or during execution
    confirmationRequired?: boolean; // Whether to ALWAYS ask for confirmation (manual or AI)
    metadata?: Record<string, any>;
    visible?: boolean | (() => boolean);
    synonyms?: string[]; // Alternate names for searchability
}

export interface CommandSearchResult {
    command: AppCommand;
    score: number; // For fuzzy matching
}
