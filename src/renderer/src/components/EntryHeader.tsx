import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type CodexEntry, db } from '../lib/db';
import { dataManager } from '../lib/data-manager';
import { useRSS } from '../context/RSSContext';
import { Icon, DynamicIcon } from './IconRegistry';
import { ConfirmDialog } from './ConfirmDialog';
import { EntryFieldConfig } from '../config/entry-types';
import { useConfig } from '../context/ConfigContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { cn } from '../lib/utils';
import { SmartActionsMenu, IndexStatusBadge } from '../ai';
import { TagPicker } from './TagPicker';
import { useTagCategories, TagCategory } from '../context/TagCategoryContext';
import { useMemo } from 'react';

interface EntryHeaderProps {
    entry: CodexEntry;
    content?: string;
    highlights?: any[];
    onDeleteHighlight?: (id: string) => void;
    onHighlightClick?: (id: string) => void;
    onDeleteEntry?: () => void;
    onMetadataUpdate?: (updates: Record<string, any>) => void;
    onAddSection?: (title: string, content: string) => void;
    onReplaceContent?: (newContent: string) => void;
    sections?: any[];
    showTOC?: boolean;
    onToggleTOC?: () => void;
}

export const EntryHeader = ({
    entry,
    content,
    highlights,
    onDeleteHighlight,
    onHighlightClick,
    onDeleteEntry,
    onMetadataUpdate,
    onAddSection,
    onReplaceContent,
    sections,
    showTOC,
    onToggleTOC
}: EntryHeaderProps) => {
    const navigate = useNavigate();
    const { linkEntryToItem } = useRSS();
    const { getEntryTypeConfig } = useConfig();
    const { settings } = useAppSettings();
    const { getCategoryForTag } = useTagCategories();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
    const [showMetadata, setShowMetadata] = useState(false);
    const config = getEntryTypeConfig(entry.type);

    // AI is enabled if global setting is true AND per-type setting is not false
    const aiEnabled = settings.ai?.enabled !== false && config?.aiFeaturesEnabled !== false;

    const handleAddLink = async (link: { id: string; type: string; title: string, url?: string }, extra?: any) => {
        // 1. Update Current Entry
        const currentLinks = entry.relatedLinks || [];
        // Avoid duplicates
        if (currentLinks.some(l => l.id === link.id)) return;

        const newLinks = [...currentLinks, link];
        onMetadataUpdate?.({ relatedLinks: newLinks });

        // 2. Bidirectional Update
        if (link.type === 'rss-item') {
            if (extra?.feedId) {
                linkEntryToItem(extra.feedId, link.id, {
                    id: entry.id,
                    type: entry.type,
                    title: entry.title
                });
            }
        } else {
            // It's a Codex Entry. Update IT to point to US.
            try {
                const targetEntry = await db.entries.get(link.id);
                if (targetEntry) {
                    const targetLinks = targetEntry.relatedLinks || [];
                    if (!targetLinks.some(l => l.id === entry.id)) {
                        await dataManager.updateMetadata(link.id, {
                            relatedLinks: [...targetLinks, {
                                id: entry.id,
                                type: entry.type,
                                title: entry.title
                            }]
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to update target entry for bidirectional link", e);
            }
        }
    };


    return (
        <div className="mb-8 pb-6 border-border">
            <div className="flex items-start justify-between">
                <div className="w-full">
                    {/* Top Row: Type Badge + Date + Delete */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-primary/10 text-primary",
                                config?.accentBg && config?.accentColor ? `${config.accentBg} ${config.accentColor}` : ""
                            )}>
                                {config?.label || entry.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Last updated: {new Date(entry.updatedAt).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Index Status Badge */}
                            {aiEnabled && (
                                <IndexStatusBadge entry={entry} />
                            )}

                            {/* Smart Actions */}
                            {onMetadataUpdate && aiEnabled && (
                                <SmartActionsMenu
                                    entry={entry}
                                    content={content || ""}
                                    onMetadataPatch={(patch) => {
                                        onMetadataUpdate(patch);
                                    }}
                                    onAddSummarySection={(summary) => onAddSection?.("Summary", summary)}
                                    onReplaceContent={onReplaceContent}
                                />
                            )}

                            <button
                                onClick={() => {
                                    const pending = localStorage.getItem('codex-pending-chat-context');
                                    let ids: string[] = [];
                                    if (pending) {
                                        try { ids = JSON.parse(pending); } catch (e) { }
                                    }
                                    if (!ids.includes(entry.id)) {
                                        ids.push(entry.id);
                                        localStorage.setItem('codex-pending-chat-context', JSON.stringify(ids));
                                    }
                                    navigate('/');
                                }}
                                className="text-muted-foreground hover:text-primary transition-colors p-1"
                                title="Add to Chat Context"
                            >
                                <Icon name="MessageSquare" size={16} />
                            </button>

                            {onDeleteEntry && (
                                <button
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                    title="Delete Entry"
                                >
                                    <Icon name="Trash" size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Editable Title + Metadata Toggle */}
                    <div className="mb-4 group flex items-end justify-between gap-4">
                        <EditableTitle
                            value={entry.title}
                            onUpdate={(newTitle) => onMetadataUpdate?.({ title: newTitle })}
                        />
                        <div className="flex items-center gap-2">
                            {onToggleTOC && sections && sections.length > 0 && (
                                <button
                                    onClick={onToggleTOC}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border",
                                        showTOC
                                            ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon name={showTOC ? "ListX" : "List"} size={14} />
                                    {showTOC ? "Hide TOC" : "Show TOC"}
                                </button>
                            )}
                            <button
                                onClick={() => setShowMetadata(!showMetadata)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border",
                                    showMetadata
                                        ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon name={showMetadata ? "EyeOff" : "Eye"} size={14} />
                                {showMetadata ? "Hide Meta" : "Show Meta"}
                            </button>
                        </div>
                    </div>

                    {showMetadata && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                            {/* Unified Tags & Metadata Area */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {/* 1. Metadata Fields */}
                                {config?.metadata.map((field) => {
                                    const value = entry[field.key] || entry.frontmatter?.[field.key];

                                    if (field.type === 'tags') {
                                        return (
                                            <div key={field.key} className="flex flex-wrap gap-2 items-center">
                                                {Array.isArray(value) && value.map((tag, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            const searchValue = tag.includes(' ') ? `"${tag}"` : tag;
                                                            navigate(`/browser?q=${encodeURIComponent(field.key + ':' + searchValue)}`);
                                                        }}
                                                        className="group flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary rounded-full text-xs font-medium border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-colors cursor-pointer"
                                                    >
                                                        <DynamicIcon name={tag} size={12} className="shrink-0" />
                                                        <span className="hover:underline decoration-primary/30 underline-offset-2">{tag}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newValues = value.filter(v => v !== tag);
                                                                onMetadataUpdate?.({ [field.key]: newValues });
                                                            }}
                                                            className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                                            title={`Remove ${tag}`}
                                                        >
                                                            <Icon name="X" size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <TagPicker
                                                    selectedTags={Array.isArray(value) ? value : []}
                                                    onAdd={(newTag) => {
                                                        const current = Array.isArray(value) ? value : [];
                                                        if (!current.includes(newTag)) {
                                                            onMetadataUpdate?.({ [field.key]: [...current, newTag] });
                                                        }
                                                    }}
                                                    placeholder={`New ${field.label.toLowerCase()}...`}
                                                    label={`Add ${field.label}`}
                                                />
                                            </div>
                                        );
                                    }

                                    return (
                                        <MetadataBadge
                                            key={field.key}
                                            field={field as any}
                                            value={value}
                                            onUpdate={(val) => onMetadataUpdate?.({ [field.key]: val })}
                                        />
                                    );
                                })}

                                {/* 2. Generic Tags */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {(entry.tags || []).map(tag => {
                                        const cat = getCategoryForTag(tag);
                                        return (
                                            <div
                                                key={tag}
                                                onClick={() => {
                                                    const searchValue = tag.includes(' ') ? `"${tag}"` : tag;
                                                    navigate(`/browser?q=${encodeURIComponent('#' + searchValue)}`);
                                                }}
                                                className={cn(
                                                    "group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer",
                                                    cat
                                                        ? "text-white shadow-sm hover:scale-105 border-transparent"
                                                        : "bg-muted text-muted-foreground border-transparent hover:border-border hover:bg-muted/80"
                                                )}
                                                style={cat ? { backgroundColor: cat.color } : {}}
                                            >
                                                <Icon name="Tag" size={12} />
                                                <span className="hover:underline underline-offset-2">{tag}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newTags = entry.tags?.filter(t => t !== tag) || [];
                                                        onMetadataUpdate?.({ tags: newTags });
                                                    }}
                                                    className={cn(
                                                        "ml-1 opacity-0 group-hover:opacity-100 transition-opacity",
                                                        cat ? "hover:bg-white/20 rounded-full p-0.5" : "hover:text-destructive"
                                                    )}
                                                    title="Remove Tag"
                                                >
                                                    <Icon name="X" size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    <TagPicker
                                        selectedTags={entry.tags || []}
                                        onAdd={(tag) => {
                                            const newTags = [...(entry.tags || []), tag];
                                            onMetadataUpdate?.({ tags: newTags });
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Related Links */}
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Icon name="Link" size={12} />
                                    Related Links
                                    <button
                                        onClick={() => setShowAddLinkDialog(true)}
                                        className="ml-2 hover:bg-muted rounded p-0.5 text-muted-foreground hover:text-primary transition-colors"
                                        title="Add Link"
                                    >
                                        <Icon name="Plus" size={12} />
                                    </button>
                                </h4>
                                {entry.relatedLinks && entry.relatedLinks.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {entry.relatedLinks.map((link, i) => {
                                            const isRss = link.type === 'rss-item';
                                            const isInternal = ['problem', 'design', 'paper', 'rfc', 'blog', 'standard'].includes(link.type || '');
                                            const linkConfig = isInternal ? getEntryTypeConfig(link.type) : null;

                                            // Default styling for generic/external links
                                            let badgeStyle = "bg-primary/10 text-primary";
                                            let badgeIcon = "Link";


                                            if (isRss) {
                                                badgeStyle = "bg-orange-500/10 text-orange-600";
                                                badgeIcon = "Rss"; // Assuming Rss icon exists, otherwise Wifi or Radio
                                            } else if (isInternal && linkConfig) {
                                                // Use config driven styling
                                                badgeStyle = linkConfig.accentBg && linkConfig.accentColor
                                                    ? `${linkConfig.accentBg} ${linkConfig.accentColor}`
                                                    : "bg-blue-500/10 text-blue-600";
                                                badgeIcon = linkConfig.icon || "FileText";
                                            }

                                            return (
                                                <div
                                                    key={`${link.id}-${i}`}
                                                    className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 border border-border rounded-md text-sm hover:bg-muted transition-colors group"
                                                >
                                                    <span className={cn(
                                                        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] uppercase font-bold",
                                                        badgeStyle
                                                    )}>
                                                        <Icon name={badgeIcon as any} size={10} />
                                                    </span>

                                                    <div
                                                        className="flex items-center"
                                                        onClick={() => {
                                                            if (isRss) {
                                                                window.location.hash = `#/rss?itemId=${link.id}`;
                                                            } else if (isInternal) {
                                                                navigate(`/${link.type}/${link.id}`);
                                                            } else if (link.url) {
                                                                window.api.app.openExternal(link.url);
                                                            }
                                                        }}
                                                    >
                                                        <span
                                                            className="font-medium hover:underline truncate max-w-[200px] cursor-pointer text-foreground"
                                                            title={isRss ? `Go to RSS Feed Item: ${link.title}` : `Go to: ${link.title}`}
                                                        >
                                                            {link.title || link.id} {isRss && '(Feed)'}
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Remove this link?')) {
                                                                await dataManager.removeRelatedLink(entry.id, link.id);
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-sm transition-all"
                                                        title="Remove link"
                                                    >
                                                        <Icon name="X" size={12} />
                                                    </button>

                                                    {link.url && !isInternal && (
                                                        <a
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-muted-foreground hover:text-primary transition-colors ml-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Icon name="ExternalLink" size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Table of Contents Inline */}
                    {showTOC && sections && sections.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 ease-out mb-6 p-4 bg-muted/20 border border-border rounded-lg shadow-sm">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <Icon name="List" size={14} />
                                Table of Contents
                            </h4>
                            <div className="flex flex-col gap-1.5 pl-1 border-l-2 border-primary/20">
                                {sections.map((sec, idx) => (
                                    <div
                                        key={sec.id}
                                        onClick={() => {
                                            const element = document.getElementById(`section-${sec.id}`);
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                // Optional: add a slight highlight effect to the target element
                                                element.classList.add('bg-primary/5', 'transition-colors', 'duration-500');
                                                setTimeout(() => element.classList.remove('bg-primary/5'), 1500);
                                            }
                                        }}
                                        className="group cursor-pointer py-1 px-3 -ml-[2px] border-l-2 border-transparent hover:border-primary/50 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-r-md transition-all flex items-center gap-2"
                                    >
                                        <span className="text-muted-foreground/50 text-xs tabular-nums group-hover:text-primary/70 transition-colors">{idx + 1}.</span>
                                        <span className="truncate">{sec.title || 'Untitled Section'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Highlights (kept as is) */}
                    {highlights && highlights.length > 0 && (
                        <div className="space-y-2 mb-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground mb-2">
                                <Icon name="Link" size={14} className="rotate-45" />
                                Referenced Highlights
                            </h4>
                            <div className="space-y-2">
                                {highlights.map((h, i) => (
                                    <div
                                        key={h.id || i}
                                        onClick={() => onHighlightClick && onHighlightClick(h.id)}
                                        className="group flex items-start justify-between gap-2 text-sm border-l-2 border-primary/50 pl-3 py-1 italic text-muted-foreground bg-background/50 rounded-r hover:bg-background/80 transition-colors cursor-pointer"
                                    >
                                        <div className="flex-1">
                                            {h.content?.image ? (
                                                <div className="mt-1">
                                                    <img
                                                        src={h.content.image}
                                                        alt="Highlight"
                                                        className="max-w-full h-auto rounded border border-border shadow-sm max-h-32 object-contain bg-white/5"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="line-clamp-3">{h.content?.text || 'Image Highlight'}</p>
                                            )}
                                        </div>
                                        {onDeleteHighlight && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteHighlight(h.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 text-destructive rounded"
                                            >
                                                <Icon name="X" size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title="Delete Entry"
                description={`Are you sure you want to delete "${entry.title}"? This will permanently delete the file and all its data.`}
                confirmLabel="Delete Forever"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    onDeleteEntry?.();
                }}
                variant="destructive"
            />

            <AddLinkDialog
                open={showAddLinkDialog}
                onOpenChange={setShowAddLinkDialog}
                currentEntryId={entry.id}
                onAddLink={handleAddLink}
            />
        </div>
    );
};

import { AddLinkDialog } from './AddLinkDialog';


// --- Helper Component for Individual Metadata ---

interface MetadataBadgeProps {
    field: EntryFieldConfig;
    value: any;
    onUpdate: (value: any) => void;
}

const MetadataBadge = ({ field, value, onUpdate }: MetadataBadgeProps) => {
    const [isEditing, setIsEditing] = useState(false);

    // For tags, we edit a comma-separated string, but store an array
    const getInitialTempValue = () => {
        if (field.type === 'tags') {
            return Array.isArray(value) ? value.join(', ') : (value || '');
        }
        return value || '';
    };

    const [tempValue, setTempValue] = useState(getInitialTempValue());
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTempValue(getInitialTempValue());
    }, [value, isEditing]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (isEditing) {
                    setIsEditing(false);
                    setTempValue(getInitialTempValue()); // Reset on cancel
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, value]);

    const handleSave = () => {
        let finalValue: any = tempValue;

        if (field.type === 'tags') {
            finalValue = tempValue
                .split(',')
                .map((t: string) => t.trim())
                .filter((t: string) => t.length > 0);
        }

        onUpdate(finalValue);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setTempValue(getInitialTempValue());
        }
    };

    const handleMetadataSubmit = () => {
        handleSave();
    };

    // If Editing
    if (isEditing) {
        return (
            <div ref={containerRef} className="flex items-center gap-1 bg-background border border-primary rounded-md px-1 py-0.5 shadow-sm">
                {field.type === 'select' ? (
                    <select
                        ref={inputRef as any}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleSave}
                        className="text-xs bg-background dark:bg-zinc-900 text-foreground border-none focus:outline-none py-1 pr-6 cursor-pointer rounded"
                    >
                        <option value="" className="bg-background dark:bg-zinc-900">Select...</option>
                        {field.options?.map(opt => (
                            <option
                                key={opt.value}
                                value={opt.value}
                                className="bg-background dark:bg-zinc-900 text-foreground"
                            >
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : field.type === 'tags' ? (
                    <div className="flex flex-wrap gap-1 p-1 min-w-[200px]">
                        {tempValue.split(',').filter(Boolean).map(tag => (
                            <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-[10px]">
                                {tag}
                                <button onClick={() => setTempValue(prev => prev.split(',').filter(t => t !== tag).join(','))} className="hover:text-destructive">
                                    <Icon name="X" size={8} />
                                </button>
                            </div>
                        ))}
                        <TagPicker
                            selectedTags={tempValue.split(',').filter(Boolean)}
                            onAdd={(tag) => setTempValue(prev => prev ? `${prev},${tag}` : tag)}
                            placeholder="Add tag..."
                            label="Add"
                        />
                    </div>
                ) : (
                    <input
                        ref={inputRef as any}
                        type={field.type === 'url' ? 'url' : 'text'}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="text-xs bg-transparent border-none focus:outline-none min-w-[100px] py-1"
                        placeholder={field.label}
                    />
                )}
            </div>
        );
    }

    // Read Mode
    const isEmpty = !value || (Array.isArray(value) && value.length === 0);

    return (
        <div
            ref={containerRef}
            onClick={() => setIsEditing(true)}
            className={cn(
                "group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all select-none",
                isEmpty
                    ? "bg-muted/30 text-muted-foreground/70 border-dashed border-border hover:bg-muted hover:text-muted-foreground"
                    : "bg-primary/5 text-foreground border-primary/20 hover:bg-primary/10 hover:border-primary/40"
            )}
            title={`Edit ${field.label}`}
        >
            {field.icon && <Icon name={field.icon} size={12} className={cn("opacity-70", isEmpty && "opacity-50")} />}

            <span className={cn("opacity-70 font-normal mr-0.5")}>{field.label}:</span>

            <span className="font-semibold truncate max-w-[200px]">
                {field.type === 'select'
                    ? field.options?.find(o => o.value === value)?.label || value || 'Empty'
                    : value || 'Empty'
                }
            </span>

            {field.type === 'url' && value && (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-1 text-primary hover:underline"
                    title="Open Link"
                >
                    <Icon name="ExternalLink" size={10} />
                </a>
            )}

            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground ml-1">
                <Icon name="Edit" size={10} />
            </span>
        </div>
    );
};

interface EditableTitleProps {
    value: string;
    onUpdate: (val: string) => void;
}

const EditableTitle = ({ value, onUpdate }: EditableTitleProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (tempValue.trim() && tempValue !== value) {
            onUpdate(tempValue.trim());
        } else {
            setTempValue(value); // Revert if empty or unchanged
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setTempValue(value);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-3xl font-bold tracking-tight bg-background border border-primary/50 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group flex items-center gap-3 w-fit rounded px-2 -ml-2 py-1 cursor-pointer hover:bg-muted/30 border border-transparent hover:border-border/50 transition-colors"
            title="Click to edit title"
        >
            <h1 className="text-3xl font-bold tracking-tight ">
                {value}
            </h1>
            <span className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity">
                <Icon name="Edit" size={16} />
            </span>
        </div>
    );
};
