import { useState, useEffect } from 'react';
import { MarkdownViewer } from './MarkdownViewer';
import { useConfig } from '../context/ConfigContext';
import { EntrySection } from '../lib/serializers/types';
import { TiptapWrapper } from './editors/TiptapWrapper';
import { CodeSectionEditor, ListSectionEditor, WhiteboardSectionEditor } from './sections/MultiFormatEditors';
import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

interface SectionViewProps {
    section: EntrySection;
    entryType: string;
    entryId: string;
    filePath: string;
    onSave: (id: string, newContent: string) => void;
    onDelete: (id: string) => void;
    onAiGenerate?: (sectionTitle: string, instructions: string) => void;
    isNotebook?: boolean;
}

export const SectionView = ({ section, entryType, entryId, filePath, onSave, onDelete, onAiGenerate, isNotebook }: SectionViewProps) => {
    const { findSectionConfig } = useConfig();

    // Automatically enter edit mode if it is a brand new templated block
    const [isEditing, setIsEditing] = useState(() => {
        const trimmed = section.content.trim();
        return trimmed === '```javascript\n\n```' ||
            trimmed === '```excalidraw\n{}\n```' ||
            trimmed === '- Item 1' ||
            trimmed === '';
    });

    const [editedContent, setEditedContent] = useState(section.content);
    const [editedTitle, setEditedTitle] = useState(section.title || '');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Determines Styles
    const config = (section.title || editedTitle) ? findSectionConfig(entryType, section.title || editedTitle) : undefined;
    const hasIcon = !!config?.icon;

    // Blur Logic for Notebooks
    const isHiddenInNotebooks = config?.isHiddenInNotebooks === true;
    const [isRevealed, setIsRevealed] = useState(false);
    const [revealCountdown, setRevealCountdown] = useState(0);
    const shouldBlur = isNotebook && isHiddenInNotebooks && !isRevealed;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        let interval: NodeJS.Timeout;

        if (isRevealed) {
            setRevealCountdown(30);

            // Hide after 30s
            timer = setTimeout(() => {
                setIsRevealed(false);
                setRevealCountdown(0);
            }, 30000);

            // Update countdown every second
            interval = setInterval(() => {
                setRevealCountdown(prev => Math.max(0, prev - 1));
            }, 1000);
        }

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [isRevealed]);


    // Sync state when section prop changes (vital for index-based IDs)
    useEffect(() => {
        setEditedContent(section.content);
        setEditedTitle(section.title || '');
        setIsRevealed(false);
    }, [section.content, section.title, section.id, entryId]);

    const handleSave = () => {
        // Re-construct the full section string (Header + Body)
        // If title changed or we have a title, we need to ensure the header is there
        const newHeader = (section.title || editedTitle) ? `## ${editedTitle}` : '';

        // If content is just the body, we append it to header
        const fullContent = newHeader
            ? `${newHeader}\n\n${editedContent}`
            : editedContent;

        onSave(section.id, fullContent);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedContent(section.content);
        setIsEditing(false);
    };

    const startEditing = () => {
        setEditedContent(section.content);
        setEditedTitle(section.title || '');
        setIsEditing(true);
    };

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        onDelete(section.id);
        setShowDeleteDialog(false);
    };

    const containerClasses = config
        ? cn("mb-6 rounded-md p-4 transition-colors relative group/section", "bg-background")
        : cn("mb-6 p-4 transition-colors relative group/section");

    return (
        <div id={`section-${section.id}`} className={containerClasses}>

            {/* Section Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                    {hasIcon && config && <Icon name={config.icon!} className="text-muted-foreground" size={18} />}

                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="text-lg font-semibold tracking-tight text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full"
                            placeholder="Section Title"
                        />
                    ) : (
                        section.title && (
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                {section.title}
                            </h3>
                        )
                    )}
                </div>

                {/* Edit Controls */}
                <div className={cn(
                    "transition-opacity flex items-center gap-1",
                    isEditing ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"
                )}>
                    {!isEditing && section.title && onAiGenerate && config?.description && (
                        <button
                            onClick={() => onAiGenerate(section.title!, config.description!)}
                            className="p-1.5 rounded hover:bg-purple-500/10 text-purple-600 transition-colors"
                            title="Generate with AI"
                        >
                            <Icon name="Sparkles" size={14} />
                        </button>
                    )}
                    {!isEditing ? (
                        <button
                            onClick={startEditing}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Section"
                        >
                            <Icon name="Edit" size={14} />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1">
                            {isRevealed && !isEditing && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 mr-2 tabular-nums">
                                    <Icon name="Clock" size={10} />
                                    <span>{revealCountdown}s until hidden</span>
                                </div>
                            )}
                            <span className="text-xs text-muted-foreground mr-2 font-medium">Editing...</span>
                            <button
                                onClick={handleSave}
                                className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Save"
                            >
                                <Icon name="Check" size={14} />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-1.5 rounded hover:bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                title="Delete Section"
                            >
                                <Icon name="Trash" size={14} />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                                title="Cancel"
                            >
                                <Icon name="X" size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className={cn(
                "text-sm text-foreground/90 min-h-[24px] relative",
                shouldBlur && "select-none"
            )}>
                {shouldBlur && (
                    <div
                        className="absolute inset-x-0 inset-y-[-10px] z-20 flex items-center justify-center bg-background/20 backdrop-blur-md rounded-lg group/blur cursor-pointer hover:bg-background/30 transition-all border border-transparent hover:border-primary/20 shadow-sm"
                        onClick={() => setIsRevealed(true)}
                    >
                        <div className="flex flex-col items-center gap-2 scale-90 group-hover/blur:scale-100 transition-transform">
                            <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-inner">
                                <Icon name="Eye" size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Revealed on Click</span>
                        </div>
                    </div>
                )}

                <div className={cn(
                    "transition-all duration-500",
                    shouldBlur ? "blur-xl opacity-20" : "blur-0 opacity-100"
                )}>
                    {(() => {
                        let editorType = config?.editorType;

                        // Infer from content if not explicitly configured in entry-types
                        if (!editorType) {
                            const current = isEditing ? editedContent : section.content;
                            const trimmed = current.trim();
                            if (trimmed.startsWith('```excalidraw')) {
                                editorType = 'whiteboard';
                            } else if (trimmed.match(/^```([a-z]+)?\n[\s\S]*```$/)) {
                                // Assume it's a code block if it is entirely encapsulated in one
                                editorType = 'code';
                            } else {
                                editorType = 'markdown'; // default
                            }
                        }

                        if (editorType === 'code') {
                            return <CodeSectionEditor content={isEditing ? editedContent : section.content} onChange={setEditedContent} editable={isEditing} />;
                        }
                        if (editorType === 'list') {
                            return <ListSectionEditor content={isEditing ? editedContent : section.content} onChange={setEditedContent} editable={isEditing} entryId={entryId} basePath={filePath} />;
                        }
                        if (editorType === 'whiteboard') {
                            return <WhiteboardSectionEditor content={isEditing ? editedContent : section.content} onChange={setEditedContent} editable={isEditing} />;
                        }

                        // Default Markdown
                        return isEditing ? (
                            <TiptapWrapper
                                content={editedContent}
                                onChange={setEditedContent}
                                className="border rounded-md shadow-sm min-h-[150px]"
                                editable={true}
                                entryId={entryId}
                                basePath={filePath}
                            />
                        ) : (
                            <MarkdownViewer content={section.content} filePath={filePath} />
                        );
                    })()}
                </div>
            </div>

            {/* Add divider hint if needed (optional) */}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title="Delete Section"
                description="Are you sure you want to delete this section? This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={confirmDelete}
                variant="destructive"
            />
        </div>
    );
};
