import React, { useState } from 'react';
import { useTagCategories, TagCategory } from '../../context/TagCategoryContext';
import { Icon } from '../IconRegistry';
import { TagPicker } from '../TagPicker';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

export const TagCategorySettings = () => {
    const { categories, addCategory, updateCategory, removeCategory, addTagToCategory, removeTagFromCategory } = useTagCategories();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            addCategory(newCategoryName.trim(), selectedColor);
            setNewCategoryName('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 p-4 border border-dashed border-border rounded-lg bg-muted/20">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Icon name="Plus" size={16} />
                    Create New Category
                </h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px] space-y-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category Name</label>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Project, Language, Status..."
                            className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Color</label>
                        <div className="flex flex-wrap gap-1.5 p-1 bg-background border border-border rounded items-center">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={cn(
                                        "w-5 h-5 rounded-full transition-transform hover:scale-110",
                                        selectedColor === color && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95 shadow-sm h-[38px]"
                    >
                        Add Category
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {categories.map((category) => (
                    <div key={category.id} className="group flex flex-col gap-3 p-4 border border-border rounded-xl bg-muted/10 hover:bg-muted/20 transition-all border-l-4" style={{ borderLeftColor: category.color }}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={category.name}
                                    onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                                    className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none w-auto"
                                />
                                <div className="flex gap-1">
                                    {PRESET_COLORS.slice(0, 8).map(color => (
                                        <button
                                            key={color}
                                            onClick={() => updateCategory(category.id, { color })}
                                            className={cn(
                                                "w-3 h-3 rounded-full transition-transform hover:scale-125",
                                                category.color === color && "ring-1 ring-primary ring-offset-1 ring-offset-background"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => removeCategory(category.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-destructive/10"
                                title="Delete Category"
                            >
                                <Icon name="Trash2" size={14} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
                            {category.tags.map(tag => (
                                <div
                                    key={tag}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm transition-all hover:scale-105"
                                    style={{ backgroundColor: category.color }}
                                >
                                    <span>{tag}</span>
                                    <button
                                        onClick={() => removeTagFromCategory(category.id, tag)}
                                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                    >
                                        <Icon name="X" size={10} />
                                    </button>
                                </div>
                            ))}
                            <TagPicker
                                selectedTags={category.tags}
                                onAdd={(tag) => addTagToCategory(category.id, tag)}
                                label="Add Tag"
                                placeholder="Group an existing tag..."
                            />
                        </div>
                    </div>
                ))}

                {categories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/5">
                        <Icon name="Tag" size={32} className="mb-3 opacity-20" />
                        <p className="text-sm">No tag categories created yet.</p>
                        <p className="text-xs">Create a category above to start grouping your tags.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
