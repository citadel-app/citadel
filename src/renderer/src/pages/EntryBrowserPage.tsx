import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/db';
import { useConfig } from '@renderer/context/ConfigContext';
import { dataManager } from '../lib/data-manager';
import { EntryBrowserFilters } from '../components/browser/EntryBrowserFilters';
import { EntryTable } from '../components/browser/EntryTable';
import { Icon } from '../components/IconRegistry';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAppSettings } from '../context/AppSettingsContext';
import { useLayout } from '@renderer/context/LayoutContext';
import { cn } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import { evaluateQuery, QueryParser } from '@renderer/search';
import { TagPicker } from '../components/TagPicker';

export const EntryBrowserPage = () => {
    const { getEntryTypeConfig } = useConfig();
    const { settings } = useAppSettings();
    const isZen = settings?.zenMode;
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize from URL or defaults
    const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
    const [universalQuery, setUniversalQuery] = useState(searchParams.get('q') || '');

    const debouncedQuery = useDebounce(universalQuery, 300);

    // Sync state to URL (using debounced query to avoid oscillation and history noise)
    useEffect(() => {
        const params: Record<string, string> = {};
        if (debouncedQuery) params.q = debouncedQuery;
        if (typeFilter !== 'all') params.type = typeFilter;

        const currentQ = searchParams.get('q') || '';
        const currentType = searchParams.get('type') || 'all';

        if (currentQ !== debouncedQuery || currentType !== typeFilter) {
            setSearchParams(params, { replace: true });
        }
    }, [debouncedQuery, typeFilter, setSearchParams]);

    // Sync URL to state (only for external changes like back button or initial nav)
    useEffect(() => {
        const urlQ = searchParams.get('q') || '';
        const urlType = searchParams.get('type') || 'all';

        // ONLY update state if the URL values actually differ from our current states.
        // We remove universalQuery and debouncedQuery from dependencies so this
        // effect ONLY runs when the URL parameters actually change (e.g. Back button).
        if (urlQ !== universalQuery) {
            setUniversalQuery(urlQ);
        }
        if (urlType !== typeFilter) {
            setTypeFilter(urlType);
        }
    }, [searchParams]); // ONLY depend on searchParams

    const [sortKey, setSortKey] = useState('updatedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const { openCreateDialog } = useLayout();

    // Lazy Loading State
    const [visibleCount, setVisibleCount] = useState(50);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Delete Dialog State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [deleteConfig, setDeleteConfig] = useState<{ id?: string, count: number, title?: string } | null>(null);
    const [alertDialog, setAlertDialog] = useState<{ open: boolean, title: string, message: string }>({ open: false, title: '', message: '' });

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

    // Filtered entries
    const filteredEntries = useMemo(() => {
        const queryTree = new QueryParser(debouncedQuery).parse();

        return allEntries
            .filter(e => {
                if (typeFilter !== 'all' && e.type !== typeFilter) return false;
                if (!queryTree) return true;
                return evaluateQuery(queryTree, e, getEntryTypeConfig);
            })
            .sort((a, b) => {
                let valA = (a as any)[sortKey];
                let valB = (b as any)[sortKey];

                // Handle frontmatter fields
                if (valA === undefined) valA = a.frontmatter?.[sortKey];
                if (valB === undefined) valB = b.frontmatter?.[sortKey];

                // Special handling for dates
                if (sortKey === 'updatedAt' || sortKey === 'createdAt' || sortKey.toLowerCase().includes('date')) {
                    const timeA = valA ? new Date(valA).getTime() : 0;
                    const timeB = valB ? new Date(valB).getTime() : 0;
                    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                }

                // Handle arrays (e.g. tags)
                if (Array.isArray(valA)) valA = valA.join(', ');
                if (Array.isArray(valB)) valB = valB.join(', ');

                // String fallback
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                if (valA === valB) return 0; // Added explicit equality check
                return 0;
            });
    }, [allEntries, typeFilter, debouncedQuery, sortKey, sortOrder, getEntryTypeConfig]); // Added getEntryTypeConfig to dependencies

    const paginatedEntries = useMemo(() => {
        return filteredEntries.slice(0, visibleCount);
    }, [filteredEntries, visibleCount]);

    const handleLoadMore = () => {
        if (visibleCount < filteredEntries.length) {
            setVisibleCount(prev => prev + 50);
        }
    };

    const handleSort = (key: string) => {
        setVisibleCount(50); // Reset scroll on sort
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    // Available entry types
    const entryTypes = useMemo(() => {
        const types = new Set(allEntries.map(e => e.type));
        return ['all', ...Array.from(types)];
    }, [allEntries]);

    // Dynamic columns based on schema
    const columns = useMemo(() => {
        const baseColumns: any[] = [
            { key: 'title', label: 'Title', type: 'system' },
        ];

        const usedKeys = new Set(['title', 'type', 'updatedAt']);

        if (typeFilter !== 'all') {
            const config = getEntryTypeConfig(typeFilter);

            // Add custom fields (only if not already a system key)
            config.fields.forEach(f => {
                const key = f.key as string;
                if (!usedKeys.has(key)) {
                    baseColumns.push({ key, label: f.label, type: 'field' });
                    usedKeys.add(key);
                }
            });

            // Add metadata fields (only if not already used)
            config.metadata.forEach(m => {
                const key = m.key as string;
                if (!usedKeys.has(key)) {
                    baseColumns.push({ key, label: m.label, type: 'metadata' });
                    usedKeys.add(key);
                }
            });
        }

        baseColumns.push({ key: 'updatedAt', label: 'Last Updated', type: 'system' });

        // Limit columns for better UX
        return baseColumns.slice(0, 6);
    }, [typeFilter, getEntryTypeConfig]);

    const handleSelectionToggle = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.size === filteredEntries.length && filteredEntries.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredEntries.map(e => e.id)));
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const entry = allEntries.find(e => e.id === id);
        setDeleteConfig({ id, count: 1, title: entry?.title });
        setShowDeleteDialog(true);
    };

    const handleDeleteSelected = () => {
        setDeleteConfig({ count: selectedIds.size });
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        setShowDeleteDialog(false);
        try {
            if (deleteConfig?.id) {
                // Single delete
                await dataManager.deleteEntry(deleteConfig.id);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(deleteConfig.id!);
                    return next;
                });
            } else if (selectedIds.size > 0) {
                // Bulk delete
                const ids = Array.from(selectedIds);
                for (const id of ids) {
                    await dataManager.deleteEntry(id);
                }
                setSelectedIds(new Set());
            }
        } catch (err) {
            console.error('[EntryBrowserPage] Failed to delete entries:', err);
            setAlertDialog({ open: true, title: 'Error', message: 'Failed to delete some entries. See console for details.' });
        } finally {
            setDeleteConfig(null);
        }
    };

    const handleBatchTag = async (tag: string) => {
        if (selectedIds.size === 0) return;

        try {
            const ids = Array.from(selectedIds);
            await dataManager.batchUpdateMetadata(ids, {
                type: 'add',
                targetField: 'tags',
                value: tag
            });
            setSelectedIds(new Set()); // Clear selection after update
        } catch (err) {
            console.error('[EntryBrowserPage] Failed to batch tag entries:', err);
            setAlertDialog({ open: true, title: 'Error', message: 'Failed to add tag to some entries. See console for details.' });
        }
    };

    const handleClear = () => {
        setTypeFilter('all');
        setUniversalQuery('');
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Header */}
            <header className={cn(
                "px-6 py-4 flex items-center justify-between border-b border-border bg-muted/10 transition-all duration-500 transform origin-top",
                isZen ? "scale-y-0 h-0 opacity-0 overflow-hidden py-0 border-none" : "scale-y-100 h-auto opacity-100"
            )}>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Icon name="Library" size={24} className="text-primary" />
                        The Archives
                    </h1>
                    <p className="text-xs text-muted-foreground">Manage and browse your codex scrolls based on their type schema.</p>
                </div>

                {!isZen && (
                    <button
                        onClick={openCreateDialog}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <Icon name="Plus" size={16} />
                        Compose Scroll
                    </button>
                )}
            </header>

            {/* Filters */}
            <div className={cn(
                "transition-all duration-700 bg-transparent",
                isZen ? "p-4 bg-transparent border-none mt-2 flex justify-center" : ""
            )}>
                <div className={cn(
                    "w-full transition-all duration-500",
                    isZen ? "max-w-5xl opacity-40 hover:opacity-100" : "px-2"
                )}>
                    <EntryBrowserFilters
                        typeFilter={typeFilter}
                        setTypeFilter={(t) => { setTypeFilter(t); setVisibleCount(50); }}
                        universalQuery={universalQuery}
                        setUniversalQuery={(q) => { setUniversalQuery(q); setVisibleCount(50); }}
                        entryTypes={entryTypes}
                        onClear={handleClear}
                        isZen={isZen}
                        className={cn(isZen && "bg-transparent border-none p-0")}
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className={cn(
                "flex-1 flex flex-col min-h-0 relative transition-all duration-700",
                isZen ? "max-w-5xl mx-auto w-full mb-8 pt-4" : "w-full"
            )}>
                <EntryTable
                    entries={filteredEntries}
                    columns={columns}
                    sortKey={sortKey}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onDelete={handleDelete}
                    selectedIds={selectedIds}
                    onSelectionToggle={handleSelectionToggle}
                    onSelectAllToggle={handleSelectAllToggle}
                />

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-foreground text-background rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 z-50">
                        <div className="flex items-center gap-2 border-r border-background/20 pr-6">
                            <span className="text-xs font-bold uppercase tracking-widest">{selectedIds.size} Selected</span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-[10px] underline opacity-70 hover:opacity-100"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <TagPicker
                                selectedTags={[]} // No single set for multiple entries
                                onAdd={handleBatchTag}
                                label="Add Tag"
                                placeholder="Apply tag to selected..."
                            />

                            <div className="w-px h-4 bg-background/20" />

                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-bold"
                            >
                                <Icon name="Trash2" size={16} />
                                Delete Entries
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Footer */}
                <footer className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <span>Showing {filteredEntries.length} of {allEntries.length} scrolls</span>
                    <span>Keep Active</span>
                </footer>
            </div>

            <ConfirmDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title={deleteConfig?.id ? "Delete Scroll?" : `Delete ${deleteConfig?.count} Scrolls?`}
                description={deleteConfig?.id
                    ? `Are you sure you want to delete "${deleteConfig.title}"? This will also remove its associated metadata and RAG index. This action cannot be undone.`
                    : `Are you sure you want to delete ${deleteConfig?.count} scrolls? This will also remove all associated metadata and RAG indexes. This action cannot be undone.`
                }
                confirmLabel="Delete Forever"
                cancelLabel="Cancel"
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />


            <ConfirmDialog
                open={alertDialog.open}
                onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, open }))}
                title={alertDialog.title}
                description={alertDialog.message}
                confirmLabel="OK"
                cancelLabel={null}
                onConfirm={() => setAlertDialog(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};
