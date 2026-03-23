import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Icon, DynamicIcon } from '@citadel-app/ui';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useConfig } from '../../context/ConfigContext';
import { cn } from '@citadel-app/ui';
import { FixedSizeList as List } from 'react-window';

interface Column {
    key: string;
    label: string;
    type: 'field' | 'metadata' | 'system';
}

interface EntryTableProps {
    entries: any[];
    columns: Column[];
    sortKey: string;
    sortOrder: 'asc' | 'desc';
    onSort: (key: string) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    selectedIds: Set<string>;
    onSelectionToggle: (id: string) => void;
    onSelectAllToggle: () => void;
}

const Row = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
    const { entries, columns, selectedIds, onSelectionToggle, onDelete, navigate, gridTemplateColumns, renderCellValue } = data;
    const entry = entries[index];
    if (!entry) return null;
    const isSelected = selectedIds.has(entry.id);

    return (
        <div
            style={{ ...style, display: 'grid', gridTemplateColumns }}
            onClick={() => navigate(`/${entry.type}/${entry.id}`)}
            className={cn(
                "group items-center border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer px-4",
                isSelected && "bg-primary/5 hover:bg-primary/10"
            )}
        >
            <div className="flex items-center" onClick={e => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectionToggle(entry.id)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 transition-all cursor-pointer"
                />
            </div>
            {columns.map((col: any) => (
                <div key={`${entry.id}-${col.key}`} className="px-4 overflow-hidden">
                    {renderCellValue(entry, col)}
                </div>
            ))}
            <div className="text-right" onClick={e => e.stopPropagation()}>
                <button
                    onClick={(e) => onDelete(entry.id, e)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Entry"
                >
                    <Icon name="Trash2" size={14} />
                </button>
            </div>
        </div>
    );
});

const TypedRow = Row as unknown as React.ComponentType<import('react-window').ListChildComponentProps<any>>;

export const EntryTable = ({
    entries,
    columns,
    sortKey,
    sortOrder,
    onSort,
    onDelete,
    selectedIds,
    onSelectionToggle,
    onSelectAllToggle,
}: EntryTableProps) => {
    const navigate = useNavigate();
    const { getEntryTypeConfig } = useConfig();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 600 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (height > 0) {
                    setDimensions({ width, height });
                    console.log('[EntryTable] ResizeObserver dimensions:', height, width);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const renderCellValue = (entry: any, column: Column) => {
        let value = '';
        if (column.type === 'system') {
            if (column.key === 'title') {
                const config = getEntryTypeConfig(entry.type) || {
                    accentBg: 'bg-muted',
                    accentColor: 'text-muted-foreground',
                    icon: 'FileQuestion'
                };
                return (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-md ${config.accentBg} ${config.accentColor} shrink-0`}>
                            <Icon name={config.icon} size={16} />
                        </div>
                        <div className="flex flex-col min-w-0 overflow-hidden">
                            <span className="font-semibold text-foreground leading-none truncate">{entry.title}</span>
                            {entry.tags && entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden max-h-[18px]">
                                    {entry.tags.map((tag: string) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-primary/5 text-primary/70 text-[9px] font-medium border border-primary/10 whitespace-nowrap"
                                        >
                                            <DynamicIcon name={tag} size={8} />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            if (column.key === 'type') return <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-mono uppercase tracking-tight">{entry.type}</span>;
            if (column.key === 'updatedAt') {
                const date = entry.updatedAt ? (typeof entry.updatedAt === 'string' ? new Date(entry.updatedAt) : entry.updatedAt) : null;
                return <span className="text-xs text-muted-foreground">{date ? format(date, 'MMM d, yyyy') : 'N/A'}</span>;
            }
            return entry[column.key];
        }

        value = entry.metadata?.[column.key] || entry[column.key];

        if (typeof value === 'object' && value !== null) {
            const valArray = value as any;
            if (Array.isArray(valArray)) return (
                <div className="flex flex-wrap gap-1">
                    {valArray.slice(0, 2).map((v: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-[4px] text-[10px]">
                            <DynamicIcon name={String(v)} size={8} />
                            {String(v)}
                        </span>
                    ))}
                    {valArray.length > 2 && <span className="text-[10px] text-muted-foreground">+{valArray.length - 2}</span>}
                </div>
            );
            return JSON.stringify(value);
        }

        return <span className="text-sm truncate block max-w-full" title={String(value)}>{String(value || '—')}</span>;
    };

    const gridTemplateColumns = useMemo(() => {
        return `48px ${columns.map(() => '1fr').join(' ')} 80px`;
    }, [columns]);

    const itemData = useMemo(() => ({
        entries,
        columns,
        selectedIds,
        onSelectionToggle,
        onDelete,
        navigate,
        gridTemplateColumns,
        renderCellValue
    }), [entries, columns, selectedIds, onSelectionToggle, onDelete, navigate, gridTemplateColumns, renderCellValue]);

    return (
        <div className="flex-1 flex flex-col bg-background overflow-hidden relative border-2 border-transparent">
            {/* Header */}
            <div
                className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 border-b border-border shadow-sm px-4 shrink-0"
                style={{ display: 'grid', gridTemplateColumns }}
            >
                <div className="py-3 w-12 flex items-center">
                    <input
                        type="checkbox"
                        checked={entries.length > 0 && selectedIds.size === entries.length}
                        onChange={onSelectAllToggle}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 transition-all cursor-pointer"
                    />
                </div>
                {columns.map(col => {
                    const isSorted = sortKey === col.key;
                    return (
                        <div
                            key={`header-${col.key}`}
                            onClick={() => onSort(col.key)}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer select-none group/header flex items-center overflow-hidden flex-1"
                        >
                            <div className="flex items-center gap-1 truncate">
                                {col.label}
                                {isSorted ? (
                                    <Icon
                                        name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                                        size={12}
                                        className="text-primary shrink-0"
                                    />
                                ) : (
                                    <Icon
                                        name="ChevronsUpDown"
                                        size={12}
                                        className="opacity-0 group-hover/header:opacity-50 transition-opacity shrink-0"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="py-3 w-20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right select-none flex items-center justify-end">
                    Actions
                </div>
            </div>

            {/* List area */}
            <div ref={containerRef} className="flex-1 min-h-[400px] w-full relative">
                {entries.length > 0 ? (
                    <List
                        height={dimensions.height}
                        itemCount={entries.length}
                        itemSize={64}
                        width={dimensions.width || '100%'}
                        itemData={itemData}
                        className="custom-scrollbar"
                    >
                        {TypedRow}
                    </List>
                ) : (
                    <div className="px-4 py-12 text-center text-muted-foreground italic">
                        No entries found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
};
