/**
 * Inline Excalidraw Section Editor.
 * Registered via registerSectionEditor('whiteboard') in ExcalidrawModule.
 * Renders an Excalidraw canvas for ```excalidraw content blocks.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Excalidraw } from "@excalidraw/excalidraw";
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTheme } from 'next-themes';
import { debounce } from 'lodash';

interface SectionEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

export const ExcalidrawEditor = ({ content, onChange, editable = true }: SectionEditorProps) => {
    const { resolvedTheme } = useTheme();
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [initialData, setInitialData] = useState<any>(null);
    const lastSavedData = useRef<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleToggleFullscreen = () => {
        if (excalidrawAPI) {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const files = excalidrawAPI.getFiles();

            setInitialData({
                elements,
                appState: {
                    theme: appState.theme,
                    viewBackgroundColor: '#ffffff',
                    currentItemFontFamily: appState.currentItemFontFamily || 1,
                },
                files
            });
        }
        setIsFullscreen(!isFullscreen);
    };

    // Escape listener for Fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                handleToggleFullscreen();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Load Data
    useEffect(() => {
        const match = content.match(/^```excalidraw\n([\s\S]*?)```$/);
        if (match && match[1]) {
            try {
                const data = JSON.parse(match[1]);
                const payload = {
                    elements: data.elements || [],
                    appState: {
                        ...(data.appState || {}),
                        viewBackgroundColor: '#ffffff'
                    },
                    files: data.files || null
                };
                setInitialData(payload);
                lastSavedData.current = JSON.stringify(payload);
            } catch (e) {
                console.error("Failed to parse section whiteboard data", e);
            }
        }
    }, [content]);

    const debouncedSave = useCallback(
        debounce((elements, appState, files) => {
            const payload = {
                elements,
                appState: {
                    theme: appState.theme,
                    viewBackgroundColor: '#ffffff',
                    currentItemFontFamily: appState.currentItemFontFamily || 1,
                },
                files
            };
            const jsonStr = JSON.stringify(payload);
            if (jsonStr !== lastSavedData.current) {
                lastSavedData.current = jsonStr;
                onChange(`\`\`\`excalidraw\n${jsonStr}\n\`\`\``);
            }
        }, 1000),
        [onChange]
    );

    if (!editable && (!initialData || !initialData.elements || initialData.elements.length === 0)) {
        return <div className="p-4 text-center italic text-muted-foreground bg-muted/20 rounded-md border border-dashed">Empty Diagram</div>;
    }

    const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

    const contentWrapper = (
        <div className={cn(
            "relative w-full overflow-hidden bg-background group/wb",
            isFullscreen ? "fixed inset-0 z-[99999] rounded-none h-screen w-screen flex flex-col pt-12" : "rounded-md border",
            !isFullscreen && (editable ? "h-[500px] shadow-sm" : "h-[400px] pointer-events-none")
        )}>
            {isFullscreen && (
                <div className="absolute top-0 left-0 right-0 h-12 bg-background border-b z-40 flex items-center px-4 justify-between shadow-sm">
                    <span className="font-semibold text-sm">Whiteboard Editor</span>
                    <button
                        onClick={handleToggleFullscreen}
                        className="p-1.5 px-3 bg-muted hover:bg-muted/80 rounded border text-xs cursor-pointer flex items-center gap-2 pointer-events-auto transition-colors"
                    >
                        Exit Fullscreen (Esc)
                    </button>
                </div>
            )}

            {!isFullscreen && (editable || isFullscreen) && (
                <button
                    onClick={handleToggleFullscreen}
                    className="absolute top-4 right-4 z-40 p-1.5 px-3 bg-background/80 hover:bg-background rounded-md shadow backdrop-blur-sm border opacity-0 group-hover/wb:opacity-100 transition-opacity flex items-center gap-2 text-xs font-semibold cursor-pointer pointer-events-auto text-foreground"
                >
                    Fullscreen
                </button>
            )}

            {!editable && !isFullscreen && <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />}
            <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                initialData={initialData || undefined}
                viewModeEnabled={!editable}
                zenModeEnabled={!editable && !isFullscreen}
                gridModeEnabled={false}
                onChange={(elements, appState, files) => {
                    if (editable) {
                        debouncedSave(elements, appState, files);
                    }
                }}
            />
        </div>
    );

    if (isFullscreen) {
        return createPortal(contentWrapper, document.body);
    }

    return contentWrapper;
};
