import React, { useState } from 'react';
import { ModuleDefinition } from '../../config/entry-types';
import { ModuleDefinitionEditor } from './editors/ModuleDefinitionEditor';
import { Icon } from '../IconRegistry';
import { Plus, Trash2, Edit2, Box } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetBody,
    SheetFooter,
} from '../ui/Sheet';

interface ModuleListProps {
    modules: Record<string, ModuleDefinition>;
    onChange: (updatedModules: Record<string, ModuleDefinition>) => void;
}

export const ModuleList = ({ modules, onChange }: ModuleListProps) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newKey, setNewKey] = useState('');

    // Sheet state
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleSaveModule = (updatedModule: ModuleDefinition) => {
        if (editingKey) {
            const newModules = { ...modules, [editingKey]: updatedModule };
            onChange(newModules);
            setIsSheetOpen(false);
        }
    };

    const handleDelete = (key: string) => {
        if (confirm(`Are you sure you want to delete the "${key}" module? This may break entry types using it.`)) {
            const newModules = { ...modules };
            delete newModules[key];
            onChange(newModules);
        }
    };

    const handleCreate = () => {
        if (!newKey.trim()) return;
        const key = newKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (modules[key]) {
            alert('Module with this ID already exists.');
            return;
        }

        const newModule: ModuleDefinition = {
            id: key,
            label: newKey.charAt(0).toUpperCase() + newKey.slice(1),
            description: 'New module description.',
            requirements: []
        };

        const newModules = { ...modules, [key]: newModule };
        onChange(newModules);
        setNewKey('');
        setIsCreating(false);

        setEditingKey(key);
        setIsSheetOpen(true);
    };

    const openEditSheet = (key: string) => {
        setEditingKey(key);
        setIsSheetOpen(true);
    };

    const editingModule = editingKey ? modules[editingKey] : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Module Registry</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    disabled={isCreating}
                >
                    <Plus size={14} /> Add New Module
                </button>
            </div>

            {isCreating && (
                <div className="p-3 border border-border rounded-lg bg-card animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-muted-foreground block mb-2">New Module ID (e.g. 'custom-viewer')</label>
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            placeholder="unique-id"
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.entries(modules).map(([key, module]) => (
                    <div
                        key={key}
                        className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors group h-full"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-muted text-muted-foreground">
                                <Box size={20} />
                            </div>
                            <div>
                                <h3 className="font-medium text-sm">{module.label}</h3>
                                <p className="text-xs text-muted-foreground">{key} • {module.requirements.length} requirements</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openEditSheet(key)}
                                className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded"
                                title="Edit Module"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(key)}
                                className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                                title="Delete Module"
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
                        <SheetTitle>Edit Module: {editingModule?.label}</SheetTitle>
                        <SheetDescription>
                            Define the requirements and metadata for this module viewer.
                        </SheetDescription>
                    </SheetHeader>

                    <SheetBody>
                        {editingModule && editingKey && (
                            <ModuleDefinitionEditor
                                key={editingKey}
                                moduleId={editingKey}
                                initialModule={editingModule}
                                onSave={handleSaveModule}
                                formId="module-def-form"
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
                            form="module-def-form"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 shadow-sm"
                        >
                            Save Changes
                        </button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
};
