import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import { NotebookConfig, NotebookNode, NotebookCompletion } from '../../pages/NotebookPage';
import { db, CodexEntry } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { SearchService } from '../../search';
import { useConfig } from '../../context/ConfigContext';
import { formatDistanceToNow } from 'date-fns';
import { FixedSizeList as List } from 'react-window';

interface NotebookSidebarProps {
    notebooks: NotebookConfig[];
    activeId: string | null;
    onSelectNotebook: (id: string | null) => void;
    onSelectEntry: (id: string) => void;
    selectedEntryId: string | null;
    onUpdateNotebook: (nb: NotebookConfig) => void;
    onEditNotebook: (nb: NotebookConfig) => void;
    onDeleteNotebook: (id: string) => void;
}

const getPathTree = (entries: CodexEntry[], rootPath: string): NotebookNode[] => {
    const root: NotebookNode[] = [];
    const folderMap: Record<string, NotebookNode> = {};

    entries.forEach(entry => {
        const normalizedRoot = rootPath.replace(/\\/g, '/');
        const normalizedFile = entry.filePath.replace(/\\/g, '/');
        const relativePath = normalizedFile.replace(normalizedRoot, '').replace(/^\//, '');
        const parts = relativePath.split('/');
        parts.pop();

        let currentLevel = root;
        let currentPath = '';

        parts.forEach(part => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!folderMap[currentPath]) {
                const newFolder: NotebookNode = {
                    id: `folder-${currentPath}`,
                    type: 'folder',
                    title: part,
                    children: []
                };
                folderMap[currentPath] = newFolder;
                currentLevel.push(newFolder);
            }
            currentLevel = folderMap[currentPath].children!;
        });

        currentLevel.push({
            id: entry.id,
            type: 'entry',
            title: entry.title,
            entryType: entry.type
        });
    });

    return root;
};

interface FlatNode extends NotebookNode {
    depth: number;
    parentId: string | null;
}

