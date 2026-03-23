import { useNavigate } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { commandRegistry } from './CommandRegistry';

export function useGlobalCommands() {
    const navigate = useNavigate();
    const { openCreateDialog, openQuickAsk } = useLayout();
    const { settings, updateSetting } = useAppSettings();
    const { theme } = useTheme();

    useEffect(() => {
        // Navigation Commands
        const unreg1 = commandRegistry.register({
            id: 'nav.home',
            name: 'Open The Archives',
            description: 'Navigate to the library browser',
            icon: 'Scroll',
            category: 'Navigation',
            navigationTarget: '/',
            handler: () => navigate('/'),
            synonyms: ['Home', 'Library', 'Browser', 'Codex']
        });

        const unreg2 = commandRegistry.register({
            id: 'nav.notebooks',
            name: 'Open The Scriptorium',
            description: 'Navigate to notebooks',
            icon: 'BookOpen',
            category: 'Navigation',
            navigationTarget: '/notebooks',
            handler: () => navigate('/notebooks'),
            synonyms: ['Notebooks', 'Books', 'Writing']
        });

        const unreg3 = commandRegistry.register({
            id: 'nav.settings',
            name: 'Open Settings',
            description: 'Configure the application',
            icon: 'Settings',
            category: 'Navigation',
            navigationTarget: '/settings',
            handler: () => navigate('/settings'),
            synonyms: ['Configuration', 'Options', 'User Settings']
        });

        const unreg8 = commandRegistry.register({
            id: 'nav.settings.intelligence',
            name: 'Intelligence Settings',
            description: 'Configure AI, models and semantic search',
            icon: 'Sparkles',
            category: 'Navigation',
            navigationTarget: '/settings/intelligence',
            handler: () => navigate('/settings/intelligence'),
            synonyms: ['AI', 'Gemini', 'Ollama', 'Models', 'LLM', 'RAG', 'Search Settings']
        });

        const unreg9 = commandRegistry.register({
            id: 'nav.settings.workspace',
            name: 'Keep Settings',
            description: 'Manage your Keep\'s settings',
            icon: 'Archive',
            category: 'Navigation',
            navigationTarget: '/settings/workspace',
            handler: () => navigate('/settings/workspace'),
            synonyms: ['Vault', 'Keep', 'Workspace', 'Files', 'Path', 'Root']
        });

        const unreg10 = commandRegistry.register({
            id: 'nav.settings.system',
            name: 'Open The WatchTower',
            description: 'System-wide monitoring and status',
            icon: 'Telescope',
            category: 'Navigation',
            navigationTarget: '/settings/system',
            handler: () => navigate('/settings/system'),
            synonyms: ['System Status', 'Monitoring', 'Health', 'Logs', 'Dashboard']
        });

        const unreg11 = commandRegistry.register({
            id: 'nav.settings.execution',
            name: 'Open Code Execution Settings',
            description: 'Configure the Forge and code execution environments',
            icon: 'Flame',
            category: 'Navigation',
            navigationTarget: '/settings/execution',
            handler: () => navigate('/settings/execution'),
            synonyms: ['Forge', 'Runner', 'Docker', 'Python Settings']
        });

        const unreg22 = commandRegistry.register({
            id: 'nav.settings.database',
            name: 'Open Database Settings',
            description: 'Debug and manage the underlying database',
            icon: 'Database',
            category: 'Navigation',
            navigationTarget: '/settings/database',
            handler: () => navigate('/settings/database')
        });

        const unreg23 = commandRegistry.register({
            id: 'nav.settings.networking',
            name: 'Open Networking Settings',
            description: 'Configure peer-to-peer and networking',
            icon: 'Network',
            category: 'Navigation',
            navigationTarget: '/settings/networking',
            handler: () => navigate('/settings/networking'),
            synonyms: ['Peer', 'Connection', 'Remote', 'P2P']
        });

        const unreg12 = commandRegistry.register({
            id: 'nav.rss',
            name: 'Open RSS Reader',
            description: 'Read your favorite feeds',
            icon: 'Rss',
            category: 'Navigation',
            navigationTarget: '/rss',
            handler: () => navigate('/rss'),
            synonyms: ['Feeds', 'News', 'Blogs', 'RSS Reader']
        });

        const unreg13 = commandRegistry.register({
            id: 'nav.tags',
            name: 'Open Tag Manager',
            description: 'Organize your library tags',
            icon: 'Tag',
            category: 'Navigation',
            navigationTarget: '/tags',
            handler: () => navigate('/tags'),
            synonyms: ['Tags', 'Labels', 'Taxonomy', 'Organization']
        });

        const unreg14 = commandRegistry.register({
            id: 'nav.kanban',
            name: 'Open The War Room',
            description: 'Manage your project tasks',
            icon: 'Swords',
            category: 'Navigation',
            navigationTarget: '/kanban',
            handler: () => navigate('/kanban'),
            synonyms: ['Kanban', 'Projects', 'Board', 'Tasks', 'To-do']
        });

        const unreg15 = commandRegistry.register({
            id: 'nav.youtube',
            name: 'Open YouTube Explorer',
            description: 'Browse your video feeds',
            icon: 'Youtube',
            category: 'Navigation',
            navigationTarget: '/youtube',
            handler: () => navigate('/youtube'),
            synonyms: ['Videos', 'Playlists', 'YouTube Explorer']
        });

        const unreg16 = commandRegistry.register({
            id: 'nav.repl',
            name: 'Open The Forge',
            description: 'Run code in the REPL',
            icon: 'Flame',
            category: 'Navigation',
            navigationTarget: '/repl',
            handler: () => navigate('/repl'),
            synonyms: ['REPL', 'Playground', 'Python Shell', 'Scratchpad']
        });

        const unreg17 = commandRegistry.register({
            id: 'nav.whiteboard',
            name: 'Open The Canvas',
            description: 'Draw and brainstorm',
            icon: 'Palette',
            category: 'Navigation',
            navigationTarget: '/whiteboard',
            handler: () => navigate('/whiteboard'),
            synonyms: ['Whiteboard', 'Drawing', 'Sketch', 'Brainstorm']
        });

        const unreg18 = commandRegistry.register({
            id: 'nav.latex',
            name: 'Open The Scribe',
            description: 'Edit LaTeX documents',
            icon: 'Languages',
            category: 'Navigation',
            navigationTarget: '/latex',
            handler: () => navigate('/latex'),
            synonyms: ['LaTeX', 'Math', 'Academic', 'PDF Editor']
        });

        const unreg19 = commandRegistry.register({
            id: 'nav.notes',
            name: 'Open The Journals',
            description: 'Write and organize personal notes',
            icon: 'Feather',
            category: 'Navigation',
            navigationTarget: '/notes',
            handler: () => navigate('/notes'),
            synonyms: ['Notes', 'Writing', 'Sticky Notes', 'Diary']
        });

        const unreg20 = commandRegistry.register({
            id: 'nav.editor',
            name: 'Open The Workshop',
            description: 'Advanced code and text editing',
            icon: 'Hammer',
            category: 'Navigation',
            navigationTarget: '/editor',
            handler: () => navigate('/editor'),
            synonyms: ['Editor', 'Code', 'Text', 'IDE']
        });

        const unreg21 = commandRegistry.register({
            id: 'nav.source-control',
            name: 'Open The Bastion',
            description: 'Manage version control and syncing',
            icon: 'Castle',
            category: 'Navigation',
            navigationTarget: '/source-control',
            handler: () => navigate('/source-control'),
            synonyms: ['Git', 'Sync', 'Version Control', 'Github']
        });

        // Action Commands
        const unreg4 = commandRegistry.register({
            id: 'action.new-entry',
            name: 'Create New Entry',
            description: 'Open the new entry dialog',
            icon: 'Plus',
            category: 'Actions',
            shortcut: 'Ctrl+N',
            handler: () => openCreateDialog()
        });

        const unreg5 = commandRegistry.register({
            id: 'action.toggle-zen',
            name: 'Toggle Zen Mode',
            description: 'Switch between focused and standard view',
            icon: 'Maximize',
            category: 'Actions',
            shortcut: 'Ctrl+Alt+Z',
            handler: () => updateSetting('zenMode', !settings?.zenMode)
        });

        const unreg6 = commandRegistry.register({
            id: 'action.toggle-theme',
            name: 'Toggle Theme',
            description: 'Switch between light and dark mode',
            icon: theme === 'dark' ? 'Sun' : 'Moon',
            category: 'Actions',
            handler: () => updateSetting('theme', theme === 'dark' ? 'light' : 'dark')
        });

        const unreg7 = commandRegistry.register({
            id: 'action.quick-ask',
            name: 'Quick Ask Oracle',
            description: 'Ask a quick question to the AI',
            icon: 'Cpu',
            category: 'AI',
            handler: (query?: string) => openQuickAsk(query || '')
        });

        return () => {
            unreg1(); unreg2(); unreg3(); unreg4(); unreg5(); unreg6(); unreg7(); unreg8(); unreg9(); unreg10(); unreg11(); unreg12(); unreg13(); unreg14(); unreg15(); unreg16(); unreg17(); unreg18(); unreg19(); unreg20(); unreg21(); unreg22(); unreg23();
        };
    }, [navigate, openCreateDialog, openQuickAsk, settings?.zenMode, updateSetting, theme]);
}
