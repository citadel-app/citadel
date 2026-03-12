import { CodexEntry } from '../../../shared';

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

export interface EntryMetadataConfig {
    key: string;        // Property key in entry (e.g. 'author', 'difficulty') or frontmatter
    label: string;      // Display label
    type: 'text' | 'date' | 'url' | 'select' | 'tags';
    options?: { label: string; value: string }[]; // For select types
    placeholder?: string;
    description?: string;
    icon?: string;      // Icon name
}

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
    fields: EntryFieldConfig[];
    metadata: EntryMetadataConfig[];
    sections: SectionConfig[];
    view: EntryViewConfig;
    serializerKey?: string;
    excludeFromBackgroundIndexing?: boolean;
    aiFeaturesEnabled?: boolean;
}

export interface WorkspaceConfig {
    entries: Record<string, EntryTypeConfig>;
    modules?: Record<string, ModuleDefinition>;
}
