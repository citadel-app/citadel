import React, { useState } from 'react';
import { type EntryTypeConfig } from '@citadel-app/core';
import { EntryTypeEditor } from './EntryTypeEditor';
import { Icon } from '@citadel-app/ui';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetBody,
    SheetFooter,
} from '@citadel-app/ui';
import { useToast } from '@citadel-app/ui';
import { ConfirmDialog } from '@citadel-app/ui';

interface EntryTypeListProps {
    entries: Record<string, EntryTypeConfig>;
    onChange: (updatedEntries: Record<string, EntryTypeConfig>) => void;
}

export const EntryTypeList = ({ entries, onChange }: EntryTypeListProps) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newKey, setNewKey] = useState('');

    // Sheet state
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSaveEntry = (updatedEntry: EntryTypeConfig) => {
        if (editingKey) {
            const newEntries = { ...entries, [editingKey]: updatedEntry };
            onChange(newEntries);
            setIsSheetOpen(false); // Close sheet on save
        }
    };

    const handleDelete = (key: string) => {
        setConfirmDeleteKey(key);
    };

    const executeDelete = () => {
        if (confirmDeleteKey) {
            const newEntries = { ...entries };
            delete newEntries[confirmDeleteKey];
            onChange(newEntries);
        }
        setConfirmDeleteKey(null);
    };

    const handleCreate = () => {
        if (!newKey.trim()) return;
        if (entries[newKey]) {
            toast('Entry type with this key already exists.', { type: 'warning' });
            return;
        }

        const newEntry: EntryTypeConfig = {
            type: newKey,
            label: newKey.charAt(0).toUpperCase() + newKey.slice(1),
            folder: `00_${newKey.charAt(0).toUpperCase() + newKey.slice(1)}`,
            icon: 'FileText',
            accentColor: 'text-gray-500',
            accentBg: 'bg-gray-500/10',
            accentHover: 'hover:bg-gray-500/20',
            description: 'New entry type description.',
            fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
            metadata: [],
            sections: [{ title: 'Notes', icon: 'FileText' }],
            view: { layout: 'single', modules: { primary: 'sections' } }
        };

        const newEntries = { ...entries, [newKey]: newEntry };
        onChange(newEntries);
        setNewKey('');
        setIsCreating(false);

        // Open edit sheet for the new entry immediately
        setEditingKey(newKey);
        setIsSheetOpen(true);
    };

    const openEditSheet = (key: string) => {
        setEditingKey(key);
        setIsSheetOpen(true);
    }

    const editingEntry = editingKey ? entries[editingKey] : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Entry Types</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    disabled={isCreating}
                >
                    <Plus size={14} /> Add New
                </button>
            </div>

            {isCreating && (
                <div className="p-3 border border-border rounded-lg bg-card animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-muted-foreground block mb-2">New Entry Type Key (e.g. 'journal')</label>
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                            placeholder="unique-key"
                            className="flex-1 h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <button
                            onClick={handleCreate}
                            className="px-3 h-8 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-3 h-8 bg-muted text-muted-foreground text-xs rounded hover:bg-muted/80"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Changed space-y-2 to a responsive grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.entries(entries).map(([key, entry]) => (
                    <div
                        key={key}
                        className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors group h-full"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${entry.accentBg} ${entry.accentColor}`}>
                                <Icon name={entry.icon} size={20} />
                            </div>
                            <div>
                                <h3 className="font-medium text-sm">{entry.label}</h3>
                                <p className="text-xs text-muted-foreground">{key} • {entry.folder}</p>
                            </div>
                        </div>

                        {/* Buttons remain on the right, appearing on hover */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openEditSheet(key)}
                                className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded"
                                title="Edit Entry Type"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(key)}
                                className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                                title="Delete Entry Type"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" size="xl">
                    <SheetHeader>
                        <SheetTitle>Edit Entry Type: {editingEntry?.label}</SheetTitle>
                        <SheetDescription>
                            Configure the behavior, appearance, and structure of this entry type.
                        </SheetDescription>
                    </SheetHeader>

                    <SheetBody>
                        {editingEntry && editingKey && (
                            <EntryTypeEditor
                                key={editingKey} // Force re-mount on key change
                                initialEntry={editingEntry}
                                onSave={handleSaveEntry}
                                formId="entry-type-form"
                            />
                        )}
                    </SheetBody>

                    <SheetFooter>
                        <button
                            type="button"
                            onClick={() => setIsSheetOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="entry-type-form"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 shadow-sm"
                        >
                            Save Changes
                        </button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <ConfirmDialog
                open={!!confirmDeleteKey}
                onOpenChange={(open) => !open && setConfirmDeleteKey(null)}
                title="Delete Entry Type"
                description={`Are you sure you want to delete the "${confirmDeleteKey}" entry type?`}
                confirmLabel="Delete"
                onConfirm={executeDelete}
                variant="destructive"
            />
        </div>
    );
};
