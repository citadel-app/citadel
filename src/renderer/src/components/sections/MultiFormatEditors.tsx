import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MonacoWrapper } from '../editors/MonacoWrapper';
import { TiptapWrapper } from '../editors/TiptapWrapper';
import { Excalidraw } from "@excalidraw/excalidraw";
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTheme } from 'next-themes';
import { debounce } from 'lodash';
import { cn } from '../../lib/utils';
import { MarkdownViewer } from '../MarkdownViewer';
import { Icon } from '../IconRegistry';

// -- Interfaces --
interface SectionEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
    entryId?: string;
    basePath?: string;
}

// ----------------------------------------------------------------------------
// Code Section Editor
// ----------------------------------------------------------------------------
export const CodeSectionEditor = ({ content, onChange, editable = true }: SectionEditorProps) => {
    // Determine initial language and code from content (```lang ... ```)
    const [language, setLanguage] = useState<string>('javascript');
    const [code, setCode] = useState<string>('');

    useEffect(() => {
        // Parse the markdown string ensuring we get the contents safely
        const match = content.match(/^```(\w+)?\n([\s\S]*?)```$/);
        if (match) {
            setLanguage(match[1] || 'javascript');
            setCode(match[2] || '');
        } else {
            // Not enclosed in a code block
            setCode(content);
        }
    }, [content]);

    const handleCodeChange = (newCode: string | undefined) => {
        const val = newCode || '';
        setCode(val);
        // Serialize back to markdown
        onChange(`\`\`\`${language}\n${val}\n\`\`\``);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        onChange(`\`\`\`${newLang}\n${code}\n\`\`\``);
    };

    if (!editable) {
        return <MarkdownViewer content={content} />;
    }

    return (
        <div className="flex flex-col border rounded-md shadow-sm overflow-hidden min-h-[200px]">
            <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Code Snippet</span>
                <select
                    value={language}
                    onChange={handleLanguageChange}
                    className="bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary"
                >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </select>
            </div>
            <div className="flex-1 min-h-[300px] relative">
                <MonacoWrapper
                    language={language}
                    value={code}
                    onChange={handleCodeChange}
                    options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 }
                    }}
                    className="absolute inset-0"
                />
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------------
// List Section Editor
// ----------------------------------------------------------------------------
// List sections just use Tiptap but visually look like a standard note
export const ListSectionEditor = ({ content, onChange, editable = true, entryId, basePath }: SectionEditorProps) => {
    // For lists, we just use the TiptapWrapper. It naturally serializes to markdown bullets.
    if (!editable) {
        return <MarkdownViewer content={content} filePath={basePath} />;
    }

    return (
        <TiptapWrapper
            content={content}
            onChange={onChange}
            editable={editable}
            entryId={entryId}
            basePath={basePath}
            className="border rounded-md shadow-sm min-h-[150px]"
        />
    );
};

// ----------------------------------------------------------------------------
// Whiteboard Section Editor
// ----------------------------------------------------------------------------
export const WhiteboardSectionEditor = ({ content, onChange, editable = true }: SectionEditorProps) => {
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

            // Sync initialData so the remount uses the exact current state
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
        // Parse the payload from ` ```excalidraw\n{}\n``` `
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
    }, [content]); // Re-parse if content comes externally

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

    // If read-only and no data, show a placeholder
    if (!editable && (!initialData || !initialData.elements || initialData.elements.length === 0)) {
        return <div className="p-4 text-center italic text-muted-foreground bg-muted/20 rounded-md border border-dashed">Empty Diagram</div>;
    }

    // The wrapper content
    const contentWrapper = (
        <div className={cn(
            "relative w-full overflow-hidden bg-background group/wb",
            isFullscreen ? "fixed inset-0 z-[99999] rounded-none h-screen w-screen flex flex-col pt-12" : "rounded-md border",
            !isFullscreen && (editable ? "h-[500px] shadow-sm" : "h-[400px] pointer-events-none")
        )}>
            {/* Overlay if max */}
            {isFullscreen && (
                <div className="absolute top-0 left-0 right-0 h-12 bg-background border-b z-40 flex items-center px-4 justify-between shadow-sm">
                    <span className="font-semibold text-sm">Whiteboard Editor</span>
                    <button
                        onClick={handleToggleFullscreen}
                        className="p-1.5 px-3 bg-muted hover:bg-muted/80 rounded border text-xs cursor-pointer flex items-center gap-2 pointer-events-auto transition-colors"
                    >
                        <Icon name="Minimize" size={14} /> Exit Fullscreen (Esc)
                    </button>
                </div>
            )}

            {!isFullscreen && (editable || isFullscreen) && (
                <button
                    onClick={handleToggleFullscreen}
                    className="absolute top-4 right-4 z-40 p-1.5 px-3 bg-background/80 hover:bg-background rounded-md shadow backdrop-blur-sm border opacity-0 group-hover/wb:opacity-100 transition-opacity flex items-center gap-2 text-xs font-semibold cursor-pointer pointer-events-auto text-foreground"
                >
                    <Icon name="Maximize" size={14} />
                    Fullscreen
                </button>
            )}

            {!editable && !isFullscreen && <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />} {/* Shield layer for read-only */}
            <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                initialData={initialData || undefined}
                viewModeEnabled={!editable}
                zenModeEnabled={!editable && !isFullscreen} // Allow zooming if fullscreen
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