export const NotebookSidebar = ({
    notebooks,
    activeId,
    onSelectNotebook,
    onSelectEntry,
    selectedEntryId,
    onUpdateNotebook,
    onEditNotebook,
    onDeleteNotebook
}: NotebookSidebarProps) => {
    const { getEntryTypeConfig, vaultPath } = useConfig();
    const activeNotebook = notebooks.find(n => n.id === activeId);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 300 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (height > 0) {
                    setDimensions({ width, height });
                    console.log('[NotebookSidebar] ResizeObserver dimensions:', height, width);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [activeId]);

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    }, []);

    // Fetch entries based on the active notebook's query
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            ...e,
            content: undefined,
            highlights: undefined,
            whiteboard: undefined,
            code: undefined
        }));
    }, [activeNotebook?.query]) || [];

    const filteredEntries = useMemo(() => {
        if (!allEntries || !activeNotebook) return [];
        return SearchService.evaluate(activeNotebook.query, allEntries, getEntryTypeConfig);
    }, [allEntries, activeNotebook, getEntryTypeConfig]);

    const treeData = useMemo(() => {
        if (!activeNotebook || !allEntries) return [];

        if (activeNotebook.organizationType === 'path' && vaultPath) {
            return getPathTree(filteredEntries, vaultPath);
        }

        if (activeNotebook.organizationType === 'tag') {
            const tags: Record<string, CodexEntry[]> = {};
            filteredEntries.forEach(e => {
                if (e.tags && e.tags.length > 0) {
                    e.tags.forEach(t => {
                        if (!tags[t]) tags[t] = [];
                        tags[t].push(e);
                    });
                } else {
                    if (!tags['Untagged']) tags['Untagged'] = [];
                    tags['Untagged'].push(e);
                }
            });

            return Object.entries(tags).map(([tag, items]) => ({
                id: `tag-${tag}`,
                type: 'folder' as const,
                title: tag,
                children: items.map(i => ({
                    id: i.id,
                    type: 'entry' as const,
                    title: i.title,
                    entryType: i.type
                }))
            }));
        }

        if (activeNotebook.organizationType === 'metadata' && activeNotebook.metadataField) {
            const field = activeNotebook.metadataField;
            const groups: Record<string, CodexEntry[]> = {};
            filteredEntries.forEach(e => {
                const val = (e.frontmatter as any)?.[field] || 'None';
                if (!groups[val]) groups[val] = [];
                groups[val].push(e);
            });

            return Object.entries(groups).map(([val, items]) => ({
                id: `meta-${val}`,
                type: 'folder' as const,
                title: `${field}: ${val}`,
                children: items.map(i => ({
                    id: i.id,
                    type: 'entry' as const,
                    title: i.title,
                    entryType: i.type
                }))
            }));
        }

        if (activeNotebook.manualTree && activeNotebook.manualTree.length > 0) {
            return activeNotebook.manualTree;
        }

        return filteredEntries.map(e => ({
            id: e.id,
            type: 'entry' as const,
            title: e.title,
            entryType: e.type
        }));
    }, [activeNotebook, filteredEntries, vaultPath]);

    const flattenedList = useMemo(() => {
        const list: FlatNode[] = [];
        const process = (nodes: NotebookNode[], depth: number, parentId: string | null) => {
            nodes.forEach(node => {
                list.push({ ...node, depth, parentId });
                if (node.type === 'folder' && expandedFolders.has(node.id) && node.children) {
                    process(node.children, depth + 1, node.id);
                }
            });
        };
        process(treeData, 0, null);
        return list;
    }, [treeData, expandedFolders]);

    return (
        <div className="flex flex-col h-full bg-muted/5">
            {/* Notebook Drawers */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {notebooks.map(nb => {
                    const isActive = activeId === nb.id;
                    return (
                        <div key={nb.id} className="flex flex-col">
                            <div
                                onClick={() => onSelectNotebook(isActive ? null : nb.id)}
                                className={cn(
                                    "w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-all group relative overflow-hidden cursor-pointer",
                                    isActive
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                        : "hover:bg-muted/50 text-muted-foreground border border-transparent shadow-none"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        onSelectNotebook(isActive ? null : nb.id);
                                    }
                                }}
                            >
                                {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-primary" />}
                                <Icon
                                    name="Book"
                                    size={16}
                                    className={cn(isActive ? "text-primary" : "text-muted-foreground/40 group-hover:text-primary/60 transition-colors")}
                                />
                                <span className="text-[11px] font-black uppercase tracking-widest truncate flex-1 text-left">
                                    {nb.name}
                                </span>

                                <div className={cn(
                                    "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                                    isActive && "opacity-100"
                                )}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditNotebook(nb); }}
                                        className="p-1 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                                        title="Edit Notebook"
                                    >
                                        <Icon name="Edit" size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteNotebook(nb.id); }}
                                        className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                        title="Delete Notebook"
                                    >
                                        <Icon name="Trash" size={12} />
                                    </button>
                                </div>
                                <Icon
                                    name={isActive ? "ChevronDown" : "ChevronRight"}
                                    size={14}
                                    className="text-muted-foreground/30 ml-1"
                                />
                            </div>

                            {isActive && (
                                <div className="mt-1 ml-4 border-l border-primary/10 pl-1 space-y-0.5 min-h-[300px] flex flex-col">
                                    {/* Inline Filter for Active Notebook */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 mb-1 group/query bg-muted/20 rounded-lg mx-2">
                                        <Icon name="Search" size={10} className="text-muted-foreground/40 group-focus-within/query:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={activeNotebook?.query || ''}
                                            onChange={(e) => {
                                                if (activeNotebook) {
                                                    onUpdateNotebook({ ...activeNotebook, query: e.target.value });
                                                }
                                            }}
                                            placeholder="Filter entries..."
                                            className="bg-transparent text-[9px] w-full outline-none placeholder:text-muted-foreground/20 font-bold uppercase tracking-tighter"
                                        />
                                    </div>

                                    <div ref={containerRef} className="flex-1 relative w-full border border-primary/5 min-h-[300px]">
                                        {filteredEntries.length > 0 ? (
                                            <List
                                                height={dimensions.height}
                                                itemCount={flattenedList.length}
                                                itemSize={34}
                                                width={dimensions.width || '100%'}
                                                className="custom-scrollbar"
                                            >
                                                {({ index, style }: any) => (
                                                    <div style={style} className="w-full">
                                                        <Row
                                                            node={flattenedList[index]}
                                                            selectedId={selectedEntryId}
                                                            onSelect={onSelectEntry}
                                                            isExpanded={expandedFolders.has(flattenedList[index].id)}
                                                            onToggle={() => toggleFolder(flattenedList[index].id)}
                                                            getEntryTypeConfig={getEntryTypeConfig}
                                                            completions={activeNotebook?.completions}
                                                        />
                                                    </div>
                                                )}
                                            </List>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest italic animate-pulse">
                                                Initializing View...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer / Stats */}
            <div className="p-3 border-t border-border/30 bg-muted/10">
                <div className="flex items-center justify-between text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                    <span>{filteredEntries.length} Entries</span>
                    <span className="italic">{activeNotebook?.organizationType} View</span>
                </div>
            </div>
        </div>
    );
};

const Row = ({
    node,
    selectedId,
    onSelect,
    isExpanded,
    onToggle,
    getEntryTypeConfig,
    completions
}: {
    node: FlatNode,
    selectedId: string | null,
    onSelect: (id: string) => void,
    isExpanded: boolean,
    onToggle: () => void,
    getEntryTypeConfig: (type: string) => any,
    completions?: Record<string, NotebookCompletion[]>
}) => {
    const isSelected = selectedId === node.id;

    if (node.type === 'folder') {
        return (
            <button
                onClick={onToggle}
                className="w-full h-8 flex items-center gap-2 px-2 rounded-lg hover:bg-muted/50 transition-all group"
                style={{ marginLeft: `${node.depth * 12}px`, width: `calc(100% - ${node.depth * 12}px)` }}
            >
                <Icon
                    name={isExpanded ? "ChevronDown" : "ChevronRight"}
                    size={12}
                    className="text-muted-foreground/40 group-hover:text-foreground transition-colors"
                />
                <Icon name="Folder" size={14} className="text-primary/40 group-hover:text-primary transition-colors" />
                <span className="text-[11px] font-bold truncate opacity-70 group-hover:opacity-100 transition-opacity uppercase tracking-tight">
                    {node.title}
                </span>
                <span className="ml-auto text-[9px] text-muted-foreground/30 font-mono font-medium">
                    {node.children?.length || 0}
                </span>
            </button>
        );
    }

    const typeConfig = node.entryType ? getEntryTypeConfig(node.entryType) : null;
    const entryIcon = typeConfig?.icon || "FileText";
    const entryCompletions = completions?.[node.id] || [];
    const lastCompletion = entryCompletions.length > 0 ? entryCompletions[entryCompletions.length - 1] : null;

    let statusColor = "";
    if (lastCompletion) {
        const days = (Date.now() - lastCompletion.completedAt) / (1000 * 60 * 60 * 24);
        if (days < 1) statusColor = "bg-green-500";
        else if (days < 7) statusColor = "bg-yellow-500";
        else statusColor = "bg-zinc-500";
    }

    return (
        <button
            onClick={() => onSelect(node.id)}
            className={cn(
                "w-full h-8 flex items-center gap-2 px-2 rounded-xl transition-all group relative overflow-hidden",
                isSelected
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-100"
                    : "hover:bg-muted/50 scale-[0.98] hover:scale-100"
            )}
            style={{ marginLeft: `${node.depth * 12 + 20}px`, width: `calc(100% - ${node.depth * 12 + 20}px)` }}
        >
            {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-primary-foreground/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
            <Icon
                name={entryIcon as any}
                size={14}
                className={cn(isSelected ? "text-primary-foreground" : "text-primary/60 group-hover:text-primary transition-colors")}
            />
            <span className={cn(
                "text-[11px] truncate font-bold flex-1 text-left",
                isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity"
            )}>
                {node.title}
            </span>
            {lastCompletion && (
                <div
                    className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor)}
                    title={`Last completed ${formatDistanceToNow(lastCompletion.completedAt)} ago`}
                />
            )}
        </button>
    );
};
