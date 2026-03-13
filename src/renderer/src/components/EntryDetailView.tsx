import { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { SplitPaneLayout } from '../components/layout';
import { useEntryContent, useHighlights } from '../hooks';
import { useConfig } from '../context/ConfigContext';
import { ModuleRegistry } from '../registries/modules';
import { useAppSettings } from '../context/AppSettingsContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { dataManager } from '../lib/data-manager';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';

interface EntryDetailViewProps {
    id: string;
    isZen?: boolean;
    isNotebook?: boolean;
}

export const EntryDetailView = ({ id, isZen: forcedZen, isNotebook }: EntryDetailViewProps) => {
    const { getEntryTypeConfig } = useConfig();
    const { settings } = useAppSettings();
    const isZen = forcedZen ?? settings?.zenMode;
    const highlightUtilsRef = useRef<any>(null);

    const entry = useLiveQuery(
        () => db.entries.get(id || ''),
        [id]
    );

    // Hooks
    const {
        localContent,
        setLocalContent,
        sections,
        handleSaveSection,
        handleDeleteSection,
        handleAddSection,
        handleUpdateFrontmatter,
        hasConflict,
        resolveConflict
    } = useEntryContent({ entry });

    const [showConflictDialog, setShowConflictDialog] = useState(false);

    // Sync dialog state with hasConflict
    if (hasConflict && !showConflictDialog) {
        setShowConflictDialog(true);
    }

    const {
        resolvedHighlights,
        handleHighlightAdd,
        handleHighlightDelete,
        handleHighlightClick
    } = useHighlights({ entry });

    // Stable handlers using refs for content to avoid re-triggering module renders
    const localContentRef = useRef(localContent);
    useEffect(() => {
        localContentRef.current = localContent;
    }, [localContent]);

    const onHighlightAddStable = useCallback((h: any) => {
        handleHighlightAdd(h, localContentRef.current);
    }, [handleHighlightAdd]);

    const onHighlightClickStable = useCallback((hId: string) => {
        handleHighlightClick(hId, (h) => highlightUtilsRef.current?.scrollToHighlight(h));
    }, [handleHighlightClick]);

    const onWhiteboardSaveStable = useCallback((data: any) => {
        if (!entry?.id) return;
        dataManager.updateEntry(entry.id, { whiteboard: data })
            .catch(err => console.error('Failed to save whiteboard', err));
    }, [entry?.id]);

    // Stable Module Factory
    const renderModule = useCallback((moduleDef: any, type: 'primary' | 'secondary') => {
        if (!moduleDef || !entry) return null;

        const moduleId = typeof moduleDef === 'string' ? moduleDef : moduleDef.id;
        const moduleConfig = typeof moduleDef === 'string' ? {} : moduleDef;

        const Component = ModuleRegistry[moduleId as keyof typeof ModuleRegistry];
        if (!Component) {
            return <div className="p-4 text-red-500">Unknown Module: {moduleId}</div>;
        }

        // Props mapping
        const commonProps = { entry, config: moduleConfig };

        if (moduleId === 'sections') {
            return (
                <Component
                    {...commonProps}
                    content={localContent}
                    sections={sections}
                    highlights={resolvedHighlights}
                    onSectionSave={handleSaveSection}
                    onSectionDelete={handleDeleteSection}
                    onSectionAdd={handleAddSection}
                    onHighlightDelete={handleHighlightDelete}
                    onHighlightClick={onHighlightClickStable}
                    onReplaceContent={setLocalContent}
                    isNotebook={isNotebook}
                />
            );
        }

        if (moduleId === 'pdf' || moduleId === 'webview') {
            return (
                <Component
                    {...commonProps}
                    highlights={resolvedHighlights}
                    onHighlightAdd={onHighlightAddStable}
                    onHighlightDelete={handleHighlightDelete}
                    highlightUtilsRef={highlightUtilsRef}
                />
            );
        }

        if (moduleId === 'whiteboard') {
            return (
                <Component
                    {...commonProps}
                    initialData={entry.whiteboard}
                    onSave={onWhiteboardSaveStable}
                />
            );
        }

        return <Component {...commonProps} />;
    }, [
        entry,
        localContent,
        sections,
        resolvedHighlights,
        handleSaveSection,
        handleDeleteSection,
        handleAddSection,
        handleHighlightDelete,
        onHighlightClickStable,
        setLocalContent,
        onHighlightAddStable,
        onWhiteboardSaveStable
    ]);

    if (!entry && !id) return <div className="p-8">No ID provided</div>;
    if (!entry) return <div className="p-8 animate-pulse text-muted-foreground italic">Loading entry...</div>;

    // Config
    const config = getEntryTypeConfig(entry.type);
    const viewConfig = config.view;

    const PrimaryModule = renderModule(viewConfig.modules.primary, 'primary');
    const SecondaryModule = renderModule(viewConfig.modules.secondary, 'secondary');

    // Zen Mode: Centered primary content only
    if (isZen) {
        return (
            <div className="h-full w-full bg-background no-split flex flex-col items-center">
                <div className="flex-1 w-full max-w-4xl min-h-0 overflow-auto relative shadow-inner">
                    <Suspense fallback={<LoadingPlaceholder message="Loading module..." />}>
                        {PrimaryModule}
                    </Suspense>
                </div>
                <ConflictDialog
                    open={showConflictDialog}
                    onOpenChange={setShowConflictDialog}
                    onResolve={resolveConflict}
                />
            </div>
        );
    }

    // Render Layout
    if (viewConfig.layout === 'split') {
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <SplitPaneLayout
                    leftPanel={
                        <Suspense fallback={<LoadingPlaceholder message="Loading module..." />}>
                            {PrimaryModule}
                        </Suspense>
                    }
                    rightPanel={
                        <Suspense fallback={<LoadingPlaceholder message="Loading module..." />}>
                            {SecondaryModule}
                        </Suspense>
                    }
                    defaultLeftSize={50}
                    controlsPosition="top-left"
                />
                <ConflictDialog
                    open={showConflictDialog}
                    onOpenChange={setShowConflictDialog}
                    onResolve={resolveConflict}
                />
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-background no-split flex flex-col">
            <div className="flex-1 overflow-auto min-h-0 relative">
                <Suspense fallback={<LoadingPlaceholder message="Loading module..." />}>
                    {SecondaryModule || PrimaryModule}
                </Suspense>
            </div>
            <ConflictDialog
                open={showConflictDialog}
                onOpenChange={setShowConflictDialog}
                onResolve={resolveConflict}
            />
        </div>
    );
};

const ConflictDialog = ({ open, onOpenChange, onResolve }: { open: boolean, onOpenChange: (open: boolean) => void, onResolve: (type: 'use-local' | 'use-disk') => void }) => (
    <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title="File Change Conflict"
        description="This file was changed externally (e.g., via Git). You have unsaved changes in your editor. Would you like to Keep your local edits or overwrite them with the version from disk?"
        confirmLabel="Keep Local Edits"
        cancelLabel="Overwrite from Disk"
        onConfirm={() => {
            onResolve('use-local');
            onOpenChange(false);
        }}
    />
);
