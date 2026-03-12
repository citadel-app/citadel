import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { MermaidExtension } from './extensions/MermaidExtension';
import 'katex/dist/katex.min.css';
import { cn } from '../../lib/utils';
import { Icon } from '../../components/IconRegistry';
import { dataManager } from '../../lib/data-manager';

// Initialize Lowlight
const lowlight = createLowlight(all);

// Custom BlockMath extension with Markdown storage
const CustomBlockMath = BlockMath.extend({
    addStorage() {
        return {
            markdown: {
                serialize(state, node) {
                    const latex = node.attrs.latex || '';
                    state.write('$$\n');
                    state.write(latex);
                    state.write('\n$$');
                    state.closeBlock(node);
                },
                parse: {
                    setup(markdownit) {
                        // Block Math Rule ($$ ... $$)
                        markdownit.block.ruler.before('fence', 'blockMath', (state, startLine, endLine, silent) => {
                            const marker = '$$';
                            const pos = state.bMarks[startLine] + state.tShift[startLine];
                            const max = state.eMarks[startLine];

                            if (pos + 2 > max) return false;
                            if (state.src.slice(pos, pos + 2) !== marker) return false;

                            if (silent) return true;

                            let nextLine = startLine;
                            let found = false;
                            let content = '';

                            // Search for end marker
                            while (nextLine < endLine) {
                                nextLine++;
                                const nextPos = state.bMarks[nextLine] + state.tShift[nextLine];
                                // const nextMax = state.eMarks[nextLine];

                                if (state.src.slice(nextPos, nextPos + 2) === marker) {
                                    found = true;
                                    content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false).trim();
                                    break;
                                }
                            }

                            // Fallback for single line $$ ... $$
                            if (!found) {
                                const lineText = state.src.slice(pos, max);
                                if (lineText.slice(-2) === marker && lineText.length > 2) {
                                    found = true;
                                    content = lineText.slice(2, -2).trim();
                                    nextLine = startLine + 1;
                                }
                            }

                            if (!found) return false;

                            state.line = nextLine + 1;

                            const token = state.push('blockMath', 'div', 0);
                            token.markup = marker;
                            token.content = content;

                            return true;
                        });

                        markdownit.renderer.rules.blockMath = (tokens, idx) => {
                            const content = tokens[idx].content;
                            return `<div data-type="block-math" data-latex="${markdownit.utils.escapeHtml(content)}"></div>`;
                        };
                    }
                }
            }
        }
    }
});

// Custom InlineMath extension with Markdown storage
const CustomInlineMath = InlineMath.extend({
    addStorage() {
        return {
            markdown: {
                serialize(state, node) {
                    const latex = node.attrs.latex || '';
                    state.write('$');
                    state.write(latex);
                    state.write('$');
                },
                parse: {
                    setup(markdownit) {
                        // Inline Math Rule ($ ... $)
                        markdownit.inline.ruler.push('inlineMath', (state, silent) => {
                            const marker = '$';
                            const pos = state.pos;
                            if (state.src.charCodeAt(pos) !== 0x24 /* $ */) return false;

                            // Ignore $$
                            if (state.src.charCodeAt(pos + 1) === 0x24) return false;

                            const start = pos + 1;
                            const match = state.src.slice(start).indexOf(marker);
                            if (match === -1) return false;

                            if (silent) return true;

                            const content = state.src.slice(start, start + match);
                            state.pos = start + match + 1;

                            const token = state.push('inlineMath', 'span', 0);
                            token.markup = marker;
                            token.content = content;

                            return true;
                        });

                        markdownit.renderer.rules.inlineMath = (tokens, idx) => {
                            const content = tokens[idx].content;
                            return `<span data-type="inline-math" data-latex="${markdownit.utils.escapeHtml(content)}"></span>`;
                        };
                    }
                }
            }
        }
    }
});

export interface TiptapWrapperProps {
    content?: string;
    onChange?: (content: string) => void;
    className?: string;
    editable?: boolean;
    entryId?: string; // Required for Image Uploads
    basePath?: string; // Required for Image Resolution
}

