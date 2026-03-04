import { CodexEntry } from '../lib/db';

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
    modules?: Record<string, ModuleDefinition>; // The Registry
    settings?: WorkspaceSettings;
}

// --- Default Configuration (Serializable) ---

const DEFAULT_MODULES: Record<string, ModuleDefinition> = {
    pdf: {
        id: 'pdf',
        label: 'PDF Viewer',
        description: 'View and highlight PDF documents.',
        requirements: [
            { key: 'source', types: ['file', 'url'], label: 'PDF Source', description: 'File path or URL to the PDF' }
        ]
    },
    webview: {
        id: 'webview',
        label: 'Web Browser',
        description: 'Embedded web browser for viewing URLs.',
        requirements: [
            { key: 'url', types: ['url'], label: 'Website URL', description: 'The URL to load' }
        ]
    },
    code: {
        id: 'code',
        label: 'Code Editor',
        description: 'Monaco code editor.',
        requirements: [] // Uses content
    },
    sections: {
        id: 'sections',
        label: 'Notes & Sections',
        description: 'Structured markdown notes.',
        requirements: [] // Uses content/sections
    },
    whiteboard: {
        id: 'whiteboard',
        label: 'Whiteboard',
        description: 'Canvas for drawing.',
        requirements: [] // Uses content/frontmatter
    }
};

