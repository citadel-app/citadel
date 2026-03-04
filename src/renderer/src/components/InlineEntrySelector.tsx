import { db, CodexEntry } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';
import { useEffect } from 'react';
export const InlineEntrySelector = ({
    query,
    onSelect,
    onSelectIndexChange,
    activeIndex,
    pendingSelect,
    onSelectionProcessed
}: {
    query: string;
    onSelect: (entry: CodexEntry) => void;
    onSelectIndexChange: (index: number) => void;
    activeIndex: number;
    pendingSelect?: boolean;
    onSelectionProcessed?: () => void;
}) => {
    const entries = useLiveQuery(
        async () => {
            if (!query) return await db.entries.limit(10).toArray();
            return await db.entries
                .filter(e => e.title.toLowerCase().includes(query.toLowerCase()))
                .limit(8)
                .toArray();
        },
        [query]
    );

    useEffect(() => {
        if (pendingSelect && entries && entries[activeIndex]) {
            onSelect(entries[activeIndex]);
            onSelectionProcessed?.();
        }
    }, [pendingSelect, entries, activeIndex, onSelect, onSelectionProcessed]);

    useEffect(() => {
        if (entries && entries.length > 0) {
            if (activeIndex >= entries.length) {
                onSelectIndexChange(entries.length - 1);
            } else if (activeIndex < 0) {
                onSelectIndexChange(0);
            }
        }
    }, [entries, activeIndex, onSelectIndexChange]);

    if (!entries || entries.length === 0) return null;

    return (
        <div className="absolute bottom-full mb-2 left-4 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Insert Context</span>
                <span className="text-[10px] text-muted-foreground opacity-50 px-1">↑↓ to navigate</span>
            </div>
            <div className="flex flex-col max-h-64 overflow-y-auto p-1">
                {entries.map((entry, idx) => (
                    <button
                        key={entry.id}
                        onMouseEnter={() => onSelectIndexChange(idx)}
                        onClick={() => onSelect(entry)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-all border border-transparent",
                            idx === activeIndex
                                ? "bg-primary/10 border-primary/20 text-primary translate-x-1"
                                : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            idx === activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            <Icon name="FileText" size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">{entry.title}</p>
                            <p className="text-[9px] opacity-50 uppercase font-bold tracking-tighter">{entry.type}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
