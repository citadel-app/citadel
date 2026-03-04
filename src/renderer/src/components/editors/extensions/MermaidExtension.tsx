import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidRenderer } from '../../MermaidRenderer';
import React from 'react';

// A wrapper to use the MermaidRenderer inside Tiptap's NodeView
const MermaidNodeView = ({ node }: { node: any }) => {
    return (
        <div className="my-4 bg-muted/20 rounded-lg p-4 border border-border">
            <MermaidRenderer content={node.attrs.content} />
        </div>
    );
};

export const MermaidExtension = Node.create({
    name: 'mermaid',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            content: {
                default: 'graph TD; A-->B;',
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
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })];
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
                        // We use the existing fence rule but we need to recognize 'mermaid'
                        // This might already be handled if we use tiptap-markdown 
                        // correctly, but we can also add a specific rule.
                    }
                }
            }
        };
    }
});
