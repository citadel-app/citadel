import { type WorkspaceConfig, DEFAULT_WORKSPACE_CONFIG } from './entry-types';

export interface WorkspacePreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    config: WorkspaceConfig;
}

// Helper to extract specific entry types from a record
const pickEntries = (keys: string[]): Record<string, any> => {
    const entries: Record<string, any> = {};
    const source = DEFAULT_WORKSPACE_CONFIG.entries;
    keys.forEach(key => {
        if (source[key]) {
            entries[key] = source[key];
        }
    });
    return entries;
};

export const PRESETS: WorkspacePreset[] = [
    {
        id: 'software-engineer',
        name: 'Software Engineer',
        description: 'Track coding problems, system designs, and technical RFCs.',
        icon: 'Code2',
        category: 'Engineering',
        config: {
            ...DEFAULT_WORKSPACE_CONFIG,
            entries: pickEntries(['problem', 'design', 'rfc', 'blog'])
        }
    },
    {
        id: 'product-manager',
        name: 'Product Manager',
        description: 'PRDs, User Research, Roadmaps, and Market Analysis.',
        icon: 'BarChart3',
        category: 'Product',
        config: {
            ...DEFAULT_WORKSPACE_CONFIG,
            entries: {
                prd: {
                    type: 'prd',
                    folder: '01_PRDs',
                    label: 'Product Requirement',
                    icon: 'ClipboardCheck',
                    accentColor: 'text-blue-500',
                    accentBg: 'bg-blue-500/10',
                    accentHover: 'hover:bg-blue-500/20',
                    description: 'Define features and requirements for new biological or software products.',
                    fields: [
                        { key: 'title', label: 'Feature Name', type: 'text', required: true },
                        { key: 'status', label: 'Status', type: 'select', options: [
                            { label: 'Discovery', value: 'discovery' },
                            { label: 'Draft', value: 'draft' },
                            { label: 'Review', value: 'review' },
                            { label: 'Finalized', value: 'finalized' }
                        ]},
                        { key: 'tags', label: 'Tags', type: 'tags' }
                    ],
                    metadata: [
                        { key: 'status', label: 'Status', type: 'select', icon: 'Activity' },
                        { key: 'owner', label: 'Owner', type: 'text', icon: 'User' }
                    ],
                    sections: [
                        { title: 'Goal', icon: 'Target', description: 'What problem are we solving?' },
                        { title: 'User Stories', icon: 'Users', description: 'Who is this for?' },
                        { title: 'Functional Requirements', icon: 'ListChecks' },
                        { title: 'Success Metrics', icon: 'TrendingUp' }
                    ],
                    view: {
                        layout: 'single',
                        modules: { primary: 'sections' }
                    }
                },
                research: {
                    type: 'research',
                    folder: '02_Research',
                    label: 'User Research',
                    icon: 'Users',
                    accentColor: 'text-purple-500',
                    accentBg: 'bg-purple-500/10',
                    accentHover: 'hover:bg-purple-500/20',
                    description: 'Document user interviews and feedback.',
                    fields: [
                        { key: 'title', label: 'Research Goal', type: 'text', required: true },
                        { key: 'tags', label: 'Tags', type: 'tags' }
                    ],
                    metadata: [
                        { key: 'participants', label: 'Participants', type: 'text', icon: 'Users' },
                        { key: 'date', label: 'Date', type: 'date', icon: 'Calendar' }
                    ],
                    sections: [
                        { title: 'Abstract', icon: 'FileText' },
                        { title: 'Key Insights', icon: 'Lightbulb' },
                        { title: 'Raw Notes', icon: 'MessageSquare' }
                    ],
                    view: {
                        layout: 'split',
                        modules: { primary: 'sections', secondary: 'whiteboard' }
                    }
                },
                roadmap: {
                    type: 'roadmap',
                    folder: '03_Roadmaps',
                    label: 'Roadmap',
                    icon: 'Map',
                    accentColor: 'text-green-500',
                    accentBg: 'bg-green-500/10',
                    accentHover: 'hover:bg-green-500/20',
                    description: 'Visualize project timelines and milestones.',
                    fields: [
                        { key: 'title', label: 'Roadmap Name', type: 'text', required: true }
                    ],
                    metadata: [
                        { key: 'quarter', label: 'Quarter', type: 'text', icon: 'CalendarDays' }
                    ],
                    sections: [
                        { title: 'Q1 Milestones', icon: 'Flag' },
                        { title: 'Q2 Milestones', icon: 'Flag' },
                        { title: 'Risk Factors', icon: 'AlertTriangle' }
                    ],
                    view: {
                        layout: 'single',
                        modules: { primary: 'sections' }
                    }
                }
            }
        }
    },
    {
        id: 'academic-researcher',
        name: 'Academic Researcher',
        description: 'Focus on paper annotations, standards, and literature review.',
        icon: 'GraduationCap',
        category: 'Science',
        config: {
            ...DEFAULT_WORKSPACE_CONFIG,
            entries: pickEntries(['paper', 'rfc', 'standard', 'book'])
        }
    },
    {
        id: 'content-creator',
        name: 'Content Creator',
        description: 'Scripts, blog posts, and creative projects.',
        icon: 'Camera',
        category: 'Creative',
        config: {
            ...DEFAULT_WORKSPACE_CONFIG,
            entries: {
                ...pickEntries(['blog']),
                script: {
                    type: 'script',
                    folder: '08_Scripts',
                    label: 'Video Script',
                    icon: 'Video',
                    accentColor: 'text-red-500',
                    accentBg: 'bg-red-500/10',
                    accentHover: 'hover:bg-red-500/20',
                    description: 'Write video scripts with whiteboard support.',
                    fields: [
                        { key: 'title', label: 'Script Title', type: 'text', required: true }
                    ],
                    metadata: [
                        { key: 'duration', label: 'Target Duration', type: 'text', icon: 'Clock' }
                    ],
                    sections: [
                        { title: 'Hook', icon: 'Zap' },
                        { title: 'Script Body', icon: 'AlignLeft' },
                        { title: 'Visual Cues', icon: 'Eye' }
                    ],
                    view: {
                        layout: 'split',
                        modules: { primary: 'sections', secondary: 'whiteboard' }
                    }
                }
            }
        }
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Just plain markdown notes with no special schema.',
        icon: 'StickyNote',
        category: 'General',
        config: {
            ...DEFAULT_WORKSPACE_CONFIG,
            entries: {
                note: {
                    type: 'note',
                    folder: 'Notes',
                    label: 'Note',
                    icon: 'FileText',
                    accentColor: 'text-gray-500',
                    accentBg: 'bg-gray-500/10',
                    accentHover: 'hover:bg-gray-500/20',
                    description: 'Basic markdown note.',
                    fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
                    metadata: [],
                    sections: [{ title: 'Content', icon: 'AlignLeft' }],
                    view: { layout: 'single', modules: { primary: 'sections' } }
                }
            }
        }
    },
    {
        id: 'custom-builder',
        name: 'Create Your Own',
        description: 'Pick and choose specific entry types for your keep.',
        icon: 'Wrench',
        category: 'Advanced',
        config: DEFAULT_WORKSPACE_CONFIG
    }
];
