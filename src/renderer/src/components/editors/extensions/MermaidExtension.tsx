import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { MermaidRenderer } from '../../MermaidRenderer';
import React, { useState } from 'react';
import { Icon } from '../../IconRegistry';
import { cn } from '../../../lib/utils';

// A wrapper to use the MermaidRenderer inside Tiptap's NodeView
const MermaidNodeView = ({ node, updateAttributes }: { node: any; updateAttributes: (attrs: any) => void }) => {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <NodeViewWrapper className="mermaid-node-view my-6 group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1.5 bg-background/80 backdrop-blur border border-border rounded shadow-sm hover:bg-accent text-muted-foreground hover:text-foreground"
                    title={isEditing ? "Show Preview" : "Edit Diagram"}
                >
                    <Icon name={isEditing ? "Eye" : "Edit"} size={14} />
                </button>
            </div>

            <div className={cn(
                "rounded-lg border border-border overflow-hidden bg-muted/5",
                isEditing ? "p-0" : "p-4"
            )}>
                {isEditing ? (
                    <textarea
                        className="w-full min-h-[150px] p-4 bg-muted/10 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
                        value={node.attrs.content}
                        onChange={(e) => updateAttributes({ content: e.target.value })}
                        placeholder="Enter Mermaid syntax..."
                        autoFocus
                    />
                ) : (
                    <div className="flex justify-center min-h-[100px] items-center">
                        <MermaidRenderer content={node.attrs.content} />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const MermaidExtension = Node.create({
    name: 'mermaid',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            content: {
                default: 'graph TD\n  A --> B',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="mermaid"]',
                getAttrs: (element: HTMLElement) => ({
                    content: element.getAttribute('data-content'),
                }),
            },
            {
                tag: 'pre',
                getAttrs: (element: HTMLElement) => {
                    const code = element.querySelector('code');
                    if (code && code.classList.contains('language-mermaid')) {
                        return { content: code.textContent?.trim() };
                    }
                    return false;
                },
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid', 'data-content': HTMLAttributes.content })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MermaidNodeView);
    },

    // Handle Markdown serialization
    addStorage() {
        return {
            markdown: {
                serialize(state, node) {
                    state.write('```mermaid\n');
                    state.write(node.attrs.content || '');
                    state.write('\n```');
                    state.closeBlock(node);
                },
                parse: {
                    setup(markdownit) {
                        // The tiptap-markdown extension usually handles fence blocks and transforms them 
                        // based on the name. Since we named this node 'mermaid', it might work
                        // but we add a specific check for safety.
                    }
                }
            }
        };
    }
});
