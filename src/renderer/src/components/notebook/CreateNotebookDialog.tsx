import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils';
import { NotebookConfig } from '../../pages/NotebookPage';
import { SearchInput } from '../../search';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useConfig } from '../../context/ConfigContext';
import { SearchService } from '../../search/services/SearchService';
import { Command } from 'cmdk';
import * as Popover from '@radix-ui/react-popover';

interface CreateNotebookDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (config: Omit<NotebookConfig, 'id'>) => void;
    editingConfig?: NotebookConfig | null;
}

export const CreateNotebookDialog = ({
    open,
    onOpenChange,
    onCreate,
    editingConfig
}: CreateNotebookDialogProps) => {
    const [name, setName] = useState(editingConfig?.name || '');
    const [query, setQuery] = useState(editingConfig?.query || '');
    const [orgType, setOrgType] = useState<NotebookConfig['organizationType']>(editingConfig?.organizationType || 'manual');
    const [metaField, setMetaField] = useState(editingConfig?.metadataField || 'type');

    // Reset state when opening/editing different config
    useEffect(() => {
        if (open) {
            setName(editingConfig?.name || '');
            setQuery(editingConfig?.query || '');
            setOrgType(editingConfig?.organizationType || 'manual');
            setMetaField(editingConfig?.metadataField || 'type');
        }
    }, [open, editingConfig]);

    const handleCreate = () => {
        if (!name) return;
        onCreate({
            name,
            query,
            organizationType: orgType,
            metadataField: orgType === 'metadata' ? metaField : undefined
        });
        setName('');
        setQuery('');
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-lg bg-card border border-border/50 shadow-2xl rounded-[2.5rem] p-8 z-[210] animate-in zoom-in-95 fade-in duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 shadow-inner">
                            <Icon name="Book" size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <Dialog.Title className="text-xl font-black uppercase tracking-tighter italic">
                                New Notebook
                            </Dialog.Title>
                            <Dialog.Description className="text-xs font-medium text-muted-foreground opacity-60">
                                Define how you want to organize your entries.
                            </Dialog.Description>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Name Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notebook Name</label>
                            <input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Research Book..."
                                className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all placeholder:italic placeholder:font-medium"
                            />
                        </div>

                        {/* Query Input with Intellisense */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Search Query (Optional)</label>
                            <SearchInput
                                value={query}
                                onChange={setQuery}
                                onClear={() => setQuery('')}
                                placeholder="e.g. #project-x or type:paper"
                                className="notebook-query-input"
                            />
                        </div>

                        {/* Org Type Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Organization Mode</label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['manual', 'path', 'tag', 'metadata'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setOrgType(t)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                                            orgType === t
                                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                : "bg-muted/5 border-border/40 text-muted-foreground hover:bg-muted/10"
                                        )}
                                    >
                                        <Icon name={t === 'manual' ? 'Move' : t === 'path' ? 'FolderTree' : t === 'tag' ? 'Tag' : 'Database'} size={18} />
                                        <span className="text-[9px] font-black uppercase tracking-tight">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {orgType === 'metadata' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Metadata Field</label>
                                <MetadataFieldSelect
                                    value={metaField}
                                    onChange={setMetaField}
                                    query={query}
                                />
                            </div>
                        )}
                    </div>

                    <div className="mt-10 flex gap-3">
                        <Dialog.Close asChild>
                            <button className="flex-1 py-3.5 rounded-2xl border border-border font-black uppercase tracking-widest text-[10px] hover:bg-muted/50 transition-all">
                                Cancel
                            </button>
                        </Dialog.Close>
                        <button
                            onClick={handleCreate}
                            disabled={!name}
                            className="flex-[2] py-3.5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            Generate Book
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

interface MetadataFieldSelectProps {
    value: string;
    onChange: (value: string) => void;
    query?: string;
}

const MetadataFieldSelect = ({ value, onChange, query = '' }: MetadataFieldSelectProps) => {
    const { entryTypes } = useConfig();
    const [open, setOpen] = useState(false);
    const allEntries = useLiveQuery(() => db.entries.toArray()) || [];

    const availableFields = useMemo(() => {
        // Evaluate query to get matching entries
        const filteredEntries = SearchService.evaluate(
            query,
            allEntries,
            (type) => entryTypes[type] || Object.values(entryTypes)[0]
        );

        // Aggregate metadata from those entries
        const meta = SearchService.aggregateMetadata(filteredEntries, entryTypes);
        // Clean up internal system fields and common ones
        return meta.fields.filter(f => f !== 'content' && f !== 'id' && f !== 'title' && f !== 'filePath' && f !== 'frontmatter');
    }, [allEntries, entryTypes, query]);

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all flex items-center justify-between hover:bg-muted/30 group shadow-inner"
                >
                    <span className={cn("truncate", !value && "italic font-medium text-muted-foreground/50")}>
                        {value || "Select field (author, difficulty...)"}
                    </span>
                    <Icon name="ChevronDown" size={14} className={cn("opacity-40 transition-transform duration-200", open && "rotate-180")} />
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="w-[var(--radix-popover-trigger-width)] bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[1.5rem] p-2 z-[300] animate-in fade-in zoom-in-95 duration-200"
                    sideOffset={8}
                >
                    <Command className="flex flex-col">
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20 mb-1">
                            <Icon name="Search" size={14} className="text-muted-foreground opacity-50" />
                            <Command.Input
                                placeholder="Search fields..."
                                className="flex-1 bg-transparent border-none outline-none text-xs font-bold placeholder:italic placeholder:font-medium text-foreground"
                            />
                        </div>
                        <Command.List className="max-h-60 overflow-y-auto custom-scrollbar">
                            <Command.Empty className="py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                                No fields found
                            </Command.Empty>
                            {availableFields.map(field => (
                                <Command.Item
                                    key={field}
                                    onSelect={() => {
                                        onChange(field);
                                        setOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
                                >
                                    <div className="p-2 rounded-xl bg-muted/20 group-aria-selected:bg-primary/20 transition-colors shadow-inner">
                                        <Icon name="Database" size={12} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-tight">{field}</span>
                                    {value === field && (
                                        <div className="ml-auto p-1 rounded-full bg-primary/20">
                                            <Icon name="Check" size={10} className="text-primary" />
                                        </div>
                                    )}
                                </Command.Item>
                            ))}
                        </Command.List>
                    </Command>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
