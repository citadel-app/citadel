import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef } from 'react';
import { db } from '../lib/db';
import { SplitPaneLayout } from '../components/layout';
import { SectionsPanel } from '../components/sections';
import { PdfViewer } from '../components/PdfViewer';
import { useEntryContent, useHighlights } from '../hooks';
import { resolveResourceUrl } from '../lib/utils';
import { Icon } from '../components/IconRegistry';

export const PaperView = () => {
    const { id } = useParams<{ id: string }>();
    const highlightUtilsRef = useRef<any>(null);

    // Fetch entry from DB
    const entry = useLiveQuery(
        () => db.entries.get(id || ''),
        [id]
    );

    // Content management hook
    const {
        sections,
        handleSaveSection,
        handleDeleteSection,
        handleAddSection
    } = useEntryContent({ entry });

    // Highlights management hook
    const {
        resolvedHighlights,
        handleHighlightAdd,
        handleHighlightDelete,
        handleHighlightClick
    } = useHighlights({ entry });

    // Loading states
    if (!entry && !id) return <div className="p-8">No ID provided</div>;
    if (!entry) return <div className="p-8 animate-pulse">Loading paper...</div>;

    // Resolve PDF path
    const pdfUrl = entry.frontmatter?.pdfPath
        ? resolveResourceUrl(entry.filePath, entry.frontmatter.pdfPath)
        : undefined;

    // PDF Panel Component
    const pdfPanel = (
        <div className="h-full border-r border-border">
            {pdfUrl ? (
                <PdfViewer
                    url={pdfUrl}
                    highlights={resolvedHighlights}
                    onHighlightChange={handleHighlightAdd}
                    onDeleteHighlight={handleHighlightDelete}
                    highlightUtilsRef={highlightUtilsRef}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Icon name="FileWarning" size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">No PDF attached</p>
                    <p className="text-xs mt-1">Upload a PDF to view it here</p>
                </div>
            )}
        </div>
    );

    // Notes Panel Component
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
        <SplitPaneLayout
            leftPanel={pdfPanel}
            rightPanel={notesPanel}
            defaultLeftSize={50}
        />
    );
};
