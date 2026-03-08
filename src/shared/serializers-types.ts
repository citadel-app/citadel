export interface EntrySection {
    id: string;
    title?: string;
    content: string; // The specific content for this section
    rawContent: string; // The raw content including any headers/metadata specific to the section format
}

export interface EntryData {
    frontmatter: Record<string, any>;
    content: string; // The full raw body content
    sections: EntrySection[];
}

export interface EntrySerializer {
    deserialize(rawContent: string): EntryData;
    serialize(data: EntryData): string;
}
