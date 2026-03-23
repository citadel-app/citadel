import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTheme } from 'next-themes';
import { ComponentLibrary, insertLibraryItem } from './ComponentLibrary';
import "@excalidraw/excalidraw/index.css";
import { debounce } from 'lodash';
import { useCoreServices } from '@citadel-app/ui';
import { Icon } from '@citadel-app/ui';

interface WhiteboardModuleProps {
    initialData?: any;
    onSave?: (data: any) => void;
}

export const WhiteboardModule = ({ initialData, onSave }: WhiteboardModuleProps) => {
    const { resolvedTheme } = useTheme();
    const { vaultPath, storage } = useCoreServices();

    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Track app state for reliable drop coordinates
    const appStateRef = useRef<any>({ scrollX: 0, scrollY: 0, zoom: { value: 1 } });
    const lastSavedData = useRef<string>('');

    // Load library from workspace if it exists
    useEffect(() => {
        if (!excalidrawAPI || !vaultPath) return;

        const loadLibrary = async () => {
            try {
                const content = await storage.readFile('.codex/excalidraw/library.excalidraw');
                if (content) {
                    const data = JSON.parse(content);
                    if (data && data.libraryItems) {
                        excalidrawAPI.updateLibrary({
                            libraryItems: data.libraryItems,
                            openLibraryMenu: false
                        });
                        console.log(`[WhiteboardModule] Loaded ${data.libraryItems.length} items from workspace library.`);
                    }
                }
            } catch (error) {
                console.error('[WhiteboardModule] Failed to load workspace library:', error);
            }
        };

        loadLibrary();
    }, [excalidrawAPI, vaultPath, storage]);

    // Helper to create consistent payload
    const createPayload = useCallback((elements: any[], appState: any, files: any, theme: string) => {
        return {
            elements: elements || [],
            appState: {
                theme: appState?.theme || (theme === 'dark' ? 'dark' : 'light'),
                viewBackgroundColor: '#ffffff',
                currentItemFontFamily: appState?.currentItemFontFamily || 1,
            },
            files: files || null
        };
    }, []);

    // Initial load from props
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!excalidrawAPI || isInitialized) return;

        if (initialData) {
            try {
                console.log("[WhiteboardModule] Loading initial data...");
                let data = initialData;
                if (typeof initialData === 'string') {
                    const cleanData = initialData.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    data = JSON.parse(cleanData);
                }

                if (data && (data.elements || data.shapes)) {
                    // Check if it's legacy tldraw data (usually has 'shapes' or 'schema')
                    if (!data.elements && data.shapes) {
                        console.warn("[WhiteboardModule] Detected legacy Tldraw data. This cannot be loaded in Excalidraw.");
                        setIsInitialized(true);
                        return;
                    }

                    if (data.files) {
                        excalidrawAPI.addFiles(Object.values(data.files));
                    }

                    excalidrawAPI.updateScene({
                        elements: data.elements,
                        appState: {
                            ...data.appState,
                            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
                            viewBackgroundColor: resolvedTheme === 'dark' ? '#1e1e1e' : '#ffffff',
                        },
                    });

                    // Initialize lastSavedData to prevent immediate save on load
                    const payload = createPayload(
                        data.elements,
                        data.appState,
                        data.files,
                        resolvedTheme || 'light'
                    );
                    const json = JSON.stringify(payload);
                    lastSavedData.current = json;
                    console.log("[WhiteboardModule] Initial data loaded. Hash:", json.length);
                }
                setIsInitialized(true);
            } catch (e) {
                console.error("[WhiteboardModule] Failed to load initial data", e);
                setIsInitialized(true); // Don't block if data is corrupt
            }
        } else {
            console.log("[WhiteboardModule] No initial data (new diagram).");
            setIsInitialized(true);
        }
    }, [excalidrawAPI, initialData, isInitialized, resolvedTheme, createPayload]);

    // Handle theme/background synchronization separately and reactively
    useEffect(() => {
        if (!excalidrawAPI || !resolvedTheme) return;

        const isDark = resolvedTheme === 'dark';
        const expectedBg = '#ffffff';
        const expectedTheme = isDark ? 'dark' : 'light';

        const currentAppState = excalidrawAPI.getAppState();
        if (currentAppState.theme !== expectedTheme || currentAppState.viewBackgroundColor !== expectedBg) {
            console.log(`[WhiteboardModule] Syncing theme to ${expectedTheme} and background to ${expectedBg}`);
            excalidrawAPI.updateScene({
                appState: {
                    ...currentAppState,
                    theme: expectedTheme,
                    viewBackgroundColor: expectedBg,
                }
            });
        }
    }, [excalidrawAPI, resolvedTheme]);

    // Save to parent (Debounced)
    const debouncedSave = useCallback(
        debounce((elements, appState, files) => {
            if (!onSave) return;

            const payload = createPayload(elements, appState, files, resolvedTheme || 'light');
            const json = JSON.stringify(payload);

            if (json !== lastSavedData.current) {
                console.log("[WhiteboardModule] Saving changes... (Diff detected)");
                lastSavedData.current = json;
                onSave(payload);
            }
        }, 1000),
        [onSave, createPayload, resolvedTheme]
    );

    if (!mounted) return null;

    return (
        <div className="h-full flex flex-col border-l border-border relative">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border z-10">
                <span className="text-sm font-medium flex items-center gap-2">
                    <Icon name="PenTool" size={14} />
                    Architecture Diagram
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-2">
                    {onSave && <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" title="Auto-saving enabled" />}
                    Auto-saved
                </span>
            </div>

            <div className="flex-1 relative flex overflow-hidden">
                <div
                    className="flex-1 h-full w-full excalidraw-container relative"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (!excalidrawAPI) return;

                        console.log("[WhiteboardModule] Drop detected");
                        try {
                            const data = e.dataTransfer.getData('application/json');
                            if (!data) {
                                console.warn("[WhiteboardModule] No data in drop event");
                                return;
                            }

                            const item = JSON.parse(data);
                            console.log("[WhiteboardModule] Parse drop item:", item?.label);

                            if (item && item.label && item.defaultProps) {
                                // Calculate scene coordinates
                                const container = e.currentTarget.getBoundingClientRect();

                                // Use managed ref for reliable state
                                const appState = appStateRef.current || excalidrawAPI.getAppState();

                                const zoom = appState.zoom;
                                const zoomValue = typeof zoom === 'number' ? zoom : (zoom?.value || 1);
                                const scrollX = appState.scrollX || 0;
                                const scrollY = appState.scrollY || 0;

                                const sceneX = (e.clientX - container.left) / zoomValue - scrollX;
                                const sceneY = (e.clientY - container.top) / zoomValue - scrollY;

                                // Center the item
                                const finalX = sceneX - (item.defaultProps.w / 2);
                                const finalY = sceneY - (item.defaultProps.h / 2);

                                if (!isNaN(finalX) && !isNaN(finalY)) {
                                    insertLibraryItem(excalidrawAPI, item, { x: finalX, y: finalY });
                                } else {
                                    console.error("[WhiteboardModule] Coordinate calculation resulted in NaN.");
                                }
                            } else {
                                console.warn("[WhiteboardModule] Invalid item structure");
                            }
                        } catch (error) {
                            console.error("[WhiteboardModule] Failed to drop item:", error);
                        }
                    }}
                >
                    <Excalidraw
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                        initialData={{
                            appState: {
                                viewBackgroundColor: '#ffffff',
                                currentItemFontFamily: 1,
                            },
                            scrollToContent: true,
                        }}
                        onChange={(elements, appState, files) => {
                            // Update ref with latest valid state
                            if (appState) {
                                appStateRef.current = appState;
                            }

                            if (isInitialized) {
                                debouncedSave(elements, appState, files);
                            }
                        }}
                    >
                    </Excalidraw>
                </div>

                {/* Component Library Panel - Right Sidebar */}
                <ComponentLibrary excalidrawAPI={excalidrawAPI} />
            </div>

            <style>{`
                .excalidraw-container .excalidraw {
                    height: 100% !important;
                }
            `}
            </style>
        </div>
    );
};
