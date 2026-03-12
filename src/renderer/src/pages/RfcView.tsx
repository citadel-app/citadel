import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef } from 'react';
import { db } from '../lib/db';
import { SplitPaneLayout } from '../components/layout';
import { SectionsPanel } from '../components/sections';
import { PdfViewer } from '../components/PdfViewer';
import { useEntryContent, useHighlights } from '../hooks';
import { resolveResourceUrl } from '@shared';
import { Icon } from '../components/IconRegistry';

export const RfcView = () => {
    const { id } = useParams<{ id: string }>();
    const highlightUtilsRef = useRef<any>(null);

    const entry = useLiveQuery(
        () => db.entries.get(id || ''),
        [id]
    );

    const {
        sections,
        handleSaveSection,
        handleDeleteSection,
        handleAddSection
    } = useEntryContent({ entry });

    const {
        resolvedHighlights,
        handleHighlightAdd,
        handleHighlightDelete,
        handleHighlightClick
    } = useHighlights({ entry });

    if (!entry && !id) return <div className="p-8">No ID provided</div>;
    if (!entry) return <div className="p-8 animate-pulse">Loading RFC...</div>;

    const pdfUrl = entry.frontmatter?.pdfPath
        ? resolveResourceUrl(entry.filePath, entry.frontmatter.pdfPath)
        : undefined;

    const pdfPanel = (
        <div className="h-full border-r border-border bg-gray-100 dark:bg-gray-900">
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
                    <Icon name="FileQuestion" size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">No PDF associated with this RFC</p>
                    <p className="text-xs mt-1">Add pdfPath to frontmatter</p>
                </div>
            )}
        </div>
    );

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
