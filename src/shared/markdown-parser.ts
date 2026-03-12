export interface MarkdownSection {
    id: string;
    rawContent: string; // The full content of the block (excluding ---)
    header?: string;    // Extracted Header (e.g. "## Abstract")
    title?: string;     // Clean title (e.g. "Abstract")
    body: string;       // Content without the extracted header
}

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
    if (!markdown) return [];

    // Split by horizontal rule surrounded by newlines
    const rawSections = markdown.split(/\n---\n/);
    
    return rawSections.map((raw, index) => {
        const trimmed = raw.trim();
        // Try to extract the first header
        const headerMatch = trimmed.match(/^(#+)\s+(.+)$/m);
        
        let header: string | undefined = undefined;
        let title: string | undefined = undefined;
        let body = trimmed;

        if (headerMatch && trimmed.startsWith(headerMatch[0])) {
             header = headerMatch[0];
             title = headerMatch[2].trim();
             // Remove the header from body
             body = trimmed.slice(headerMatch[0].length).trim();
        }

        const sectionId = title 
            ? `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            : `section-${index}`;

        return {
            id: sectionId,
            rawContent: trimmed,
            header,
            title,
            body
        };
    });
}
