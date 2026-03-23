import { useState, useMemo, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { Icon, useDebounce } from '@citadel-app/ui';
import { Dialog as Root, DialogPortal as Portal, DialogOverlay as Overlay, DialogTrigger as Trigger, DialogClose as Close, DialogContent as Content, DialogHeader as Header, DialogFooter as Footer, DialogTitle as Title, DialogDescription as Description } from '@citadel-app/ui';
const Dialog = { Root, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description };
import { SearchInput } from '../../search';
import { SearchService } from '../../search';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';


interface CreateBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (board: { name: string; query: string; pivotField: string }) => void;
}

export const CreateBoardDialog = ({ open, onOpenChange, onSave }: CreateBoardDialogProps) => {
    const { getEntryTypeConfig } = useConfig();
    const [name, setName] = useState('');
    const [query, setQuery] = useState('');
    const [pivotField, setPivotField] = useState('tags');

    const debouncedQuery = useDebounce(query, 300);
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            ...e,
            content: undefined,
            highlights: undefined,
            whiteboard: undefined,
            code: undefined
        }));
    }) || [];

    // Dynamically discover pivots based on entries matching the query
    const availablePivots = useMemo(() => {
        const matchingEntries = SearchService.evaluate(debouncedQuery, allEntries, getEntryTypeConfig);

        // Always include tags
        const pivots = new Map<string, { key: string, label: string }>();
        pivots.set('tags', { key: 'tags', label: 'Tags' });

        // Extract fields/metadata from matching entries
        matchingEntries.forEach(entry => {
            const config = getEntryTypeConfig(entry.type);
            if (!config) return;

            config.fields.forEach(f => {
                const key = f.key as string;
                if (!pivots.has(key)) {
                    pivots.set(key, { key, label: `${f.label}` });
                }
            });

            config.metadata.forEach(m => {
                const key = m.key as string;
                if (!pivots.has(key)) {
                    pivots.set(key, { key, label: `${m.label}` });
                }
            });
        });

        return Array.from(pivots.values());
    }, [debouncedQuery, allEntries, getEntryTypeConfig]);

    // Ensure pivotField is still valid when query changes
    useEffect(() => {
        if (!availablePivots.some(p => p.key === pivotField)) {
            setPivotField('tags');
        }
    }, [availablePivots, pivotField]);

    const handleSave = () => {
        if (!name || !query) return;
        onSave({ name, query, pivotField });
        setName('');
        setQuery('');
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border shadow-2xl rounded-xl p-6 z-50 animate-in zoom-in-95 duration-300">
                    <Dialog.Title className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Icon name="Columns3" size={24} className="text-primary" />
                        Create Kanban Board
                    </Dialog.Title>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Board Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Active Tasks"
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-1 ring-primary outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Smart Query</label>
                            <SearchInput
                                value={query}
                                onChange={setQuery}
                                onClear={() => setQuery('')}
                                placeholder="Try: type:problem difficulty:Hard"
                                className="w-full"
                            />
                            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed opacity-60">
                                Boards automatically populate based on this query.
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Pivot By (Lanes)</label>
                            <div className="relative">
                                <select
                                    value={pivotField}
                                    onChange={e => setPivotField(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer appearance-none shadow-inner"
                                >
                                    {availablePivots.map(p => (
                                        <option key={p.key} value={p.key}>{p.label}</option>
                                    ))}
                                </select>
                                <Icon name="ChevronDown" size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 opacity-60">
                                Columns are created for each unique value of this field.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 flex justify-end gap-3">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="px-6 py-2 text-sm font-semibold hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name || !query}
                            className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:shadow-xl disabled:opacity-30 transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <Icon name="Check" size={16} />
                            Create Board
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
