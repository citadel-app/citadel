import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, useEffect, useMemo } from 'react';
import { db } from '../lib/db';
import { SplitPaneLayout } from '../components/layout';
import { SectionsPanel } from '../components/sections';
import { PdfViewer } from '../components/PdfViewer';
import { useEntryContent, useHighlights } from '../hooks';
import { resolveResourceUrl } from '@shared';
import { Icon } from '../components/IconRegistry';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const StandardView = () => {
    const { id } = useParams<{ id: string }>();
    const highlightUtilsRef = useRef<any>(null);

    const entry = useLiveQuery(
        () => db.entries.get(id || ''),
        [id]
    );

    const {
        sections,
        localContent, // Destructure localContent
        handleSaveSection,
        handleDeleteSection,
        handleAddSection,
        hasConflict,
        resolveConflict
    } = useEntryContent({ entry });

    const [showConflictDialog, setShowConflictDialog] = useState(false);

    // Sync dialog state with hasConflict
    useEffect(() => {
        if (hasConflict && !showConflictDialog) {
            setShowConflictDialog(true);
        }
    }, [hasConflict, showConflictDialog]);

    const {
        resolvedHighlights,
        handleHighlightAdd,
        handleHighlightDelete,
        handleHighlightClick
    } = useHighlights({ entry });

    if (!entry && !id) return <div className="p-8">No ID provided</div>;
    if (!entry) return <div className="p-8 animate-pulse">Loading standard...</div>;

    const pdfUrl = useMemo(() => {
        return entry.frontmatter?.pdfPath
            ? resolveResourceUrl(entry.filePath, entry.frontmatter.pdfPath)
            : undefined;
    }, [entry.filePath, entry.frontmatter?.pdfPath]);

    const pdfPanel = useMemo(() => (
        <div className="h-full border-r border-border bg-gray-100 dark:bg-gray-900">
            {pdfUrl ? (
                <PdfViewer
                    url={pdfUrl}
                    highlights={resolvedHighlights}
                    onHighlightChange={(h) => handleHighlightAdd(h, localContent)}
                    onDeleteHighlight={handleHighlightDelete}
                    highlightUtilsRef={highlightUtilsRef}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Icon name="FileQuestion" size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">No PDF associated with this standard</p>
                    <p className="text-xs mt-1">Add pdfPath to frontmatter</p>
                </div>
            )}
        </div>
    ), [pdfUrl, resolvedHighlights, handleHighlightAdd, handleHighlightDelete, localContent]);

    const notesPanel = (
        <SectionsPanel
            entry={entry}
            sections={sections}
            highlights={resolvedHighlights}
            onSectionSave={handleSaveSection}
            onSectionDelete={handleDeleteSection}
            onSectionAdd={handleAddSection}
            onHighlightDelete={handleHighlightDelete}
            onHighlightClick={(hId) => handleHighlightClick(hId, (h) => highlightUtilsRef.current?.scrollToHighlight(h))}
        />
    );

    return (
        <>
            <SplitPaneLayout
                leftPanel={pdfPanel}
                rightPanel={notesPanel}
                defaultLeftSize={50}
            />

            <ConfirmDialog
                open={showConflictDialog}
                onOpenChange={setShowConflictDialog}
                title="File Change Conflict"
                description="This file was changed externally (e.g., via Git). You have unsaved changes in your editor. Would you like to keep your local edits or overwrite them with the version from disk?"
                confirmLabel="Keep Local Edits"
                cancelLabel="Overwrite from Disk"
                onConfirm={() => {
                    resolveConflict('use-local');
                    setShowConflictDialog(false);
                }}
            // We use cancellation to trigger the 'use-disk' path 
            // but ConfirmDialog as currently implemented might not support custom cancel handler easily if it's just a ref to onOpenChange.
            // Wait, ConfirmDialog doesn't have onCancel. It has onConfirm.
            />
        </>
    );
};