const DEFAULT_ENTRY_TYPES: Record<string, EntryTypeConfig> = {
    paper: {
        type: 'paper',
        folder: '03_Papers',
        label: 'Academic Paper',
        icon: 'BookOpen',
        accentColor: 'text-blue-500',
        accentBg: 'bg-blue-500/10',
        accentHover: 'hover:bg-blue-500/20',
        description: 'Read and annotate academic papers with powerful highlighting.',
        fields: [
            { key: 'title', label: 'Title', type: 'text', required: true },
            { key: 'pdfPath', label: 'Upload PDF', type: 'file', accept: '.pdf' },
            { key: 'sourceUrl', label: 'Source URL (PDF)', type: 'url', description: 'Link to the PDF file' },
            { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'AI, ML, Transformer' }
        ],
        metadata: [
            ...BASE_METADATA,
            { key: 'author', label: 'Author', type: 'text', icon: 'User', placeholder: 'Authors' },
            { key: 'publishedAt', label: 'Published', type: 'date', icon: 'Calendar' },
            { key: 'sourceUrl', label: 'Source PDF', type: 'url', icon: 'Link' }
        ],
        sections: [
            { 
                title: 'Abstract', 
                icon: 'ScrollText', 
                placeholder: 'Paste abstract here...',
                description: 'Extract the abstract or summary of the paper into this section. Keep it concise. Focus on the core objective and results.'
            },
            { 
                title: 'Summary', 
                icon: 'FileText',
                description: 'Write a comprehensive but scannable summary of the paper. Use bullet points for key takeaways.'
            },
            { 
                title: 'Key Concepts', 
                icon: 'Lightbulb',
                description: 'Identify and define the 3-5 most important technical concepts or terms introduced or heavily used in this paper.'
            },
            { 
                title: 'Methodology', 
                icon: 'FlaskConical',
                description: 'Describe the research method, experiment setup, or algorithm architecture used in this study.'
            },
            { 
                title: 'Results', 
                icon: 'BarChart',
                description: 'Summarize the quantitative and qualitative findings of the paper. Include performance metrics if available.'
            },
            { 
                title: 'Critique', 
                icon: 'MessageSquare',
                description: 'Analyze potential limitations, trade-offs, or areas for improvement mentioned in the paper or inferred from the methodology.'
            }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: {
                    id: 'pdf',
                    map: { source: 'pdfPath' } // Default mapping
                },
                secondary: 'sections'
            }
        },
        serializerKey: 'markdown'
    },
    problem: {
        type: 'problem',
        folder: '01_Problems',
        label: 'Code Problem',
        icon: 'Code2',
        accentColor: 'text-green-500',
        accentBg: 'bg-green-500/10',
        accentHover: 'hover:bg-green-500/20',
        description: 'Track coding problems, solutions, and patterns.',
        fields: [
            { key: 'title', label: 'Problem Name', type: 'text', required: true },
            { key: 'source', label: 'Source (e.g. LeetCode)', type: 'text', placeholder: 'LeetCode, HackerRank, etc.' },
            { key: 'sourceId', label: 'Problem ID/Number', type: 'text', placeholder: 'e.g. 42' },
            { key: 'difficulty', label: 'Difficulty', type: 'select', options: [
                { label: 'Easy', value: 'Easy' }, 
                { label: 'Medium', value: 'Medium' }, 
                { label: 'Hard', value: 'Hard' }
            ]},
            { key: 'sourceUrl', label: 'Source URL', type: 'url' },
            { key: 'tags', label: 'Tags', type: 'tags' },
            { key: 'companies', label: 'Companies', type: 'tags' }
        ],
        metadata: [
            ...BASE_METADATA,
            { key: 'difficulty', label: 'Difficulty', type: 'select', icon: 'BarChart', options: [
                { label: 'Easy', value: 'Easy' }, 
                { label: 'Medium', value: 'Medium' }, 
                { label: 'Hard', value: 'Hard' }
            ]},
            { key: 'source', label: 'Source', type: 'text', icon: 'Globe' },
            { key: 'sourceId', label: 'Problem ID', type: 'text', icon: 'Hash' },
            { key: 'sourceUrl', label: 'Link', type: 'url', icon: 'Link' },
            { key: 'companies', label: 'Companies', type: 'tags', icon: 'Building2' }
        ],
        sections: [
            { title: 'Problem Statement', icon: 'FileQuestion' },
            { title: 'Approach 1: Brute Force', icon: 'Brain', placeholder: '### Logic\n\n### Complexity\n- Time: O(?)\n- Space: O(?)' },
            { title: 'Approach 2: Optimal', icon: 'Zap', placeholder: '### Logic\n\n### Complexity\n- Time: O(?)\n- Space: O(?)' },
            { title: 'Code Solution', icon: 'Code', editorType: 'code' }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: 'sections',
                secondary: 'code'
            }
        },
        serializerKey: 'markdown'
    },
    design: {
        type: 'design',
        folder: '02_Design',
        label: 'System Design',
        icon: 'Layout',
        accentColor: 'text-purple-500',
        accentBg: 'bg-purple-500/10',
        accentHover: 'hover:bg-purple-500/20',
        description: 'Design software architectures and document decisions.',
        fields: [
            { key: 'title', label: 'System Name', type: 'text', required: true },
            { key: 'tags', label: 'Tags', type: 'tags' }
        ],
        metadata: [
            ...BASE_METADATA
        ],
        sections: [
            { title: 'Requirements', icon: 'ClipboardList', editorType: 'list' },
            { title: 'High Level Design', icon: 'Box' },
            { title: 'Architecture Diagram', icon: 'PenTool', editorType: 'whiteboard' },
            { title: 'Data Model', icon: 'Database' },
            { title: 'API Design', icon: 'Server', editorType: 'code' },
            { title: 'Trade-offs', icon: 'Scale' }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: 'sections',
                secondary: 'whiteboard'
            }
        },
        serializerKey: 'markdown'
    },
    rfc: {
        type: 'rfc',
        folder: '04_RFCs',
        label: 'IETF RFC',
        icon: 'FileText',
        accentColor: 'text-orange-500',
        accentBg: 'bg-orange-500/10',
        accentHover: 'hover:bg-orange-500/20',
        description: 'Study internet standards and RFCs.',
        fields: [
            { key: 'title', label: 'RFC Title', type: 'text', required: true },
            { key: 'pdfPath', label: 'Upload PDF', type: 'file', accept: '.pdf' },
            { key: 'sourceUrl', label: 'RFC URL', type: 'url' }
        ],
        metadata: [
            ...BASE_METADATA,
            { key: 'rfcNumber', label: 'RFC #', type: 'text', icon: 'Hash' },
            { key: 'sourceUrl', label: 'Original URL', type: 'url', icon: 'Link' }
        ],
        sections: [
            { title: 'Overview', icon: 'Info' },
            { title: 'Key Mechanisms', icon: 'Settings' },
            { title: 'Security Considerations', icon: 'ShieldAlert' },
            { title: 'Implementation Notes', icon: 'PenTool' }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: {
                    id: 'pdf',
                    map: { source: 'pdfPath' }
                },
                secondary: 'sections'
            }
        },
        serializerKey: 'markdown'
    },
    blog: {
        type: 'blog',
        folder: '05_Blogs',
        label: 'Tech Blog',
        icon: 'PenTool',
        accentColor: 'text-pink-500',
        accentBg: 'bg-pink-500/10',
        accentHover: 'hover:bg-pink-500/20',
        description: 'Read and verify technical blog posts.',
        fields: [
            { key: 'title', label: 'Article Title', type: 'text', required: true },
            { key: 'sourceUrl', label: 'Blog URL', type: 'url' }
        ],
        metadata: [
            ...BASE_METADATA,
            { key: 'author', label: 'Author', type: 'text', icon: 'User' },
            { key: 'sourceUrl', label: 'Original Post', type: 'url', icon: 'Link' }
        ],
        sections: [
            { title: 'Core Argument', icon: 'MessageCircle' },
            { title: 'Technical Details', icon: 'Code' },
            { title: 'My Take', icon: 'Brain' },
            { title: 'References', icon: 'Link' }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: {
                    id: 'webview',
                    map: { url: 'sourceUrl' }
                },
                secondary: 'sections'
            }
        },
        serializerKey: 'markdown'
    },
    standard: {
        type: 'standard',
        folder: '06_Standards',
        label: 'Protocol/Standard',
        icon: 'Shield',
        accentColor: 'text-indigo-500',
        accentBg: 'bg-indigo-500/10',
        accentHover: 'hover:bg-indigo-500/20',
        description: 'Deep dive into technical specifications.',
        fields: [
            { key: 'title', label: 'Standard Name', type: 'text', required: true },
            { key: 'pdfPath', label: 'Upload PDF', type: 'file', accept: '.pdf' },
            { key: 'sourceUrl', label: 'Spec URL', type: 'url' }
        ],
        metadata: [
            ...BASE_METADATA,
            { key: 'sourceUrl', label: 'Specification', type: 'url', icon: 'Link' }
        ],
        sections: [
            { title: 'Abstract', icon: 'FileText' },
            { title: 'Protocol Flow', icon: 'ArrowRightLeft' },
            { title: 'Data Formats', icon: 'Binary' }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: {
                    id: 'pdf',
                    map: { source: 'pdfPath' }
                },
                secondary: 'sections'
            }
        },
        serializerKey: 'markdown'
    },
    book: {
        type: 'book',
        folder: '07_Books',
        label: 'Book / eBook',
        icon: 'Book',
        accentColor: 'text-amber-500',
        accentBg: 'bg-amber-500/10',
        accentHover: 'hover:bg-amber-500/20',
        description: 'Catalog and summarize books or e-books.',
        fields: [
            { key: 'title', label: 'Book Title', type: 'text', required: true },
            { key: 'author', label: 'Author', type: 'text', placeholder: 'Author Name' },
            { key: 'isbn', label: 'ISBN', type: 'text', placeholder: 'ISBN-10 or ISBN-13' },
            { key: 'publisher', label: 'Publisher', type: 'text' },
            { key: 'pdfPath', label: 'E-Book File', type: 'file', accept: '.pdf,.epub' },
            { key: 'tags', label: 'Tags', type: 'tags' }
        ],
        metadata: [
            ...BASE_METADATA,
            { key: 'author', label: 'Author', type: 'text', icon: 'User' },
            { key: 'publisher', label: 'Publisher', type: 'text', icon: 'Building' },
            { key: 'isbn', label: 'ISBN', type: 'text', icon: 'Hash' }
        ],
        sections: [
            { title: 'Summary', icon: 'FileText', description: 'Overall summary of the book.' },
            { title: 'Key Takeaways', icon: 'Lightbulb' },
            { title: 'Chapter Notes', icon: 'ListOrdered' }
        ],
        view: {
            layout: 'split',
            modules: {
                primary: {
                    id: 'pdf',
                    map: { source: 'pdfPath' }
                },
                secondary: 'sections'
            }
        },
        serializerKey: 'markdown'
    }
};

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
    entries: DEFAULT_ENTRY_TYPES,
    modules: DEFAULT_MODULES,
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
