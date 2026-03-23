import React, { useState } from 'react';
import { type EntryFieldConfig } from '@citadel-app/core';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { cn } from '../../../index';
import { Icon } from '../../../index';

interface FieldListEditorProps {
    fields: EntryFieldConfig[];
    onChange: (fields: EntryFieldConfig[]) => void;
}

export const FieldListEditor = ({ fields, onChange }: FieldListEditorProps) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleAdd = () => {
        const newField: EntryFieldConfig = {
            key: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false
        };
        onChange([...fields, newField]);
        setExpandedIndex(fields.length); // Expand the new item
    };

    const handleUpdate = (index: number, updated: EntryFieldConfig) => {
        const newFields = [...fields];
        newFields[index] = updated;
        onChange(newFields);
    };

    const handleDelete = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        onChange(newFields);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === fields.length - 1) return;

        const newFields = [...fields];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
        onChange(newFields);

        if (expandedIndex === index) setExpandedIndex(swapIndex);
        else if (expandedIndex === swapIndex) setExpandedIndex(index);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Fields (Form Inputs)</label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                >
                    <Plus size={12} /> Add Field
                </button>
            </div>

            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={index} className="border border-border rounded-md bg-card overflow-hidden">
                        <div
                            className="flex items-center p-2 gap-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        >
                            <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => moveField(index, 'up')} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp size={10} /></button>
                                <button type="button" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown size={10} /></button>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{field.label}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 overflow-hidden">
                                    <span className="font-mono bg-muted px-1 rounded flex-shrink-0">{String(field.key)}</span>
                                    <span className="flex-shrink-0">{field.type}</span>
                                    {field.required && <span className="text-orange-500 flex-shrink-0">Required</span>}
                                    {field.description && (
                                        <span className="truncate italic opacity-60 ml-1">
                                            — {field.description}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                            >
                                <Trash2 size={14} />
                            </button>

                            <ChevronDown
                                size={14}
                                className={cn("text-muted-foreground transition-transform", expandedIndex === index && "rotate-180")}
                            />
                        </div>

                        {expandedIndex === index && (
                            <div className="p-3 border-t border-border space-y-3 bg-background">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Label</label>
                                        <input
                                            value={field.label}
                                            onChange={(e) => handleUpdate(index, { ...field, label: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Key</label>
                                        <input
                                            value={String(field.key)}
                                            onChange={(e) => handleUpdate(index, { ...field, key: e.target.value })} // Note: keyof CodexEntry might be issue if strictly typed, but interface allows string
                                            className="w-full h-8 px-2 text-sm border rounded bg-background font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Type</label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => handleUpdate(index, { ...field, type: e.target.value as any })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        >
                                            <option value="text">Text</option>
                                            <option value="textarea">Text Area</option>
                                            <option value="tags">Tags</option>
                                            <option value="url">URL</option>
                                            <option value="file">File Upload</option>
                                            <option value="select">Select Dropdown</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input
                                            type="checkbox"
                                            id={`req-${index}`}
                                            checked={field.required}
                                            onChange={(e) => handleUpdate(index, { ...field, required: e.target.checked })}
                                            className="rounded border-input text-primary focus:ring-primary"
                                        />
                                        <label htmlFor={`req-${index}`} className="text-sm">Required</label>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Placeholder</label>
                                    <input
                                        value={field.placeholder || ''}
                                        onChange={(e) => handleUpdate(index, { ...field, placeholder: e.target.value })}
                                        className="w-full h-8 px-2 text-sm border rounded bg-background"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Description (AI Hint)</label>
                                    <input
                                        value={field.description || ''}
                                        onChange={(e) => handleUpdate(index, { ...field, description: e.target.value })}
                                        className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        placeholder="Internal description used as hint for AI..."
                                    />
                                </div>

                                {field.type === 'select' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Options (comma separated label:value)</label>
                                        <input
                                            placeholder="Label:Value, Label2:Value2"
                                            value={field.options?.map(o => `${o.label}:${o.value}`).join(', ') || ''}
                                            onChange={(e) => {
                                                const opts = e.target.value.split(',').map(s => {
                                                    const [l, v] = s.split(':').map(part => part.trim());
                                                    return { label: l, value: v || l }; // Fallback value to label if missing
                                                }).filter(o => o.label);
                                                handleUpdate(index, { ...field, options: opts });
                                            }}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Format: Label:Value, Item2, Item3</p>
                                    </div>
                                )}

                                {field.type === 'file' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Accept (Extensions)</label>
                                        <input
                                            placeholder=".pdf, .png, image/*"
                                            value={field.accept || ''}
                                            onChange={(e) => handleUpdate(index, { ...field, accept: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
