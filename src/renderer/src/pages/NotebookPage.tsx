import { useState, useEffect, useMemo, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import { dataManager } from '../lib/data-manager';
import { Icon } from '../components/IconRegistry';
import { NotebookSidebar } from '../components/notebook/NotebookSidebar';
import { NotebookContent } from '../components/notebook/NotebookContent';
import { CreateNotebookDialog } from '../components/notebook/CreateNotebookDialog';
import { Panel, Group, Separator } from 'react-resizable-panels';

export interface NotebookCompletion {
    completedAt: number;
}

export interface NotebookConfig {
    id: string;
    name: string;
    query: string;
    organizationType: 'manual' | 'tag' | 'metadata' | 'path';
    metadataField?: string;
    manualTree?: NotebookNode[];
    completions?: Record<string, NotebookCompletion[]>; // entryId -> completion history
}

export interface NotebookNode {
    id: string; // entry id or folder id
    type: 'entry' | 'folder';
    title: string;
    entryType?: string;
    children?: NotebookNode[];
    isExpanded?: boolean;
}

export const NotebookPage = () => {
    const { vaultPath } = useConfig();
    const [notebooks, setNotebooks] = useState<NotebookConfig[]>([]);
    const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<NotebookConfig | null>(null);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sidebar resizing state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const activeNotebook = useMemo(() =>
        notebooks.find(n => n.id === activeNotebookId),
        [notebooks, activeNotebookId]);

    // Load notebooks on mount
    useEffect(() => {
        const load = async () => {
            const loaded = await dataManager.loadNotebooks();
            setNotebooks(loaded);
            if (loaded.length > 0 && !activeNotebookId) {
                setActiveNotebookId(loaded[0].id);
            }
            setIsLoading(false);
        };
        load();
    }, [vaultPath]);

    const saveNotebooks = async (updated: NotebookConfig[]) => {
        setNotebooks(updated);
        await dataManager.saveNotebooks(updated);
    };

    const handleSaveNotebook = async (config: Omit<NotebookConfig, 'id'>) => {
        let updated: NotebookConfig[];
        if (editingNotebook) {
            // Update existing
            const updatedNb: NotebookConfig = {
                ...editingNotebook,
                ...config
            };
            updated = notebooks.map(n => n.id === editingNotebook.id ? updatedNb : n);
            setEditingNotebook(null);
        } else {
            // Create new
            const newNb: NotebookConfig = {
                ...config,
                id: crypto.randomUUID(),
                manualTree: []
            };
            updated = [...notebooks, newNb];
            setActiveNotebookId(newNb.id);
        }
        await saveNotebooks(updated);
        setIsCreateOpen(false);
    };

    const handleDeleteNotebook = async (id: string) => {
        const updated = notebooks.filter(n => n.id !== id);
        await saveNotebooks(updated);
        if (activeNotebookId === id) {
            setActiveNotebookId(updated[0]?.id || null);
        }
    };
    const handleToggleCompletion = async (entryId: string) => {
        if (!activeNotebook) return;

        const now = Date.now();
        const completions = { ...(activeNotebook.completions || {}) };
        const entryCompletions = [...(completions[entryId] || [])];

        entryCompletions.push({ completedAt: now });
        completions[entryId] = entryCompletions;

        const updatedNb: NotebookConfig = {
            ...activeNotebook,
            completions
        };

        const updated = notebooks.map(n => n.id === activeNotebook.id ? updatedNb : n);
        await saveNotebooks(updated);
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full overflow-hidden bg-background">
            <Group orientation="horizontal">
                {/* Sidebar Panel */}
                {!isSidebarCollapsed && (
                    <Panel
                        defaultSize="20"
                        minSize="15"
                        maxSize="40"
                        className="flex flex-col bg-muted/5"
                    >
                        <div className="h-full flex flex-col border-r border-border/50 overflow-hidden">
                            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <Icon name="Book" size={16} />
                                    </div>
                                    <h2 className="font-black text-sm uppercase tracking-wider italic">Notebooks</h2>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingNotebook(null);
                                            setIsCreateOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all group lg:flex items-center gap-2"
                                    >
                                        <Icon name="Plus" size={16} />
                                    </button>
                                    <button
                                        onClick={toggleSidebar}
                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all"
                                        title="Collapse Sidebar"
                                    >
                                        <Icon name="ChevronLeft" size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <NotebookSidebar
                                    notebooks={notebooks}
                                    activeId={activeNotebookId}
                                    onSelectNotebook={setActiveNotebookId}
                                    onSelectEntry={setSelectedEntryId}
                                    selectedEntryId={selectedEntryId}
                                    onUpdateNotebook={(nb) => {
                                        const updated = notebooks.map(n => n.id === nb.id ? nb : n);
                                        saveNotebooks(updated);
                                    }}
                                    onEditNotebook={(nb) => {
                                        setEditingNotebook(nb);
                                        setIsCreateOpen(true);
                                    }}
                                    onDeleteNotebook={handleDeleteNotebook}
                                />
                            </div>
                        </div>
                    </Panel>
                )}

                {!isSidebarCollapsed && (
                    <Separator className="w-1.5 hover:bg-primary/30 transition-colors border-r border-border/20 group relative cursor-col-resize flex items-center justify-center z-10">
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-border group-hover:bg-primary/50 transition-colors" />
                    </Separator>
                )}

                {/* Content Panel */}
                <Panel className="flex flex-col min-h-0 bg-background relative overflow-hidden">
                    {isSidebarCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="absolute left-0 top-14 z-50 p-1.5 rounded-r-lg bg-primary text-primary-foreground shadow-md hover:pl-3 transition-all animate-in slide-in-from-left duration-300 group"
                            title="Expand Sidebar"
                        >
                            <Icon name="ChevronRight" size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    {activeNotebook ? (
                        <NotebookContent
                            entryId={selectedEntryId}
                            notebook={activeNotebook}
                            onToggleCompletion={handleToggleCompletion}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 relative overflow-hidden group">
                            {/* Decorative background elements */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none">
                                <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-[120px]" />
                                <div className="absolute bottom-10 right-10 w-64 h-64 bg-primary rounded-full blur-[120px]" />
                            </div>

                            <div className="relative flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
                                <div className="mb-8 relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse scale-150" />
                                    <div className="relative p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-2xl text-primary">
                                        <Icon name="Book" size={64} strokeWidth={1} />
                                    </div>
                                </div>

                                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">
                                    Your Library Awaits
                                </h2>
                                <p className="max-w-[280px] text-center text-sm font-medium text-muted-foreground/60 leading-relaxed mb-8">
                                    Organize your research, notes, and ideas into hierarchical, trackable and searchable notebooks.
                                </p>

                                <button
                                    onClick={() => {
                                        setEditingNotebook(null);
                                        setIsCreateOpen(true);
                                    }}
                                    className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <Icon name="Plus" size={14} strokeWidth={3} />
                                    Create Notebook
                                </button>
                            </div>
                        </div>
                    )}
                </Panel>
            </Group>

            <CreateNotebookDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onCreate={handleSaveNotebook}
                editingConfig={editingNotebook}
            />
        </div>
    );
};
