import { type CodexEntry } from './types';

// --- Configuration Interfaces ---

export interface EntryFieldConfig {
    key: keyof CodexEntry | string;
    label: string;
    type: 'text' | 'textarea' | 'tags' | 'url' | 'file' | 'select';
    required?: boolean;
    placeholder?: string;
    description?: string;
    options?: { value: string; label: string }[];
    accept?: string; // For file inputs
    icon?: string;
}

// Base fields shared by all entry types
export const BASE_FIELDS: EntryFieldConfig[] = [
    {
        key: 'title',
        label: 'Title',
        type: 'text',
        placeholder: 'Enter a descriptive title...',
        required: true
    },
    {
        key: 'tags',
        label: 'Tags',
        type: 'tags',
        placeholder: 'Add tags...'
    }
];

export const BASE_METADATA: EntryMetadataConfig[] = [
    { 
        key: 'status', 
        label: 'Status', 
        type: 'select', 
        icon: 'Activity', 
        options: [
            { label: 'Backlog', value: 'backlog' },
            { label: 'Draft', value: 'draft' },
            { label: 'In Progress', value: 'progress' },
            { label: 'Review', value: 'review' },
            { label: 'Completed', value: 'completed' }
        ] 
    }
];

export interface EntryMetadataConfig {
    key: string;        // Property key in entry (e.g. 'author', 'difficulty') or frontmatter
    label: string;      // Display label
    type: 'text' | 'date' | 'url' | 'select' | 'tags';
    options?: { label: string; value: string }[]; // For select types
    placeholder?: string;
    description?: string;
    icon?: string;      // Icon name
}

export interface SectionConfig {
    title: string;
    icon?: string;
    placeholder?: string;
    description?: string;
    editorType?: 'markdown' | 'code' | 'list' | 'whiteboard'; // Default 'markdown'
    isHiddenInNotebooks?: boolean;
}

// --- Module Registry Interfaces ---

export interface ModuleRequirement {
    key: string;       // e.g., 'source'
    types: string[];   // e.g., ['file', 'url']
    label: string;     // e.g., 'Source File'
    description?: string;
}

export interface ModuleDefinition {
    id: string;        // e.g., 'pdf'
    label: string;     // e.g., 'PDF Viewer'
    description?: string;
    requirements: ModuleRequirement[];
}

export interface ModuleConfig {
    id: string;
    map?: Record<string, string>; // Map Requirement Key -> Entry Field Key
}

export interface EntryViewConfig {
    layout: 'split' | 'single';
    modules: {
        primary?: string | ModuleConfig; // Left/Top panel
        secondary?: string | ModuleConfig; // Right/Bottom panel
    };
}

export interface EntryTypeConfig {
    type: CodexEntry['type'] | string; // Allow string for dynamic types
    folder: string; // Folder name relative to vault root
    label: string;
    icon: string;
    accentColor: string;
    accentBg: string;
    accentHover: string;
    description: string;
    category?: string;
    
    // Creation parameters (used in Dialog)
    fields: EntryFieldConfig[];
    
    // Header Metadata (Visible/Editable in EntryHeader)
    metadata: EntryMetadataConfig[];
    
    // Default Sections Structure
    sections: SectionConfig[];
 
    // View Configuration
    view: EntryViewConfig;

    // Serializer key (optional, defaults to "markdown" which maps to StandardMarkdownSerializer)
    serializerKey?: string;

    // Indexing settings
    excludeFromBackgroundIndexing?: boolean;

    // AI settings
    aiFeaturesEnabled?: boolean;
}

export interface AISettings {
    enabled: boolean;
    provider: 'ollama'; 
    ollama: {
        baseUrl: string;
        model: string;
    };
}

export interface WorkspaceSettings {
    theme?: string;
    defaultRemote?: string;
    defaultBranch?: string;
    ai?: AISettings;
}

export interface WorkspaceConfig {
    entries: Record<string, EntryTypeConfig>;
    settings?: WorkspaceSettings;
}

// --- Default Configuration (Serializable) ---

export const DEFAULT_ENTRY_TYPES: Record<string, EntryTypeConfig> = {};

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
    entries: DEFAULT_ENTRY_TYPES,
    settings: {
        defaultRemote: 'origin',
        defaultBranch: 'main',
        ai: {
            enabled: false,
            provider: 'ollama',
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'llama3'
            }
        }
    }
};
