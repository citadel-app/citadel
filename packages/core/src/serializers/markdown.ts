import matter from 'gray-matter';
import { parseMarkdownSections } from '../markdown-parser';
import { EntrySerializer, EntryData, EntrySection } from '../serializers-types';

export class StandardMarkdownSerializer implements EntrySerializer {
    deserialize(rawContent: string): EntryData {
        let data = {};
        let content = rawContent;
        try {
            const result = matter(rawContent);
            data = result.data;
            content = result.content;
        } catch (e) {
            console.error('Error parsing frontmatter in markdown-serializer:', e);
        }
        const parsedSections = parseMarkdownSections(content);
        
        // Map MarkdownSection to EntrySection
        const sections: EntrySection[] = parsedSections.map(s => ({
            id: s.id,
            title: s.title,
            content: s.body, // In generic terms, the 'body' is the editable content
            rawContent: s.rawContent
        }));

        return {
            frontmatter: data,
            content: content,
            sections: sections
        };
    }

    serialize(data: EntryData): string {
        // Reconstruct the body from sections
        const body = data.sections.map(s => s.rawContent).join('\n\n---\n\n');
        
        const safeData = JSON.parse(JSON.stringify(data.frontmatter));
        return matter.stringify(body, safeData);
    }
}
