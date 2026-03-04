import { useState, useRef, useEffect, useMemo } from 'react';
import { CodexEntry } from '../../lib/db';
import { useConfig } from '../../context/ConfigContext';
import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanLaneProps {
    lane: {
        id: string;
        title: string;
        items: CodexEntry[];
    };
    pivotField?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const ITEMS_PER_PAGE = 20;

export const KanbanLane = ({ lane, isCollapsed, onToggleCollapse }: KanbanLaneProps) => {
    const { getEntryTypeConfig } = useConfig();
    const { setNodeRef } = useDroppable({
        id: lane.id,
    });

    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset visibility when lane items change
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [lane.items]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            if (visibleCount < lane.items.length) {
                setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, lane.items.length));
            }
        }
    };

    const visibleItems = useMemo(() =>
        lane.items.slice(0, visibleCount),
        [lane.items, visibleCount]);

    if (isCollapsed) {
        return (
            <div className="flex-shrink-0 w-12 bg-muted/20 rounded-lg flex flex-col border border-border/30 hover:bg-muted/30 transition-all cursor-pointer group/collapsed" onClick={onToggleCollapse}>
                <div className="py-4 flex flex-col items-center gap-4 h-full">
                    <button className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors">
                        <Icon name="ChevronRight" size={14} />
                    </button>
                    <div className="flex-1 flex items-center justify-center">
                        <h3 className="font-bold text-[10px] text-muted-foreground uppercase tracking-[0.2em] [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                            {lane.title}
                        </h3>
                    </div>
                    <span className="text-[9px] bg-background px-1.5 py-0.5 rounded-full border border-border text-muted-foreground font-mono">
                        {lane.items.length}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-shrink-0 w-80 bg-muted/30 rounded-lg flex flex-col max-h-full border border-border/50 shadow-inner group/lane">
            <div className="p-4 flex items-center justify-between border-b border-border/50 bg-muted/20 rounded-t-lg">
                <h3 className="font-bold text-sm flex items-center gap-2 truncate pr-2">
                    <span className="w-2 h-2 rounded-full bg-primary/40 group-hover/lane:bg-primary transition-colors shrink-0" />
                    <span className="truncate">{lane.title}</span>
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] bg-background px-2 py-0.5 rounded-full border border-border text-muted-foreground font-mono shadow-sm">
                        {lane.items.length}
                    </span>
                    <button
                        onClick={onToggleCollapse}
                        className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"
                        title="Collapse Lane"
                    >
                        <Icon name="ChevronLeft" size={14} />
                    </button>
                </div>
            </div>

            <div
                ref={(node) => {
                    setNodeRef(node);
                    (scrollRef as any).current = node;
                }}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
                <SortableContext
                    items={lane.items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {visibleItems.map((entry) => (
                        <KanbanCard
                            key={entry.id}
                            entry={entry}
                            laneId={lane.id}
                            getEntryTypeConfig={getEntryTypeConfig}
                        />
                    ))}
                </SortableContext>

                {lane.items.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground/30 text-xs italic space-y-2 border-2 border-dashed border-border/20 rounded-lg">
                        <Icon name="Inbox" size={24} className="opacity-10" />
                        <span>Empty Lane</span>
                    </div>
                )}

                {visibleCount < lane.items.length && (
                    <div className="py-4 text-center text-[10px] text-muted-foreground animate-pulse">
                        Loading more...
                    </div>
                )}
            </div>

        </div>
    );
};

const KanbanCard = ({ entry, laneId, getEntryTypeConfig }: { entry: CodexEntry, laneId: string, getEntryTypeConfig: any }) => {
    const typeConfig = getEntryTypeConfig(entry.type);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: entry.id,
        data: {
            type: 'entry',
            entry,
            laneId
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden",
                isDragging && "ring-2 ring-primary/50 shadow-2xl"
            )}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary/40 transition-colors" />

            <Link
                to={`/entry/${entry.id}`}
                className="block mb-2 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-xs font-bold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {entry.title}
                </div>
            </Link>

            <div className="flex flex-wrap gap-1.5 mb-3">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground border border-border/50">
                    <Icon name={typeConfig?.icon || 'FileText'} size={10} className="shrink-0" />
                    <span className="text-[8px] uppercase font-bold tracking-tight">
                        {entry.type}
                    </span>
                </div>

                {entry.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-primary/5 text-primary/70 rounded border border-primary/10 italic font-medium">
                        #{tag}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-border/30 pt-2 mt-auto">
                <div className="flex items-center gap-1.5 opacity-50">
                    <Icon name="Clock" size={10} />
                    {new Date(entry.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="opacity-0 group-hover:opacity-40 transition-opacity">
                    <Icon name="GripVertical" size={12} />
                </div>
            </div>
        </div>
    );
};
