import { useState } from 'react';
import { type ModuleRequirement } from '@citadel-app/core';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '../../../index';

interface RequirementListEditorProps {
    requirements: ModuleRequirement[];
    onChange: (requirements: ModuleRequirement[]) => void;
}

export const RequirementListEditor = ({ requirements, onChange }: RequirementListEditorProps) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleAdd = () => {
        const newReq: ModuleRequirement = {
            key: `req_${Date.now()}`,
            label: 'New Requirement',
            types: ['string'],
            description: ''
        };
        onChange([...requirements, newReq]);
        setExpandedIndex(requirements.length);
    };

    const handleUpdate = (index: number, updated: ModuleRequirement) => {
        const newReqs = [...requirements];
        newReqs[index] = updated;
        onChange(newReqs);
    };

    const handleDelete = (index: number) => {
        const newReqs = requirements.filter((_, i) => i !== index);
        onChange(newReqs);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Module Requirements</label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                >
                    <Plus size={12} /> Add Requirement
                </button>
            </div>

            <div className="space-y-2">
                {requirements.map((req, index) => (
                    <div key={index} className="border border-border rounded-md bg-card overflow-hidden">
                        <div
                            className="flex items-center p-2 gap-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{req.label}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 overflow-hidden">
                                    <span className="font-mono bg-muted px-1 rounded flex-shrink-0">{req.key}</span>
                                    <span className="flex-shrink-0">{req.types.join(', ')}</span>
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
                                            value={req.label}
                                            onChange={(e) => handleUpdate(index, { ...req, label: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Key</label>
                                        <input
                                            value={req.key}
                                            onChange={(e) => handleUpdate(index, { ...req, key: e.target.value })}
                                            className="w-full h-8 px-2 text-sm border rounded bg-background font-mono focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Types (comma separated)</label>
                                    <input
                                        value={req.types.join(', ')}
                                        onChange={(e) => handleUpdate(index, { ...req, types: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        placeholder="file, url, string..."
                                        className="w-full h-8 px-2 text-sm border rounded bg-background focus:border-primary outline-none"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Standard types: file, url, string, number, tags, any</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Description</label>
                                    <input
                                        value={req.description || ''}
                                        onChange={(e) => handleUpdate(index, { ...req, description: e.target.value })}
                                        className="w-full h-8 px-2 text-sm border rounded bg-background focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
