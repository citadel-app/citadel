import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { dataManager } from '../lib/data-manager';
import { Icon, DynamicIcon } from '../components/IconRegistry';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useConfig } from '@renderer/context/ConfigContext';
import { useAppSettings } from '@renderer/context/AppSettingsContext';
import { evaluateQuery, QueryParser } from '@renderer/search';
import { useTagCategories, TagCategory } from '@renderer/context/TagCategoryContext';

interface TagStats {
    name: string;
    total: number;
    byType: Record<string, number>;
    byField: Record<string, number>;
    icon: string;
}

export const TagManagerPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { getEntryTypeConfig, entryTypes } = useConfig();
    const { getCategoryForTag } = useTagCategories();
    const [searchQuery, setSearchQuery] = useState('');

    // Derived Selection State from URL
    const selectedTagName = searchParams.get('q');

    const [viewMode, setViewMode] = useState<'cloud' | 'list'>('cloud');

    // Batch Action States
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
    const [isMassUpdateDialogOpen, setIsMassUpdateDialogOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [splitNames, setSplitNames] = useState('');
    const [filterQuery, setFilterQuery] = useState('');
    const [massTargetField, setMassTargetField] = useState<string>('tags');
    const [tagToAdd, setTagToAdd] = useState('');
    const [tagToRemove, setTagToRemove] = useState('');

    // Co-occurrence Analysis State
    const [coOccurrenceStats, setCoOccurrenceStats] = useState<{ name: string; count: number; icon: string }[] | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const allEntries = useLiveQuery(() => db.entries.toArray()) || [];

    // Metadata Fields Discovery Restricted to 'tags' and 'select' types
    const availableFields = useMemo(() => {
        const fields = new Set(['tags']);

        Object.values(entryTypes).forEach(typeConfig => {
            typeConfig.metadata?.forEach(m => {
                if (m.type === 'tags' || m.type === 'select') fields.add(m.key);
            });
            typeConfig.fields?.forEach(f => {
                if (f.type === 'tags' || f.type === 'select') fields.add(String(f.key));
            });
        });

        return Array.from(fields).sort();
    }, [entryTypes]);

    // Aggregate Field Stats (Unified)
    const tagStats = useMemo(() => {
        const stats: Record<string, Omit<TagStats, 'icon'>> = {};

        allEntries.forEach(entry => {
            availableFields.forEach(field => {
                let values: any[] = [];
                if (field === 'tags') {
                    values = entry.tags || [];
                } else {
                    const val = entry.frontmatter?.[field] || (entry as any)[field];
                    values = Array.isArray(val) ? val : (val ? [val] : []);
                }

                values.forEach(v => {
                    const valStr = String(v);
                    if (!valStr || valStr.trim() === '') return;
                    if (!stats[valStr]) {
                        stats[valStr] = { name: valStr, total: 0, byType: {}, byField: {} };
                    }
                    stats[valStr].total += 1;
                    stats[valStr].byType[entry.type] = (stats[valStr].byType[entry.type] || 0) + 1;
                    stats[valStr].byField[field] = (stats[valStr].byField[field] || 0) + 1;
                });
            });
        });

        return Object.values(stats)
            .map(s => {
                let dominantType = '';
                let maxCount = -1;
                Object.entries(s.byType).forEach(([type, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        dominantType = type;
                    }
                });
                const icon = entryTypes[dominantType]?.icon || 'Tag';
                return { ...s, icon } as TagStats;
            })
            .sort((a, b) => b.total - a.total);
    }, [allEntries, availableFields, entryTypes]);

    // Derived selectedTag
    const selectedTag = useMemo(() => {
        if (!selectedTagName) return null;
        return tagStats.find(s => s.name === selectedTagName) || null;
    }, [selectedTagName, tagStats]);

    const handleSetSelectedTag = (tag: TagStats | null) => {
        if (tag) {
            setSearchParams({ q: tag.name });
        } else {
            setSearchParams({});
        }
        setCoOccurrenceStats(null);
    };

    const filteredStats = useMemo(() => {
        if (!searchQuery) return tagStats;
        const lowQuery = searchQuery.toLowerCase();
        return tagStats.filter(s => s.name.toLowerCase().includes(lowQuery));
    }, [tagStats, searchQuery]);

    const groupedFilteredStats = useMemo(() => {
        const groups: Record<string, { category: TagCategory, stats: TagStats[] }> = {};
        const uncategorized: TagStats[] = [];

        filteredStats.forEach(stat => {
            const cat = getCategoryForTag(stat.name);
            if (cat) {
                if (!groups[cat.id]) {
                    groups[cat.id] = { category: cat, stats: [] };
                }
                groups[cat.id].stats.push(stat);
            } else {
                uncategorized.push(stat);
            }
        });

        return { groups: Object.values(groups), uncategorized };
    }, [filteredStats, getCategoryForTag]);

    // Mass Action Handlers (Global)
    const handleMerge = async () => {
        if (!selectedTag || !newName) return;

        // Apply rename across ALL fields where this tag exists
        for (const field of Object.keys(selectedTag.byField)) {
            const affectedEntryIds = allEntries
                .filter(e => {
                    const val = e.frontmatter?.[field] || (e as any)[field];
                    const values = Array.isArray(val) ? val : (val ? [val] : []);
                    return values.map(v => String(v)).includes(selectedTag.name);
                })
                .map(e => e.id);

            if (affectedEntryIds.length > 0) {
                await dataManager.batchUpdateMetadata(affectedEntryIds, {
                    type: 'rename',
                    targetField: field,
                    oldValue: selectedTag.name,
                    newValue: newName
                });
            }
        }

        setIsMergeDialogOpen(false);
        setNewName('');
        handleSetSelectedTag(null);
    };

    const handleSplit = async () => {
        if (!selectedTag || !splitNames) return;

        const tags = splitNames.split(',').map(s => s.trim()).filter(Boolean);

        for (const field of Object.keys(selectedTag.byField)) {
            const affectedEntryIds = allEntries
                .filter(e => {
                    const val = e.frontmatter?.[field] || (e as any)[field];
                    const values = Array.isArray(val) ? val : (val ? [val] : []);
                    return values.map(v => String(v)).includes(selectedTag.name);
                })
                .map(e => e.id);

            for (const id of affectedEntryIds) {
                const entry = allEntries.find(e => e.id === id);
                if (!entry) continue;

                const val = entry.frontmatter?.[field] || (entry as any)[field];
                const isArray = Array.isArray(val) || field === 'tags' || field === 'companies';

                if (isArray) {
                    const currentTags = Array.isArray(val) ? val : (val ? [val] : []);
                    const updatedTags = currentTags.map(t => String(t) === selectedTag.name ? tags : t).flat().filter(Boolean);
                    await dataManager.updateEntry(id, { [field]: Array.from(new Set(updatedTags)) });
                } else {
                    await dataManager.updateEntry(id, { [field]: tags[0] });
                }
            }
        }

        setIsSplitDialogOpen(false);
        setSplitNames('');
        handleSetSelectedTag(null);
    };

    const handleMassUpdate = async () => {
        const queryTree = new QueryParser(filterQuery).parse();
        const affectedEntries = allEntries.filter(e => {
            if (!queryTree) return false;
            return evaluateQuery(queryTree, e, getEntryTypeConfig);
        });

        const ids = affectedEntries.map(e => e.id);

        if (tagToAdd) {
            await dataManager.batchUpdateMetadata(ids, {
                type: 'add',
                targetField: massTargetField,
                value: tagToAdd
            });
        }
        if (tagToRemove) {
            await dataManager.batchUpdateMetadata(ids, {
                type: 'remove',
                targetField: massTargetField,
                value: tagToRemove
            });
        }

        setIsMassUpdateDialogOpen(false);
        setFilterQuery('');
        setTagToAdd('');
        setTagToRemove('');
    };

    const handleAnalyzeCoOccurrence = async (tag: TagStats) => {
        setIsAnalyzing(true);
        // Subtle delay for visual feedback
        await new Promise(r => setTimeout(r, 400));

        const affectedEntries = allEntries.filter(entry => {
            return Object.keys(tag.byField).some(field => {
                let val: any;
                if (field === 'tags') {
                    val = entry.tags;
                } else {
                    val = entry.frontmatter?.[field] || (entry as any)[field];
                }
                const values = Array.isArray(val) ? val : (val ? [val] : []);
                return values.map(v => String(v)).includes(tag.name);
            });
        });

        const dist: Record<string, number> = {};
        affectedEntries.forEach(entry => {
            availableFields.forEach(field => {
                let values: any[] = [];
                if (field === 'tags') {
                    values = entry.tags || [];
                } else {
                    const val = entry.frontmatter?.[field] || (entry as any)[field];
                    values = Array.isArray(val) ? val : (val ? [val] : []);
                }
                values.forEach(v => {
                    const valStr = String(v);
                    if (valStr && valStr !== tag.name) {
                        dist[valStr] = (dist[valStr] || 0) + 1;
                    }
                });
            });
        });

        const sorted = Object.entries(dist)
            .map(([name, count]) => {
                // Peek into global tagStats to get the dominant icon for this related tag
                const globalStat = tagStats.find(s => s.name === name);
                return { name, count, icon: globalStat?.icon || 'Tag' };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        setCoOccurrenceStats(sorted);
        setIsAnalyzing(false);
    };

    // Auto-analyze on selection
    useEffect(() => {
        if (selectedTag) {
            handleAnalyzeCoOccurrence(selectedTag);
        }
    }, [selectedTag?.name]);

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <header className="px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-center gap-4 justify-between border-b border-border bg-muted/10">
                <div className="text-center sm:text-left">
                    <h1 className="text-xl font-bold flex items-center justify-center sm:justify-start gap-2">
                        <Icon name="Tag" size={24} className="text-primary" />
                        Tag Manager
                    </h1>
                    <p className="text-xs text-muted-foreground">Unified metadata dashboard for categorical data.</p>
                </div>
                <div className="flex items-center gap-3 lg:gap-4 flex-wrap justify-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20 shadow-inner">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-primary">Unified Dashboard</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode(viewMode === 'cloud' ? 'list' : 'cloud')}
                            className="p-2 hover:bg-muted rounded-md transition-colors"
                            title={viewMode === 'cloud' ? 'List View' : 'Cloud View'}
                        >
                            <Icon name={viewMode === 'cloud' ? 'List' : 'Cloud'} size={18} />
                        </button>
                        <button
                            onClick={() => setIsMassUpdateDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-semibold hover:bg-secondary/90 transition-all shadow-sm"
                        >
                            <Icon name="Zap" size={16} />
                            Mass Update
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Sidebar: Stats & Filters */}
                <div className="w-full lg:w-80 border-b lg:border-r border-border bg-muted/5 flex flex-col min-h-0 shrink-0">
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search values..."
                                className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[30vh] lg:max-h-none">
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Values</p>
                            {filteredStats.slice(0, 50).map(stat => (
                                <button
                                    key={stat.name}
                                    onClick={() => handleSetSelectedTag(stat)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2 rounded-md text-sm transition-all text-left",
                                        selectedTag?.name === stat.name ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                                    )}
                                >
                                    <DynamicIcon name={stat.name} size={14} className={cn("opacity-50", selectedTag?.name === stat.name && "opacity-100")} />
                                    <span className="truncate flex-1">{stat.name}</span>
                                    <span className="text-[10px] opacity-70 font-mono font-bold leading-none py-1 px-1.5 bg-background/10 rounded tracking-tighter shrink-0">{stat.total}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden">
                    {selectedTag ? (
                        <div className="p-4 lg:p-8 max-w-5xl w-full mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
                                <div className="space-y-4 text-center lg:text-left">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Value Insight</span>
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                                            <DynamicIcon name={selectedTag.name} size={48} className="text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
                                                {selectedTag.name}
                                            </h2>
                                            <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border inline-block">{selectedTag.total} occurrences found</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 shrink-0">
                                    <button
                                        onClick={() => {
                                            const query = Object.keys(selectedTag.byField)
                                                .map(f => {
                                                    const escapedVal = selectedTag.name.includes(' ') ? `"${selectedTag.name}"` : selectedTag.name;
                                                    return f === 'tags' ? `#${escapedVal}` : `${f}:${escapedVal}`;
                                                })
                                                .join(' OR ');
                                            navigate(`/browser?q=${encodeURIComponent(query)}`);
                                        }}
                                        className="btn-primary flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95"
                                    >
                                        <Icon name="ExternalLink" size={16} />
                                        View Entries
                                    </button>
                                    <button
                                        onClick={() => { setNewName(selectedTag.name); setIsMergeDialogOpen(true); }}
                                        className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-border hover:bg-muted transition-all active:scale-95"
                                    >
                                        <Icon name="GitMerge" size={16} />
                                        Merge / Rename
                                    </button>
                                    <button
                                        onClick={() => { setSplitNames(selectedTag.name); setIsSplitDialogOpen(true); }}
                                        className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-border hover:bg-muted transition-all active:scale-95"
                                    >
                                        <Icon name="Split" size={16} />
                                        Split
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Entry Type Breakdown</h3>
                                    <div className="space-y-3">
                                        {Object.entries(selectedTag.byType).map(([type, count]) => {
                                            const config = entryTypes[type];
                                            const percent = (count / selectedTag.total) * 100;
                                            return (
                                                <div key={type} className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <Icon name={config?.icon || 'File'} size={12} className={cn(config?.accentColor || "text-muted-foreground")} />
                                                            <span className="font-semibold">{config?.label || type}</span>
                                                        </div>
                                                        <span className="font-mono text-muted-foreground">{count} entries ({percent.toFixed(0)}%)</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div className={cn("h-full transition-all duration-500", config?.accentBg || "bg-primary")} style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Field Source Distribution</h3>
                                    <div className="space-y-3">
                                        {Object.entries(selectedTag.byField).map(([field, count]) => {
                                            const fieldTotal = Object.values(selectedTag.byField).reduce((a, b) => a + b, 0);
                                            const percent = (count / fieldTotal) * 100;
                                            return (
                                                <div key={field} className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-semibold capitalize text-primary">{field}</span>
                                                        <span className="font-mono text-muted-foreground">{count} occurrences</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary/40 rounded-full" style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Related Metadata (Co-occurrences)</h3>
                                    {isAnalyzing && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary scroll-pulse">
                                            <Icon name="Loader2" size={12} className="animate-spin" />
                                            ANALYZING...
                                        </div>
                                    )}
                                </div>
                                {coOccurrenceStats ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {coOccurrenceStats.length > 0 ? (
                                            coOccurrenceStats.map(stat => (
                                                <button
                                                    key={stat.name}
                                                    onClick={() => {
                                                        const fullStat = tagStats.find(s => s.name === stat.name);
                                                        if (fullStat) {
                                                            handleSetSelectedTag(fullStat);
                                                        }
                                                    }}
                                                    className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                                                >
                                                    <div className="p-1.5 bg-background rounded-md shadow-sm group-hover:bg-primary/10 transition-colors">
                                                        <DynamicIcon name={stat.name} size={14} className="opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{stat.name}</p>
                                                        <p className="text-[10px] font-medium text-muted-foreground">{stat.count} shared entries</p>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="col-span-full text-sm text-center py-8 text-muted-foreground italic">No correlated metadata found.</p>
                                        )}
                                    </div>
                                ) : !isAnalyzing && (
                                    <div className="h-32 flex items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground text-sm italic">
                                        Analysis pending...
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/20 p-4 rounded-lg border border-border/50">
                                <Icon name="Info" size={14} className="inline-block mr-2 -mt-0.5" />
                                Changes to this value will propagate across all <span className="text-foreground font-bold">{selectedTag.total}</span> entries and affected metadata fields.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col p-6 min-h-0">
                            {viewMode === 'cloud' ? (
                                <div className="flex-1 bg-muted/5 border border-dashed border-border rounded-2xl p-8 overflow-y-auto">
                                    <div className="flex flex-col gap-12 max-w-5xl mx-auto">
                                        {/* Categorized Groups */}
                                        {groupedFilteredStats.groups.map(({ category, stats }) => (
                                            <div key={category.id} className="space-y-4 p-6 bg-muted/10 border border-border rounded-xl">
                                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                                    <span
                                                        className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-white"
                                                        style={{ backgroundColor: category.color }}
                                                    >
                                                        {category.name}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
                                                    {stats.map(stat => {
                                                        const maxTotal = tagStats[0]?.total || 1;
                                                        const size = Math.max(0.8, Math.min(2.5, 0.8 + (stat.total / maxTotal) * 1.7));
                                                        return (
                                                            <button
                                                                key={stat.name}
                                                                onClick={() => handleSetSelectedTag(stat)}
                                                                className="group flex items-center gap-2 transition-all hover:scale-110 active:scale-95 duration-200"
                                                                style={{
                                                                    fontSize: `${size}rem`,
                                                                    fontWeight: size > 1.5 ? 800 : 500,
                                                                    color: category.color
                                                                }}
                                                            >
                                                                <DynamicIcon
                                                                    name={stat.name}
                                                                    size={Math.max(14, size * 12)}
                                                                    className="opacity-40 group-hover:opacity-100 transition-opacity"
                                                                />
                                                                {stat.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Uncategorized */}
                                        <div className="space-y-4">
                                            {groupedFilteredStats.groups.length > 0 && (
                                                <div className="flex items-center gap-2 border-b border-border pb-2 opacity-50">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Uncategorized</span>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
                                                {groupedFilteredStats.uncategorized.map(stat => {
                                                    const maxTotal = tagStats[0]?.total || 1;
                                                    const size = Math.max(0.8, Math.min(2.5, 0.8 + (stat.total / maxTotal) * 1.7));
                                                    return (
                                                        <button
                                                            key={stat.name}
                                                            onClick={() => handleSetSelectedTag(stat)}
                                                            className="group flex items-center gap-2 hover:text-primary transition-all hover:scale-110 active:scale-95 duration-200"
                                                            style={{ fontSize: `${size}rem`, fontWeight: size > 1.5 ? 800 : 500 }}
                                                        >
                                                            <DynamicIcon
                                                                name={stat.name}
                                                                size={Math.max(14, size * 12)}
                                                                className="opacity-40 group-hover:opacity-100 transition-opacity"
                                                            />
                                                            {stat.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 bg-muted/5 border border-border rounded-xl overflow-hidden flex flex-col">
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-3">Value</th>
                                                    <th className="px-6 py-3">Usage</th>
                                                    <th className="px-6 py-3">Primary Fields</th>
                                                    <th className="px-6 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStats.map(stat => (
                                                    <tr key={stat.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                                                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                            <div className="p-1.5 bg-muted rounded">
                                                                <Icon name={stat.icon} size={14} className="opacity-70" />
                                                            </div>
                                                            {stat.name}
                                                        </td>
                                                        <td className="px-6 py-4 uppercase tracking-tighter font-mono text-xs">
                                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{stat.total}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.keys(stat.byField).map(f => (
                                                                    <span key={f} className="text-[9px] font-bold px-1.5 py-0.5 bg-muted rounded uppercase text-muted-foreground">{f}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleSetSelectedTag(stat)}
                                                                className="p-1.5 hover:bg-primary hover:text-primary-foreground rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Icon name="ArrowRight" size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <ConfirmDialog
                open={isMergeDialogOpen}
                onOpenChange={setIsMergeDialogOpen}
                title="Merge / Rename Value Globally"
                description={
                    <div className="space-y-4 pt-4">
                        <p className="text-sm">Rename <span className="font-bold text-primary">{selectedTag?.name}</span> across all associated fields. If the new value exists, entries will be merged.</p>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="New name..."
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                }
                onConfirm={handleMerge}
                confirmLabel="Rename Globally"
            />

            <ConfirmDialog
                open={isSplitDialogOpen}
                onOpenChange={setIsSplitDialogOpen}
                title="Split Value Globally"
                description={
                    <div className="space-y-4 pt-4">
                        <p className="text-sm">Enter comma-separated values to replace <span className="font-bold text-primary">{selectedTag?.name}</span> globally.</p>
                        <input
                            type="text"
                            value={splitNames}
                            onChange={(e) => setSplitNames(e.target.value)}
                            placeholder="value1, value2..."
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                }
                onConfirm={handleSplit}
                confirmLabel="Confirm Split"
            />

            <ConfirmDialog
                open={isMassUpdateDialogOpen}
                onOpenChange={setIsMassUpdateDialogOpen}
                title="Mass Update Metadata"
                description={
                    <div className="space-y-4 pt-4 text-left">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Target Field</label>
                                <select
                                    value={massTargetField}
                                    onChange={(e) => setMassTargetField(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none capitalize"
                                >
                                    {availableFields.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Filter (Boolean Query)</label>
                                <input
                                    type="text"
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    placeholder='e.g. difficulty:Hard'
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-green-500 px-1">Add Value</label>
                                <input
                                    type="text"
                                    value={tagToAdd}
                                    onChange={(e) => setTagToAdd(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-red-500 px-1">Remove Value</label>
                                <input
                                    type="text"
                                    value={tagToRemove}
                                    onChange={(e) => setTagToRemove(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                }
                onConfirm={handleMassUpdate}
                confirmLabel="Run Global Update"
            />
        </div>
    );
};
