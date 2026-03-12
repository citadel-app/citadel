/**
 * Extraction service types
 */
export interface TextChunk {
    id: string;
    text: string;
    sourceType: 'pdf' | 'webview' | 'sections' | 'metadata';
    chunkIndex: number;
}

export interface ExtractionResult {
    entryId: string;
    chunks: TextChunk[];
    totalChars: number;
}

export interface ExtractionConfig {
    chunkSize?: number;      // characters per chunk (default: 1000)
    chunkOverlap?: number;   // overlap between chunks (default: 100)
    indexPdf?: boolean;      // whether to index PDF content (default: true)
    indexUrl?: boolean;      // whether to index URL/webview content (default: true)
    indexMarkdown?: boolean; // whether to index markdown content (default: true)
}
