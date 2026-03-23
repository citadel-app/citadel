import { useState, useCallback, useMemo } from 'react';
import { Dialog as Root, DialogPortal as Portal, DialogOverlay as Overlay, DialogTrigger as Trigger, DialogClose as Close, DialogContent as Content, DialogHeader as Header, DialogFooter as Footer, DialogTitle as Title, DialogDescription as Description } from '@citadel-app/ui';
const Dialog = { Root, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description };
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon } from '@citadel-app/ui';
import { type EntryTypeConfig, type EntryFieldConfig } from '@citadel-app/core';
import { useConfig } from '../context/ConfigContext';
import { db, CodexEntry } from '../lib/db';
import { dataManager } from '../lib/data-manager';
import { cn } from '@citadel-app/ui';

interface CreateEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (entry: CodexEntry) => void;
}

type Step = 'select-type' | 'fill-form';

export const CreateEntryDialog = ({ open, onOpenChange, onCreated }: CreateEntryDialogProps) => {
    const { entryTypes } = useConfig();
    const [step, setStep] = useState<Step>('select-type');
    const [selectedType, setSelectedType] = useState<EntryTypeConfig | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);

    // Fetch all unique tags/categories for suggestions
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
    const existingTags = useMemo(() => {
        const tagSet = new Set<string>();
        allEntries.forEach(e => {
            e.tags?.forEach(t => tagSet.add(t));
            // Also suggest frontmatter values for key 'tags' or 'companies' if available
            if (e.frontmatter?.companies) {
                if (Array.isArray(e.frontmatter.companies)) e.frontmatter.companies.forEach((c: any) => tagSet.add(String(c)));
            }
        });
        return Array.from(tagSet).sort();
    }, [allEntries]);

    const suggestedTags = useMemo(() => {
        if (!tagInput.trim()) return [];
        const lowInput = tagInput.toLowerCase();
        return existingTags
            .filter(t => t.toLowerCase().includes(lowInput) && !tags.includes(t))
            .slice(0, 5);
    }, [existingTags, tagInput, tags]);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const resetFilters = useCallback(() => {
        setSearchTerm('');
        setSelectedCategory('All');
    }, []);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        let hasMissingCategory = false;
        Object.values(entryTypes).forEach(t => {
            if (t.category) {
                cats.add(t.category);
            } else {
                hasMissingCategory = true;
            }
        });

        // Hide sidebar if there are no explicit categories defined in the config
        if (cats.size === 0) return [];

        const sortedCats = Array.from(cats).sort();
        if (hasMissingCategory) {
            return ['All', ...sortedCats, 'Uncategorized'];
        }
        return ['All', ...sortedCats];
    }, [entryTypes]);

    const filteredTypes = useMemo(() => {
        return Object.values(entryTypes).filter(t => {
            const matchesSearch = t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase());

            if (categories.length === 0) return matchesSearch;

            let matchesCategory = false;
            if (selectedCategory === 'All') {
                matchesCategory = true;
            } else if (selectedCategory === 'Uncategorized') {
                matchesCategory = !t.category;
            } else {
                matchesCategory = t.category === selectedCategory;
            }

            return matchesSearch && matchesCategory;
        });
    }, [entryTypes, searchTerm, selectedCategory, categories]);

    const resetDialog = useCallback(() => {
        setStep('select-type');
        setSelectedType(null);
        setFormData({});
        setTags([]);
        setTagInput('');
        setIsSubmitting(false);
        resetFilters();
    }, [resetFilters]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetDialog();
        }
        onOpenChange(newOpen);
    };

    const handleTypeSelect = (typeConfig: EntryTypeConfig) => {
        setSelectedType(typeConfig);
        setStep('fill-form');
    };

    const handleBack = () => {
        setStep('select-type');
        setFormData({});
        setTags([]); // Clear tags too? Yes.
    };

    const handleFieldChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleAddTag = (tagToUse?: string) => {
        const val = tagToUse || tagInput;
        const trimmed = val.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
            setTagInput('');
            setSuggestionIndex(-1);
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestionIndex >= 0 && suggestedTags[suggestionIndex]) {
                handleAddTag(suggestedTags[suggestionIndex]);
            } else {
                handleAddTag();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionIndex(prev => Math.min(prev + 1, suggestedTags.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Escape') {
            setSuggestionIndex(-1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Title is assumed to be present in fields with key 'title'
        // But we store it in formData['title']
        if (!selectedType || !formData.title?.trim()) return;

        setIsSubmitting(true);
        try {
            // Prepare frontmatter: exclude title, exclude file objects, include tags
            // Actually title is top-level in CodexEntry.
            const title = formData.title.trim();
            const { title: _, ...otherData } = formData;

            // Handle file object logic: separate it
            // Look for fields with type 'file'
            const fileFields = selectedType.fields.filter(f => f.type === 'file');
            const fileUploads: Record<string, File> = {};

            // Filter out file objects from frontmatter
            const cleanFrontmatter = { ...otherData, tags };

            for (const f of fileFields) {
                const fileKey = `${f.key}_file`; // We use separate key for file object in state
                if (formData[fileKey]) {
                    fileUploads[f.key] = formData[fileKey];
                    delete cleanFrontmatter[fileKey]; // Should not be in frontmatter
                }
            }

            // Create entry
            const entry = await dataManager.createEntry({
                title: title,
                type: selectedType.type,
                tags,
                frontmatter: cleanFrontmatter
            });

            // Process file uploads
            for (const [key, file] of Object.entries(fileUploads)) {
                try {
                    const relativePath = await dataManager.saveAsset(entry.id, file);
                    // Update entry frontmatter with the path
                    await dataManager.updateEntry(entry.id, {
                        frontmatter: {
                            ...entry.frontmatter,
                            [key]: relativePath // e.g. pdfPath: 'assets/...'
                        }
                    });
                } catch (assetError) {
                    console.error(`Failed to save asset for field ${key}:`, assetError);
                    // We don't throw here to allow the dialog to close and the entry to exist 
                    // (even if the asset link is missing)
                }
            }

            handleOpenChange(false);
            onCreated?.(entry);
        } catch (error) {
            console.error('Failed to create entry:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (field: EntryFieldConfig) => {
        const value = formData[field.key] || '';
        const key = String(field.key);

        switch (field.type) {
            case 'text':
            case 'url':
                return (
                    <input
                        type={field.type}
                        value={value}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        onPaste={(e) => {
                            if (field.type === 'url') {
                                const html = e.clipboardData.getData('text/html');
                                if (html) {
                                    // Extract anchor text
                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(html, 'text/html');
                                    const anchor = doc.querySelector('a');
                                    if (anchor && anchor.textContent) {
                                        const text = anchor.textContent.trim();
                                        // Auto-fill title if empty
                                        if (text && (!formData['title'] || formData['title'].trim() === '')) {
                                            handleFieldChange('title', text);
                                        }
                                    }
                                }
                            }
                        }}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        rows={3}
                        className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                    />
                );

            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    >
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            case 'file':
                return (
                    <div className="relative">
                        <input
                            type="file"
                            accept={field.accept}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    handleFieldChange(`${key}_file`, file); // Store file object
                                    handleFieldChange(key, file.name); // Store name as text value

                                    // Auto-fill title if empty
                                    if (!formData['title'] || formData['title'].trim() === '') {
                                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                        handleFieldChange('title', nameWithoutExt);
                                    }
                                }
                            }}
                            className="hidden"
                            id={`file-${key}`}
                        />
                        <label
                            htmlFor={`file-${key}`}
                            className="flex items-center gap-2 w-full p-2.5 rounded-md border border-dashed border-input bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                            <Icon name="Upload" size={16} className="text-muted-foreground" />
                            <span className="text-sm text-foreground/80">
                                {formData[`${key}_file`] ? formData[`${key}_file`].name : (field.placeholder || "Choose file...")}
                            </span>
                        </label>
                    </div>
                );

            case 'tags':
                return (
                    <div className="space-y-3">
                        <div className="flex bg-background border border-input rounded-md focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => {
                                        setTagInput(e.target.value);
                                        setSuggestionIndex(-1);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={field.placeholder || "Type and press Enter..."}
                                    className="w-full p-2.5 bg-transparent border-none outline-none min-w-[120px]"
                                />
                                {suggestedTags.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border shadow-xl rounded-lg z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {suggestedTags.map((tag, idx) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => handleAddTag(tag)}
                                                onMouseEnter={() => setSuggestionIndex(idx)}
                                                className={cn(
                                                    "w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2",
                                                    suggestionIndex === idx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                                )}
                                            >
                                                <Icon name="Tag" size={14} className="opacity-50" />
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleAddTag()}
                                className="px-3 text-primary hover:text-primary/80 transition-colors"
                            >
                                <Icon name="Plus" size={20} />
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:bg-primary/20 rounded-full p-0.5 ml-1"
                                        >
                                            <Icon name="X" size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 top-[var(--titlebar-height,0px)] bg-background/80 backdrop-blur-sm z-50 transition-all duration-200" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-border shadow-2xl rounded-xl z-50 flex flex-col max-h-[85vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                            {step === 'select-type' ? 'Compose New Scroll' : `New ${selectedType?.label}`}
                        </Dialog.Title>
                        <Dialog.Close className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                            <Icon name="X" size={20} />
                        </Dialog.Close>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {step === 'select-type' ? (
                            <div className="flex flex-col h-full space-y-4">
                                {/* Search Header */}
                                <div className="relative">
                                    <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search scroll types..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/60"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                        >
                                            <Icon name="X" size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-1 gap-6 min-h-0">
                                    {/* Sidebar Categories */}
                                    {categories.length > 0 && (
                                        <div className="w-40 shrink-0 flex flex-col gap-1 overflow-y-auto pr-2 border-r border-border/50">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 ml-2">Categories</span>
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={cn(
                                                        "px-3 py-2 text-sm text-left rounded-md transition-all font-medium",
                                                        selectedCategory === cat
                                                            ? "bg-primary text-primary-foreground shadow-sm"
                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Grid Content */}
                                    <div className="flex-1 overflow-y-auto pr-1">
                                        {filteredTypes.length > 0 ? (
                                            <div className={cn(
                                                "grid gap-3 pt-2 pb-2",
                                                categories.length > 0 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                            )}>
                                                {filteredTypes.map((type) => (
                                                    <button
                                                        key={type.type}
                                                        onClick={() => handleTypeSelect(type)}
                                                        className={cn(
                                                            "flex items-start gap-3 p-3 rounded-lg border border-border transition-all text-left group bg-muted/5 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                                                            "hover:border-" + type.accentColor.replace("text-", "") + "/50",
                                                            type.accentColor
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "shrink-0 p-2.5 rounded-lg bg-background border border-border transition-colors",
                                                            "group-hover:border-" + type.accentColor.replace("text-", "") + "/30",
                                                            type.accentColor,
                                                        )}>
                                                            <Icon name={type.icon} size={20} />
                                                        </div>
                                                        <div className="min-w-0 space-y-0.5">
                                                            <div className="font-semibold text-sm text-foreground truncate">{type.label}</div>
                                                            <div className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{type.description}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-12 border-2 border-dashed border-border rounded-xl">
                                                <Icon name="SearchX" size={32} className="mb-2 opacity-20" />
                                                No scroll types found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5 pb-24">
                                {selectedType?.fields.map((field) => (
                                    <div key={String(field.key)} className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground/90">
                                            {field.label} {(field as any).required && <span className="text-red-500">*</span>}
                                        </label>
                                        {field.description && <p className="text-xs text-muted-foreground mb-1">{field.description}</p>}
                                        {renderField(field)}
                                    </div>
                                ))}

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Icon name="Loader2" size={16} className="animate-spin" />
                                                Composing...
                                            </>
                                        ) : (
                                            'Compose Scroll'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
