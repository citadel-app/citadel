import React, { useRef, useEffect } from 'react';
import { Icon, DynamicIcon } from '../IconRegistry';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useConfig } from '../../context/ConfigContext';
import { cn } from '../../lib/utils';

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
    onLoadMore?: () => void;
    hasMore?: boolean;
}

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
    onLoadMore,
    hasMore
}: EntryTableProps) => {
    const navigate = useNavigate();

    const { getEntryTypeConfig } = useConfig();
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && onLoadMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    const renderCellValue = (entry: any, column: Column) => {
        let value = '';
        if (column.type === 'system') {
            if (column.key === 'title') {
                const config = getEntryTypeConfig(entry.type);
                return (
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${config.accentBg} ${config.accentColor} shrink-0`}>
                            <Icon name={config.icon} size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground leading-none truncate">{entry.title}</span>
                            {entry.tags && entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
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
                return <span className="text-xs text-muted-foreground">{entry.updatedAt ? format(entry.updatedAt, 'MMM d, yyyy') : 'N/A'}</span>;
            }
            return entry[column.key];
        }

        if (column.type === 'metadata') {
            value = entry.metadata?.[column.key] || entry[column.key];
        } else {
            // Fields are top-level or in custom props depending on implementation
            // In Codex, title/type/id are top-level, others are in metadata or the file itself
            value = entry.metadata?.[column.key] || entry[column.key];
        }

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

        return <span className="text-sm truncate block max-w-[200px]" title={String(value)}>{String(value || '—')}</span>;
    };

    return (
        <div className="flex-1 overflow-auto bg-background">
            <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                    <tr className="border-b border-border shadow-sm">
                        <th className="px-4 py-3 w-10">
                            <input
                                type="checkbox"
                                checked={entries.length > 0 && selectedIds.size === entries.length}
                                onChange={onSelectAllToggle}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 transition-all cursor-pointer"
                            />
                        </th>
                        {columns.map(col => {
                            const isSorted = sortKey === col.key;
                            return (
                                <th
                                    key={`header-${col.key}`}
                                    onClick={() => onSort(col.key)}
                                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer select-none group/header"
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {isSorted ? (
                                            <Icon
                                                name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                                                size={12}
                                                className="text-primary"
                                            />
                                        ) : (
                                            <Icon
                                                name="ChevronsUpDown"
                                                size={12}
                                                className="opacity-0 group-hover/header:opacity-50 transition-opacity"
                                            />
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right select-none">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {entries.map(entry => (
                        <EntryTableRow
                            key={entry.id}
                            entry={entry}
                            columns={columns}
                            isSelected={selectedIds.has(entry.id)}
                            onToggle={() => onSelectionToggle(entry.id)}
                            onDelete={(e) => onDelete(entry.id, e)}
                            onNavigate={() => navigate(`/${entry.type}/${entry.id}`)}
                            renderCellValue={renderCellValue}
                        />
                    ))}
                    {entries.length === 0 && (
                        <tr>
                            <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-muted-foreground italic">
                                No entries found matching your filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center">
                {hasMore && (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                        <Icon name="Loader2" size={16} className="animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Loading more entries...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const EntryTableRow = React.memo(({
    entry,
    columns,
    isSelected,
    onToggle,
    onDelete,
    onNavigate,
    renderCellValue
}: {
    entry: any,
    columns: Column[],
    isSelected: boolean,
    onToggle: () => void,
    onDelete: (e: React.MouseEvent) => void,
    onNavigate: () => void,
    renderCellValue: (entry: any, column: Column) => React.ReactNode
}) => (
    <tr
        onClick={onNavigate}
        className={cn(
            "group hover:bg-muted/30 transition-colors cursor-pointer",
            isSelected && "bg-primary/5 hover:bg-primary/10"
        )}
    >
        <td className="px-4 py-3 align-middle" onClick={e => e.stopPropagation()}>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4 transition-all cursor-pointer"
            />
        </td>
        {columns.map(col => (
            <td key={`${entry.id}-${col.key}`} className="px-4 py-3 align-middle">
                {renderCellValue(entry, col)}
            </td>
        ))}
        <td className="px-4 py-3 align-middle text-right" onClick={e => e.stopPropagation()}>
            <button
                onClick={onDelete}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                title="Delete Entry"
            >
                <Icon name="Trash2" size={14} />
            </button>
        </td>
    </tr>
));

