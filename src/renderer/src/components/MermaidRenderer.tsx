import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

// Initialize mermaid with default config
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
});

interface MermaidRendererProps {
    content: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ content }) => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!content) return;
            try {
                setError(null);
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                // Re-initialize for theme if needed
                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme === 'dark' ? 'dark' : 'default',
                    securityLevel: 'loose',
                });

                const { svg: renderedSvg } = await mermaid.render(id, content);
                setSvg(renderedSvg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError('Failed to render diagram. Please check your syntax.');
            }
        };

        renderDiagram();
    }, [content, theme]);

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive text-sm font-mono">
                {error}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="flex justify-center w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};
