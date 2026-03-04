import React, { useState } from 'react';
import { EntryMetadataConfig } from '../../../config/entry-types';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Icon, LUCIDE_ICON_NAMES } from '../../IconRegistry';

interface MetadataListEditorProps {
    metadata: EntryMetadataConfig[];
    onChange: (metadata: EntryMetadataConfig[]) => void;
}

export const MetadataListEditor = ({ metadata, onChange }: MetadataListEditorProps) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleAdd = () => {
        const newItem: EntryMetadataConfig = {
            key: `meta_${Date.now()}`,
            label: 'New Metadata',
            type: 'text',
            icon: 'Hash'
        };
        onChange([...metadata, newItem]);
        setExpandedIndex(metadata.length);
    };

    const handleUpdate = (index: number, updated: EntryMetadataConfig) => {
        const newMeta = [...metadata];
        newMeta[index] = updated;
        onChange(newMeta);
    };

    const handleDelete = (index: number) => {
        const newMeta = metadata.filter((_, i) => i !== index);
        onChange(newMeta);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === metadata.length - 1) return;

        const newMeta = [...metadata];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newMeta[index], newMeta[swapIndex]] = [newMeta[swapIndex], newMeta[index]];
        onChange(newMeta);

        if (expandedIndex === index) setExpandedIndex(swapIndex);
        else if (expandedIndex === swapIndex) setExpandedIndex(index);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Metadata (Header Properties)</label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                >
                    <Plus size={12} /> Add Metadata
                </button>
            </div>

            <div className="space-y-2">
                {metadata.map((item, index) => (
                    <div key={index} className="border border-border rounded-md bg-card overflow-hidden">
                        <div
                            className="flex items-center p-2 gap-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        >
                            <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp size={10} /></button>
                                <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === metadata.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown size={10} /></button>
                            </div>

                            <div className="p-1.5 rounded bg-background border border-border">
                                <Icon name={item.icon || 'Hash'} size={14} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{item.label}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 overflow-hidden">
                                    <span className="font-mono bg-muted px-1 rounded flex-shrink-0">{item.key}</span>
                                    <span className="flex-shrink-0">{item.type}</span>
                                    {item.description && (
                                        <span className="truncate italic opacity-60 ml-1">
                                            — {item.description}
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
                                            value={item.label}
                                            onChange={(e) => handleUpdate(index, { ...item, label: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Key (Frontmatter)</label>
                                        <input
                                            value={item.key}
                                            onChange={(e) => handleUpdate(index, { ...item, key: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Type</label>
                                        <select
                                            value={item.type}
                                            onChange={(e) => handleUpdate(index, { ...item, type: e.target.value as any })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        >
                                            <option value="text">Text</option>
                                            <option value="date">Date</option>
                                            <option value="url">URL</option>
                                            <option value="tags">Tags</option>
                                            <option value="select">Select</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Icon</label>
                                        <div className="relative">
                                            <select
                                                value={item.icon || 'Hash'}
                                                onChange={(e) => handleUpdate(index, { ...item, icon: e.target.value })}
                                                className="w-full h-8 pl-8 pr-2 text-sm bg-background border border-input rounded appearance-none"
                                            >
                                                {LUCIDE_ICON_NAMES.map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                <Icon name={item.icon || 'Hash'} size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Description (AI Hint)</label>
                                    <input
                                        value={item.description || ''}
                                        onChange={(e) => handleUpdate(index, { ...item, description: e.target.value })}
                                        className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        placeholder="Internal description used as hint for AI..."
                                    />
                                </div>

                                {item.type === 'select' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Options (comma separated label:value)</label>
                                        <input
                                            placeholder="Draft:draft, Published:published"
                                            value={item.options?.map(o => `${o.label}:${o.value}`).join(', ') || ''}
                                            onChange={(e) => {
                                                const opts = e.target.value.split(',').map(s => {
                                                    const [l, v] = s.split(':').map(part => part.trim());
                                                    return { label: l, value: v || l };
                                                }).filter(o => o.label);
                                                handleUpdate(index, { ...item, options: opts });
                                            }}
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
