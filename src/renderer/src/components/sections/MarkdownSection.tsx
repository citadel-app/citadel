import { useState, useCallback } from 'react';
import { SectionContainer } from './SectionContainer';
import { TiptapWrapper } from '../editors/TiptapWrapper';
import { cn } from '../../lib/utils';
import { useConfig } from '../../context/ConfigContext';

interface MarkdownSectionProps {
    id: string;
    title: string;
    entryType: string;
    entryId: string;
    filePath: string;
    content: string;
    onSave: (sectionId: string, newContent: string) => Promise<void>;
    onDelete?: (sectionId: string) => Promise<void>;
    onAiGenerate?: (sectionTitle: string, instructions: string) => void;
    className?: string;
}

export const MarkdownSection = ({
    id,
    title,
    entryType,
    entryId,
    filePath,
    content,
    onSave,
    onDelete,
    onAiGenerate,
    className
}: MarkdownSectionProps) => {
    const { findSectionConfig } = useConfig();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);

    const sectionConfig = findSectionConfig(entryType, title);

    const handleEdit = () => {
        setEditContent(content);
        setIsEditing(true);
    };

    const handleSave = useCallback(async () => {
        // Reconstruct markdown with title
        const newRaw = `## ${title}\n\n${editContent}`;
        await onSave(id, newRaw);
        setIsEditing(false);
    }, [id, title, editContent, onSave]);

    const handleCancel = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (onDelete) {
            await onDelete(id);
        }
    };

    const handleAiAction = () => {
        if (onAiGenerate && sectionConfig?.description) {
            onAiGenerate(title, sectionConfig.description);
        }
    };

    // Parse content (remove title header if present)
    // We match any level of header at the start that corresponds to the section title
    const headerRegex = new RegExp(`^#+\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\r\\n]*`, 'i');
    const displayContent = content.replace(headerRegex, '').trim();

    console.log(`[MarkdownSection] Rendering "${title}":`, {
        rawLen: content.length,
        displayLen: displayContent.length,
        hasContent: !!displayContent
    });

    return (
        <SectionContainer
            title={title}
            entryType={entryType}
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={onDelete ? handleDelete : undefined}
            onAiAction={sectionConfig?.description ? handleAiAction : undefined}
            className={className}
        >
            {isEditing ? (
                <TiptapWrapper
                    content={editContent}
                    onChange={setEditContent}
                    entryId={entryId}
                    basePath={filePath}
                    className="min-h-[150px]"
                    editable
                />
            ) : (
                <div className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    !displayContent && "text-muted-foreground italic"
                )}>
                    {displayContent ? (
                        <TiptapWrapper
                            content={displayContent}
                            entryId={entryId}
                            basePath={filePath}
                            editable={false}
                        />
                    ) : (
                        <p>Click edit to add content...</p>
                    )}
                </div>
            )}
        </SectionContainer>
    );
};
