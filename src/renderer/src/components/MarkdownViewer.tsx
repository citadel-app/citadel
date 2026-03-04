import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidRenderer } from './MermaidRenderer';
import { cn } from '../lib/utils';

export const MarkdownViewer = memo(({ content, filePath }: { content: string; filePath?: string }) => {
    const transformUrl = (uri: string) => {
        if (!uri) return uri;
        if (uri.startsWith('http') || uri.startsWith('codex://') || uri.startsWith('data:')) {
            return uri;
        }

        // 1. Handle pre-existing Windows absolute paths
        const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(uri);
        if (isWindowsPath) {
            return `codex:///${uri.replace(/\\/g, '/')}`;
        }

        // 2. Handle relative paths and local file paths
        if (filePath && (uri.startsWith('./') || uri.startsWith('../') || !uri.startsWith('/'))) {
            try {
                // Normalize filePath to use forward slashes for cross-platform consistency
                const normalizedFilePath = filePath.replace(/\\/g, '/');
                const lastSlashIndex = normalizedFilePath.lastIndexOf('/');

                // Get the directory of the markdown file
                const dirPath = lastSlashIndex !== -1 ? normalizedFilePath.substring(0, lastSlashIndex) : '';

                // Remove leading ./ for cleaner path construction
                let cleanUri = uri.replace(/^(\.\/)/, '');

                // Use triple slash for codex:/// to ensure everything after is treated as path by the app protocol
                const finalPath = dirPath ? `${dirPath}/${cleanUri}` : cleanUri;
                return `codex:///${finalPath}`;
            } catch (e) {
                console.error('[MarkdownViewer] Error resolving image path:', e);
                return uri;
            }
        }
        return uri;
    };

    if (!content || content.trim().length === 0) return null;

    return (
        <div className="prose dark:prose-invert max-w-none p-4">
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                urlTransform={transformUrl}
                components={{
                    code(props) {
                        const { children, className, node, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';

                        if (language === 'mermaid') {
                            return (
                                <div className="my-4 bg-muted/20 rounded-lg p-4 border border-border">
                                    <MermaidRenderer content={String(children).replace(/\n$/, '')} />
                                </div>
                            );
                        }

                        if (language) {
                            const SyntaxHighlighterAny = SyntaxHighlighter as any;
                            return (
                                <div className="rounded-lg overflow-hidden my-4 border border-border shadow-sm">
                                    <SyntaxHighlighterAny
                                        style={vscDarkPlus as any}
                                        language={language}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            padding: '1rem',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'transparent'
                                        }}
                                        {...rest}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighterAny>
                                </div>
                            );
                        }

                        return (
                            <code className={cn("px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm", className)} {...rest}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});
