import React, { useState } from 'react';
import { type SectionConfig } from '@citadel-app/core';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@citadel-app/ui';
import { Icon } from '@citadel-app/ui';
import { SearchableIconPicker } from '@citadel-app/ui';
import { appModuleRegistry } from '../../../host-services';

interface SectionListEditorProps {
    sections: SectionConfig[];
    onChange: (sections: SectionConfig[]) => void;
}

export const SectionListEditor = ({ sections, onChange }: SectionListEditorProps) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleAdd = () => {
        const newSection: SectionConfig = {
            title: 'New Section',
            icon: 'FileText'
        };
        onChange([...sections, newSection]);
        setExpandedIndex(sections.length);
    };

    const handleUpdate = (index: number, updated: SectionConfig) => {
        const newSections = [...sections];
        newSections[index] = updated;
        onChange(newSections);
    };

    const handleDelete = (index: number) => {
        const newSections = sections.filter((_, i) => i !== index);
        onChange(newSections);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sections.length - 1) return;

        const newSections = [...sections];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
        onChange(newSections);

        if (expandedIndex === index) setExpandedIndex(swapIndex);
        else if (expandedIndex === swapIndex) setExpandedIndex(index);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Sections (Structure)</label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                >
                    <Plus size={12} /> Add Section
                </button>
            </div>

            <div className="space-y-2">
                {sections.map((section, index) => (
                    <div key={index} className="border border-border rounded-md bg-card overflow-hidden">
                        <div
                            className="flex items-center p-2 gap-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        >
                            <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp size={10} /></button>
                                <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === sections.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown size={10} /></button>
                            </div>

                            <div className="p-1.5 rounded bg-background border border-border">
                                <Icon name={section.icon || 'FileText'} size={14} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{section.title}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 overflow-hidden">
                                    <span className="flex-shrink-0">{section.editorType || 'markdown'}</span>
                                    {section.isHiddenInNotebooks && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                                            Hidden in Notebooks
                                        </span>
                                    )}
                                    {section.description && (
                                        <span className="truncate italic opacity-60 ml-1">
                                            — {section.description}
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
                                        <label className="text-xs font-medium">Title</label>
                                        <input
                                            value={section.title}
                                            onChange={(e) => handleUpdate(index, { ...section, title: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Editor Type</label>
                                        <select
                                            value={section.editorType || 'markdown'}
                                            onChange={(e) => handleUpdate(index, { ...section, editorType: e.target.value as any })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                        >
                                            <option value="markdown">Markdown</option>
                                            <option value="list">List</option>
                                            {appModuleRegistry.getSectionEditorTypes().map(type => (
                                                <option key={type} value={type}>
                                                    {type.charAt(0).toUpperCase() + type.slice(1)} Editor
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Description</label>
                                        <input
                                            value={section.description || ''}
                                            onChange={(e) => handleUpdate(index, { ...section, description: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background"
                                            placeholder="AI/UI hint..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Icon</label>
                                        <SearchableIconPicker
                                            value={section.icon || 'FileText'}
                                            onChange={(iconName) => handleUpdate(index, { ...section, icon: iconName })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Placeholder (Template)</label>
                                    <textarea
                                        value={section.placeholder || ''}
                                        onChange={(e) => handleUpdate(index, { ...section, placeholder: e.target.value })}
                                        className="w-full h-24 px-2 py-2 text-sm border rounded bg-background resize-y font-mono"
                                        placeholder="# Section Title..."
                                    />
                                </div>

                                <div className="pt-2 border-t border-border/50">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={section.isHiddenInNotebooks || false}
                                                onChange={(e) => handleUpdate(index, { ...section, isHiddenInNotebooks: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <div className={cn(
                                                "w-8 h-4 rounded-full transition-colors",
                                                section.isHiddenInNotebooks ? "bg-primary" : "bg-muted border border-input"
                                            )} />
                                            <div className={cn(
                                                "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm",
                                                section.isHiddenInNotebooks ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-semibold block transition-colors group-hover:text-primary">Hide in Notebooks (Blur by Default)</span>
                                            <p className="text-[10px] text-muted-foreground italic">Content will be blurred in notebook view until clicked. Great for flashcards or spoilers.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div >
    );
};