const MenuButton = ({
    isActive,
    onClick,
    icon,
    title,
    disabled = false
}: {
    isActive?: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    disabled?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground",
            isActive && "bg-primary/20 text-primary",
            disabled && "opacity-50 cursor-not-allowed"
        )}
    >
        <Icon name={icon} size={16} />
    </button>
);

export const TiptapWrapper = ({ content, onChange, className, editable = true, entryId, basePath }: TiptapWrapperProps) => {
    const editor = useEditor({
        editable,
        extensions: [
            StarterKit.configure({
                codeBlock: false, // Usage of Lowlight instead
                horizontalRule: false,
            }),
            Markdown.configure({
                transformPastedText: true,
                transformCopiedText: true,
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            CustomBlockMath,
            CustomInlineMath,
            Image.configure({
                inline: true,
                allowBase64: true, // Fallback
            }).extend({
                renderHTML({ HTMLAttributes }) {
                    // Try to resolve src if relative
                    let src = HTMLAttributes.src;
                    if (src && src.startsWith('./assets/') && basePath) {
                        const normalizedFilePath = basePath.replace(/\\/g, '/');
                        const parentDir = normalizedFilePath.substring(0, normalizedFilePath.lastIndexOf('/'));
                        const assetPath = `${parentDir}${src.substring(1)}`;
                        src = `codex:///${assetPath}`;
                    }
                    return ['img', { ...HTMLAttributes, src }];
                }
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            MermaidExtension,
            BubbleMenuExtension,
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            const storage = editor.storage as any;
            if (storage.markdown) {
                // Use a small debounce to prevent excessive parent state updates
                const timeoutId = (editor as any)._saveTimeout;
                if (timeoutId) clearTimeout(timeoutId);
                (editor as any)._saveTimeout = setTimeout(() => {
                    onChange?.(storage.markdown.getMarkdown());
                }, 100);
            }
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert focus:outline-none max-w-none p-4 min-h-[100px]',
            },
            handlePaste: (view: any, event: any, _slice: any) => {
                const items = Array.from(event.clipboardData?.items || []) as DataTransferItem[];
                const images = items.filter(item => item.type.indexOf('image') === 0);

                if (images.length > 0 && entryId) {
                    event.preventDefault(); // Prevent default paste behavior

                    images.forEach(async (item) => {
                        const file = item.getAsFile();
                        if (file) {
                            try {
                                // Show some loading state? For now, simple optimistic or await.
                                const relativePath = await dataManager.saveAsset(entryId, file);

                                // Insert Image
                                // We use the ProseMirror view directly to dispatch the transaction
                                const { schema } = view.state;

                                // Insert at cursor
                                const transaction = view.state.tr.replaceSelectionWith(
                                    schema.nodes.image.create({
                                        src: relativePath,
                                        alt: file.name
                                    })
                                );
                                view.dispatch(transaction);

                            } catch (error) {
                                console.error("Failed to upload image", error);
                            }
                        }
                    });
                    return true; // We handled it
                }
                return false;
            }
        }
    });

    // Toggle Editable
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    // Content Sync
    useEffect(() => {
        if (editor && content !== undefined) {
            // Only update if content is significantly different to avoid cursor jumps
            const currentMarkdown = (editor.storage as any).markdown?.getMarkdown();
            // Simple check to avoid loop, but allows external updates
            if (currentMarkdown !== content) {
                // Check if focused to avoid disruption? 
                // For now, trust the parent only updates us on non-typing events usually.
                if (!editor.isFocused) {
                    editor.commands.setContent(content);
                }
            }
        }
    }, [content, editor]);

    if (!editor) return null;

    const insertAlert = (type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION') => {
        const alertPrefix = ` [!${type}]`;
        editor.chain().focus().setBlockquote().insertContent(alertPrefix).run();
    };

    return (
        <div className={cn("border rounded-md overflow-hidden bg-background flex flex-col", className)}>
            {/* Toolbar - Only show if editable */}
            {editable && (
                <div className="bg-muted/30 p-2 border-b border-border flex flex-wrap gap-1 items-center sticky top-0 z-10 backdrop-blur-sm">
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        icon="Bold"
                        title="Bold"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        icon="Italic"
                        title="Italic"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        icon="Strikethrough"
                        title="Strikethrough"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        isActive={editor.isActive('code')}
                        icon="Code"
                        title="Inline Code"
                    />

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        isActive={editor.isActive('heading', { level: 1 })}
                        icon="Heading1"
                        title="H1"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading', { level: 2 })}
                        icon="Heading2"
                        title="H2"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        isActive={editor.isActive('heading', { level: 3 })}
                        icon="Heading3"
                        title="H3"
                    />

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        icon="List"
                        title="Bullet List"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        icon="ListOrdered"
                        title="Ordered List"
                    />

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive('blockquote')}
                        icon="Quote"
                        title="Blockquote"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        isActive={editor.isActive('codeBlock')}
                        icon="TerminalSquare"
                        title="Code Block"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().insertContent({ type: 'mermaid' }).run()}
                        isActive={editor.isActive('mermaid')}
                        icon="GitGraph"
                        title="Insert Mermaid Diagram"
                    />

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    {/* Alerts */}
                    <MenuButton onClick={() => insertAlert('NOTE')} icon="Info" title="Insert Note" />
                    <MenuButton onClick={() => insertAlert('WARNING')} icon="AlertTriangle" title="Insert Warning" />
                    <MenuButton onClick={() => insertAlert('IMPORTANT')} icon="AlertCircle" title="Insert Important" />

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    {/* Math */}
                    <MenuButton
                        onClick={() => {
                            const { from, to } = editor.state.selection;
                            const text = editor.state.doc.textBetween(from, to);
                            if (!text) {
                                editor.chain().focus().insertContent('$x^2$').run();
                            } else {
                                editor.chain().focus().insertContent(`$${text}$`).run();
                            }
                        }}
                        icon="Sigma"
                        title="Insert Math (LaTeX)"
                    />

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    {/* Tables */}
                    <MenuButton
                        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        icon="Grid2x2"
                        title="Insert Table"
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        icon="BetweenVerticalStart"
                        title="Add Column After"
                        disabled={!editor.isActive('table')}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        icon="BetweenHorizontalStart"
                        title="Add Row After"
                        disabled={!editor.isActive('table')}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        icon="Trash2"
                        title="Delete Table"
                        disabled={!editor.isActive('table')}
                        isActive={false}
                    />
                </div>
            )}

            <BubbleMenu editor={editor} updateDelay={100} className="flex bg-background border border-border shadow-xl rounded-lg p-1 gap-1 overflow-hidden z-[100]">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon="Bold"
                    title="Bold"
                />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon="Italic"
                    title="Italic"
                />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    icon="Strikethrough"
                    title="Strikethrough"
                />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    icon="Code"
                    title="Inline Code"
                />
                <div className="w-[1px] h-4 bg-border mx-1" />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon="Heading1"
                    title="H1"
                />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon="Heading2"
                    title="H2"
                />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    icon="Quote"
                    title="Blockquote"
                />
                <div className="w-[1px] h-4 bg-border mx-1" />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    icon="TerminalSquare"
                    title="Code Block"
                />
                <MenuButton
                    onClick={() => {
                        const { from, to } = editor.state.selection;
                        const text = editor.state.doc.textBetween(from, to, ' ');
                        if (!text) {
                            editor.chain().focus().insertContent('$x^2$').run();
                        } else {
                            editor.chain().focus().insertContent(`$${text}$`).run();
                        }
                    }}
                    icon="Sigma"
                    title="Math (LaTeX)"
                />
            </BubbleMenu>

            <EditorContent editor={editor} className="flex-1 overflow-auto bg-background" />
        </div>
    );
};
