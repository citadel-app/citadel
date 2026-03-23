import { Tldraw, useEditor, Editor, DefaultFontStyle, DefaultColorStyle, DefaultSizeStyle, DefaultDashStyle, DefaultFillStyle } from 'tldraw'
import 'tldraw/tldraw.css'
import { ArchitectureShapeUtil, ArchitectureShapeAlignStyle, ArchitectureShapeBorderStyle } from '../shapes/ArchitectureShape'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
const customShapeUtils = [ArchitectureShapeUtil]

function ThemeSync() {
    const { theme } = useTheme()
    const editor = useEditor()

    useEffect(() => {
        editor.user.updateUserPreferences({
            colorScheme: theme === 'dark' ? 'dark' : 'light'
        })
    }, [editor, theme])

    return null
}

export const TldrawWrapper = ({ 
    className, 
    onMount, 
    persistenceKey,
    renderOverlay
}: { 
    className?: string; 
    onMount?: (editor: Editor) => void; 
    persistenceKey?: string;
    renderOverlay?: (editor: Editor | null) => React.ReactNode;
}) => {
    // eslint-disable-next-line
    const [editor, setEditor] = useState<Editor | null>(null)

    // Manual Drag and Drop Handler
    // Using capture phase to ensure we get the event before Tldraw swallows it
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const data = e.dataTransfer.getData('application/x-tldraw-component');

        if (!data || !editor) {
            return;
        }

        try {
            const item = JSON.parse(data);
            const point = editor.screenToPage({ x: e.clientX, y: e.clientY });

            editor.createShape({
                type: 'architecture-component',
                x: point.x - (item.defaultProps.w / 2),
                y: point.y - (item.defaultProps.h / 2),
                props: {
                    ...item.defaultProps
                }
            } as any)
        } catch (err) {
            console.error("Failed to drop component", err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const overrides: any = {
        stylePanel: (styles: any) => {
            // styles is an array of groups in recent Tldraw versions
            // Tldraw can pass a Map or an Array depending on use case.
            const newStyles = new Map(styles instanceof Map ? styles : Object.entries(styles));

            const architectureGroup = {
                id: 'architecture_group',
                type: 'group',
                label: 'Architecture',
                children: [
                    {
                        id: 'style-prop-color',
                        type: 'style',
                        style: DefaultColorStyle,
                    },
                    {
                        id: 'style-prop-fill',
                        type: 'style',
                        style: DefaultFillStyle,
                    },
                    {
                        id: 'style-prop-dash',
                        type: 'style',
                        style: DefaultDashStyle,
                    },
                    {
                        id: 'style-prop-font',
                        type: 'style',
                        style: DefaultFontStyle,
                    },
                    {
                        id: 'style-prop-size',
                        type: 'style',
                        style: DefaultSizeStyle,
                    },
                    {
                        id: 'style-prop-align',
                        type: 'style',
                        style: ArchitectureShapeAlignStyle,
                    },
                    {
                        id: 'style-prop-border',
                        type: 'style',
                        style: ArchitectureShapeBorderStyle,
                    }
                ]
            };

            newStyles.set('architecture_group', architectureGroup);

            if (Array.isArray(styles)) {
                return [architectureGroup, ...styles];
            }

            if (styles instanceof Map) {
                return newStyles;
            }

            return [architectureGroup, ...Object.values(styles || {})];
        },
    };

    return (
        <div
            className={`tldraw__editor w-full h-full relative ${className}`}
            onDropCapture={handleDrop}
            onDragOverCapture={handleDragOver}
        >
            <Tldraw
                shapeUtils={customShapeUtils}
                inferDarkMode={false}
                onMount={(editor) => {
                    setEditor(editor);
                    onMount?.(editor);
                }}
                overrides={overrides}
            >
                <ThemeSync />
            </Tldraw>

            {/* Custom Overlay rendered outside Tldraw context to avoid interaction issues */}
            {renderOverlay && renderOverlay(editor)}
        </div>
    )
}
