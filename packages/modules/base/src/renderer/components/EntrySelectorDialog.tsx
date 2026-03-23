import { useState, useMemo, memo } from 'react';
import { Dialog as Root, DialogPortal as Portal, DialogOverlay as Overlay, DialogTrigger as Trigger, DialogClose as Close, DialogContent as Content, DialogHeader as Header, DialogFooter as Footer, DialogTitle as Title, DialogDescription as Description } from '@citadel-app/ui';
const Dialog = { Root, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description };
import { useLiveQuery } from 'dexie-react-hooks';
import { FixedSizeList as List } from 'react-window';
import { db, CodexEntry } from '../lib/db';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';

interface EntrySelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
}

const EntryRow = memo((props: {
    index: number;
    style: React.CSSProperties;
    data: {
        entries: CodexEntry[];
        selectedIds: Set<string>;
        toggleId: (id: string) => void;
    };
}) => {
    const { index, style, data } = props;
    const { entries, selectedIds, toggleId } = data;
    const entry = entries[index];
    if (!entry) return null;
    const isSelected = selectedIds.has(entry.id);

    return (
        <div style={style} className="px-2">
            <div
                onClick={() => toggleId(entry.id)}
                className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border h-[64px]",
                    isSelected
                        ? "bg-primary/5 border-primary/20 text-foreground"
                        : "hover:bg-muted border-transparent text-muted-foreground hover:text-foreground"
                )}
            >
                <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"
                )}>
                    {isSelected && <Icon name="Check" size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-sm font-semibold truncate leading-tight">{entry.title}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-1.5 rounded h-4 flex items-center">{entry.type}</span>
                    </div>
                    <p className="text-[10px] opacity-60 truncate">
                        {entry.tags.length > 0 ? entry.tags.join(', ') : 'No tags'} • Last updated {new Date(entry.updatedAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
});

export const EntrySelectorDialog = ({ open, onOpenChange, selectedIds, onSelectionChange }: EntrySelectorDialogProps) => {
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) return allEntries;
        const q = searchQuery.toLowerCase();
        return allEntries.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q) ||
            e.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [allEntries, searchQuery]);

    const toggleId = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    };

    const listData = useMemo(() => ({
        entries: filteredEntries,
        selectedIds,
        toggleId
    }), [filteredEntries, selectedIds]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[85vh] bg-card border border-border rounded-2xl shadow-2xl z-[101] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                    <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                        <div>
                            <Dialog.Title className="text-lg font-bold">Select Context Entries</Dialog.Title>
                            <Dialog.Description className="text-xs text-muted-foreground">Choose specific entries to include in your chat context.</Dialog.Description>
                        </div>
                        <Dialog.Close className="p-2 hover:bg-muted rounded-full transition-colors">
                            <Icon name="X" size={18} />
                        </Dialog.Close>
                    </div>

                    <div className="p-4 bg-muted/10 border-b border-border">
                        <div className="relative">
                            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search entries by title, type, or tags..."
                                className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-background/50">
                        {filteredEntries.length > 0 ? (
                            <List
                                height={500}
                                width="100%"
                                itemCount={filteredEntries.length}
                                itemSize={72}
                                itemData={listData}
                                children={EntryRow as any}
                                className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-2"
                            />
                        ) : (
                            <div className="p-8 text-center space-y-2 h-full flex flex-col items-center justify-center">
                                <Icon name="Search" size={32} className="mx-auto text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground italic">No entries found matching your search.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-border flex items-center justify-between bg-muted/5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            {selectedIds.size} Selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onSelectionChange(new Set())}
                                className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-lg transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
