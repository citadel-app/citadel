import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism as prismLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidRenderer } from './MermaidRenderer';
;
import { useTheme } from 'next-themes';

export const MarkdownViewer = memo(({ content, urlTransform }: { content: string; urlTransform?: (uri: string) => string }) => {
    const transformUrl = (uri: string) => {
        if (urlTransform) {
            return urlTransform(uri);
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
                            // The original code had a comment about using a hook for proper React reactivity.
                            // The CodeBlock component below already uses `useTheme` for this purpose.
                            // The provided change snippet seems to be a partial or malformed edit.
                            // Assuming the intent was to remove the old theme detection logic and rely on CodeBlock.
                            return (
                                <CodeBlock language={language} {...rest}>{String(children).replace(/\n$/, '')}</CodeBlock>
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

const CodeBlock = ({ language, children, ...rest }: { language: string; children: string;[key: string]: any }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <div className={cn(
            "rounded-lg overflow-hidden my-4 border shadow-sm transition-colors duration-300",
            isDark ? "border-border bg-[#1e1e1e]" : "border-border/50 bg-[#f6f8fa]"
        )}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{language}</span>
            </div>
            <SyntaxHighlighter
                style={(isDark ? vscDarkPlus : prismLight) as any}
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
                {children}
            </SyntaxHighlighter>
        </div>
    );
};
