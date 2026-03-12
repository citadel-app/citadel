import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CodexEntry } from '../lib/db';
import { useConfig } from '../context/ConfigContext';
import { dataManager } from '../lib/data-manager';
import { Icon } from '../components/IconRegistry';
import { SearchService } from '../search';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import { KanbanLane } from '../components/kanban/KanbanLane';
import { CreateBoardDialog } from '../components/kanban/CreateBoardDialog';
import { cn } from '../lib/utils';
import { SearchInput } from '../search';

interface KanbanBoard {
    id: string;
    name: string;
    query: string;
    pivotField: string; // metadata key or 'tags'
}

export const KanbanPage = () => {
    const { getEntryTypeConfig } = useConfig();
    const [boards, setBoards] = useState<KanbanBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [activeEntry, setActiveEntry] = useState<CodexEntry | null>(null);
    const [quickSearch, setQuickSearch] = useState('');
    const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const activeBoard = useMemo(() =>
        boards.find(b => b.id === activeBoardId) || boards[0],
        [boards, activeBoardId]);

    const loadBoards = async () => {
        const loadedBoards = await dataManager.loadBoards();
        setBoards(loadedBoards);
        if (loadedBoards.length > 0 && !activeBoardId) setActiveBoardId(loadedBoards[0].id);
        setIsLoading(false);
    };

    useEffect(() => {
        loadBoards();
    }, []);

    // Fetch all entries (projected to save memory)
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            ...e,
            content: undefined,
            highlights: undefined,
            whiteboard: undefined,
            code: undefined
        }));
    }, []) || [];

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveEntry(active.data.current?.entry || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveEntry(null);
        const { active, over } = event;
        if (!over || !activeBoard) return;

        const entryId = active.id as string;
        const newLaneId = (over.data.current?.laneId || over.id) as string;
        const oldLaneId = active.data.current?.laneId;

        if (newLaneId === oldLaneId) return;

        const entry = allEntries.find(e => e.id === entryId);
        if (!entry) return;

        const pivot = activeBoard.pivotField;

        try {
            if (pivot === 'tags') {
                const currentTags = entry.tags || [];
                // Remove the old tag (if it wasn't the "No Tags" placeholder)
                const filteredTags = currentTags.filter(t => t !== oldLaneId);

                // Add the new tag (if it's not the "No Tags" placeholder)
                const newTags = newLaneId === 'No Tags'
                    ? filteredTags
                    : Array.from(new Set([...filteredTags, newLaneId]));

                await dataManager.updateEntry(entry.id, { tags: newTags });
            } else {
                // Update metadata, clear if moving to "Unassigned"
                const valueToSave = newLaneId === 'Unassigned' ? undefined : newLaneId;
                const newMetadata = { ...(entry.frontmatter || {}), [pivot]: valueToSave };
                await dataManager.updateEntry(entry.id, { frontmatter: newMetadata });
            }
        } catch (err) {
            console.error('[Kanban] Failed to update entry after move:', err);
        }
    };

    const handleToggleCollapse = (laneId: string) => {
        setCollapsedLanes(prev => {
            const next = new Set(prev);
            if (next.has(laneId)) next.delete(laneId);
            else next.add(laneId);
            return next;
        });
    };

    const handleCreateBoard = async (newBoardData: Omit<KanbanBoard, 'id'>) => {
        const board: KanbanBoard = {
            ...newBoardData,
            id: crypto.randomUUID()
        };
        const updated = [...boards, board];
        setBoards(updated);
        setActiveBoardId(board.id);
        await dataManager.saveBoards(updated);
        setIsCreateDialogOpen(false);
    };

    const handleDeleteBoard = async (id: string) => {
        const updated = boards.filter(b => b.id !== id);
        setBoards(updated);
        if (activeBoardId === id) setActiveBoardId(updated[0]?.id || null);
        await dataManager.saveBoards(updated);
    };

    // Filtered and Pivoted Entries
    const lanes = useMemo(() => {
        if (!activeBoard) return [];

        // Combine board query with quick search
        const fullQuery = quickSearch
            ? `(${activeBoard.query}) AND (${quickSearch})`
            : activeBoard.query;

        const filtered = SearchService.evaluate(
            fullQuery,
            allEntries,
            getEntryTypeConfig
        );

        const groups: Record<string, any[]> = {};
        const pivot = activeBoard.pivotField;

        filtered.forEach(entry => {
            let val = (entry as any)[pivot];
            if (val === undefined) val = entry.frontmatter?.[pivot];

            if (pivot === 'tags') {
                const tags = Array.isArray(val) ? val : [];
                if (tags.length === 0) {
                    groups['No Tags'] = [...(groups['No Tags'] || []), entry];
                } else {
                    tags.forEach(tag => {
                        groups[tag] = [...(groups[tag] || []), entry];
                    });
                }
            } else {
                const key = val ? val.toString() : 'Unassigned';
                groups[key] = [...(groups[key] || []), entry];
            }
        });

        return Object.entries(groups).map(([name, items]) => ({
            id: name,
            title: name,
            items
        }));
    }, [allEntries, activeBoard, getEntryTypeConfig, quickSearch]);

    if (isLoading) return <div className="p-8 animate-pulse text-muted-foreground">Loading Boards...</div>;

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
            <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card shadow-sm z-10 transition-all">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon name="Columns3" size={18} className="text-primary" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight font-medieval">The War Room</h1>
                    </div>

                    {boards.length > 0 && (
                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border">
                            {boards.map(board => (
                                <div
                                    key={board.id}
                                    onClick={() => setActiveBoardId(board.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 group cursor-pointer",
                                        activeBoardId === board.id
                                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveBoardId(board.id); }}
                                >
                                    {board.name}
                                    {activeBoardId === board.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                                            className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all p-0.5 rounded-sm hover:bg-destructive/10 -mr-1"
                                        >
                                            <Icon name="X" size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setIsCreateDialogOpen(true)}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-dashed border-border ml-1"
                            >
                                <Icon name="Plus" size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-md ml-8">
                    <SearchInput
                        value={quickSearch}
                        onChange={setQuickSearch}
                        onClear={() => setQuickSearch('')}
                        placeholder={`Filter ${activeBoard?.name || 'board'}...`}
                        className="w-full"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {activeBoard && (
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 mb-0.5">Active Pivot</span>
                            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/5 rounded-full border border-primary/10">
                                {activeBoard.pivotField.toUpperCase()}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-bold active:scale-95 btn-forged"
                    >
                        <Icon name="Plus" size={16} />
                        Initiate Strategy
                    </button>
                </div>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <main className="flex-1 overflow-x-auto p-6 flex gap-6 items-start custom-scrollbar bg-accent/5">
                    {lanes.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-30 pt-40">
                            <Icon name="Columns3" size={120} className="mb-6 stroke-[0.5]" />
                            <h2 className="text-2xl font-bold">No Lanes Found</h2>
                            <p className="text-sm">Create a board or adjust your query/pivot.</p>
                        </div>
                    ) : (
                        lanes.map(lane => (
                            <KanbanLane
                                key={lane.id}
                                lane={lane}
                                isCollapsed={collapsedLanes.has(lane.id)}
                                onToggleCollapse={() => handleToggleCollapse(lane.id)}
                            />
                        ))
                    )}
                </main>

                <DragOverlay>
                    {activeEntry ? (
                        <div className="bg-card border border-primary rounded-lg p-3 w-80 shadow-2xl scale-105 transition-transform ring-4 ring-primary/10 rotate-2">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Moving Entry</span>
                            </div>
                            <span className="text-sm font-bold truncate block text-foreground">{activeEntry.title}</span>
                            <span className="text-[9px] text-muted-foreground mt-1 block">Drop to update metadata</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CreateBoardDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSave={handleCreateBoard}
            />
        </div>
    );
};
