import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodexEntry } from '../../lib/db';
import { EntryHeader } from '../EntryHeader';
import { SectionView } from '../SectionView';
import { GhostSections } from './GhostSections';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import { dataManager } from '../../lib/data-manager';
import { metadataService, ragService } from '../../ai';
import { type EntrySection } from '@citadel-app/core';
import { useConfig } from '../../context/ConfigContext';

interface Highlight {
    id: string;
    content?: { text?: string; image?: string };
    [key: string]: any;
}

interface SectionsPanelProps {
    entry: CodexEntry;
    content?: string;
    sections: EntrySection[];
    highlights?: Highlight[];
    onSectionSave: (sectionId: string, newContent: string) => void;
    onSectionDelete: (sectionId: string) => void;
    onSectionAdd: (title: string, content?: string) => void;
    onHighlightDelete?: (highlightId: string) => void;
    onHighlightClick?: (highlightId: string) => void;
    onReplaceContent?: (newContent: string) => void;
    className?: string;
    isNotebook?: boolean;
}

export const SectionsPanel = ({
    entry,
    content,
    sections,
    highlights = [],
    onSectionSave,
    onSectionDelete,
    onSectionAdd,
    onHighlightDelete,
    onHighlightClick,
    onReplaceContent,
    className,
    isNotebook
}: SectionsPanelProps) => {
    const navigate = useNavigate();
    const { getEntryTypeConfig } = useConfig();
    const config = getEntryTypeConfig(entry.type);
    const aiEnabled = config?.aiFeaturesEnabled !== false;

    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showTOC, setShowTOC] = useState(true);

    // Custom Section Form State
    const [newSectionTitle, setNewSectionTitle] = useState('New Section');
    const [newSectionType, setNewSectionType] = useState('markdown');

    const existingSectionTitles = sections.map(s => s.title || '');

    const handleDeleteEntry = async () => {
        try {
            await dataManager.deleteEntry(entry.id);
            navigate('/');
        } catch (error) {
            console.error('Failed to delete entry:', error);
        }
    };

    const handleMetadataUpdate = async (updates: Partial<any>) => {
        try {
            await dataManager.updateMetadata(entry.id, updates);
        } catch (error) {
            console.error('Failed to update metadata:', error);
        }
    };

    // Handle adding a section with title and content (e.g., from AI summary)
    const handleAddSectionWithContent = (title: string, sectionContent: string) => {
        // Pass both title and content to onSectionAdd (extended signature)
        onSectionAdd(title, sectionContent);
    };

    const handleCreateCustomSection = () => {
        let content = '';
        if (newSectionType === 'code') content = '```javascript\n\n```';
        else if (newSectionType === 'whiteboard') content = '```excalidraw\n{}\n```';
        else if (newSectionType === 'list') content = '- Item 1';

        onSectionAdd(newSectionTitle || 'New Section', content);

        // Reset and close
        setShowAddMenu(false);
        setNewSectionTitle('New Section');
        setNewSectionType('markdown');
    };

    const handleAiGenerateSection = async (title: string, instructions: string) => {
        setIsGenerating(title);
        try {
            // 1. Get Dual-Context for RAG
            let structuralContext = await ragService.getStructuralContext(entry.id, 3);
            let semanticContext = await ragService.getContextForPrompt(
                entry.id,
                `Document: ${entry.title}. Section: ${title}. Instructions: ${instructions}`,
                5
            );

            // Auto-Index Fallback: If no context is found, try indexing the entry once
            if (!structuralContext && !semanticContext) {
                console.log(`[SectionsPanel] No RAG context for ${entry.id}. Attempting auto-indexing...`);
                setIsGenerating(`Indexing ${entry.title}...`);
                await ragService.indexEntry(entry);

                // Re-fetch context
                structuralContext = await ragService.getStructuralContext(entry.id, 3);
                semanticContext = await ragService.getContextForPrompt(
                    entry.id,
                    `Document: ${entry.title}. Section: ${title}. Instructions: ${instructions}`,
                    5
                );
                setIsGenerating(title); // Switch back to original title for generation
            }

            console.log(`[SectionsPanel] RAG Context Fetched:`, {
                structuralLen: structuralContext?.length || 0,
                semanticLen: semanticContext?.length || 0,
                instructions
            });

            const combinedContext = `--- BEGINNING OF DOCUMENT ---
${structuralContext}

--- RELEVANT SEGMENTS ---
${semanticContext}`;

            // 2. Find current content if it exists
            const existingSection = sections.find(s => s.title === title);
            const currentContent = existingSection?.content || '';

            // 3. Generate
            const result = await metadataService.generateSection(
                title,
                instructions,
                combinedContext,
                currentContent
            );

            console.log(`[SectionsPanel] AI Result for ${title}:`, {
                hasResult: !!result,
                len: result?.length || 0,
                preview: result?.slice(0, 100)
            });

            if (result) {
                if (existingSection) {
                    onSectionSave(existingSection.id, `## ${title}\n\n${result}`);
                } else {
                    onSectionAdd(title, result);
                }

                // Proactively re-index in background so RAG is fresh
                // Note: We wait a bit for the debounced save to hit the DB/FS
                setTimeout(() => {
                    ragService.indexEntry(entry).catch(e => console.error('[SectionsPanel] Proactive index failed', e));
                }, 1500);
            }
        } catch (e) {
            console.error('[SectionsPanel] AI Generation failed:', e);
        } finally {
            setIsGenerating(null);
        }
    };

    return (
        <div className={cn("h-full overflow-auto bg-background", className)}>
            <div className="p-8 pb-24">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Entry Header with Highlights */}
                    <EntryHeader
                        entry={entry}
                        content={content}
                        highlights={highlights}
                        onDeleteHighlight={onHighlightDelete}
                        onHighlightClick={onHighlightClick}
                        onDeleteEntry={handleDeleteEntry}
                        onMetadataUpdate={handleMetadataUpdate}
                        onAddSection={handleAddSectionWithContent}
                        onReplaceContent={onReplaceContent}
                        sections={sections}
                        showTOC={showTOC}
                        onToggleTOC={() => setShowTOC(s => !s)}
                    />

                    {/* Sections */}
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {sections.map(section => (
                            <SectionView
                                key={section.id}
                                section={section}
                                entryType={entry.type}
                                entryId={entry.id}
                                filePath={entry.filePath}
                                onSave={onSectionSave}
                                onDelete={onSectionDelete}
                                onAiGenerate={handleAiGenerateSection}
                                isNotebook={isNotebook}
                            />
                        ))}

                        {sections.length === 0 && (
                            <div className="text-muted-foreground text-center py-10 italic">
                                No notes yet. Add a section below to start.
                            </div>
                        )}
                    </div>

                    {/* Ghost Sections */}
                    <GhostSections
                        entryType={entry.type}
                        existingSectionTitles={existingSectionTitles}
                        onAddSection={onSectionAdd}
                        onAiGenerate={(config) => handleAiGenerateSection(config.title, config.description)}
                        aiEnabled={aiEnabled}
                    />

                    {isGenerating && (
                        <div className="fixed bottom-10 right-10 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg animate-bounce flex items-center gap-2 z-50">
                            <Icon name="Sparkles" size={16} />
                            Generating {isGenerating}...
                        </div>
                    )}

                    {/* Add Custom Section Selector */}
                    {showAddMenu ? (
                        <div className="w-full border border-primary/30 rounded-lg p-5 bg-background shadow-md animate-in slide-in-from-top-2 fade-in duration-200">
                            <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
                                <Icon name="PlusCircle" size={16} className="text-primary" />
                                Create Custom Section
                            </h4>

                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 w-full space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">Section Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newSectionTitle}
                                        onChange={(e) => setNewSectionTitle(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomSection(); }}
                                        className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
                                        placeholder="E.g., API Specifications"
                                    />
                                </div>
                                <div className="w-full sm:w-48 space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">Editor Type</label>
                                    <select
                                        value={newSectionType}
                                        onChange={(e) => setNewSectionType(e.target.value)}
                                        className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                                    >
                                        <option value="markdown">Markdown Editor</option>
                                        <option value="code">Code snippet</option>
                                        <option value="list">Bulleted List</option>
                                        <option value="whiteboard">Whiteboard</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    <button
                                        onClick={() => setShowAddMenu(false)}
                                        className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors flex-1 sm:flex-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateCustomSection}
                                        className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm transition-colors flex-1 sm:flex-none flex items-center justify-center gap-2"
                                    >
                                        <Icon name="Plus" size={16} />
                                        Create
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddMenu(true)}
                            className="w-full py-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group"
                        >
                            <Icon name="Plus" size={20} className="group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Add Section</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
