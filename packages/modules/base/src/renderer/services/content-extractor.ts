/**
 * Content Extractor Service
 * Extracts text from various content sources for RAG indexing.
 */

import type { CodexEntry } from '../lib/db';
import type { EntryTypeConfig } from '@citadel-app/core';
import { hostApi as __hostApi } from '../host-services';

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

/**
 * Split text into chunks of approximately maxTokens tokens.
 * Uses simple sentence-based splitting with overlap.
 */
export function chunkText(
    text: string,
    maxTokens: number = 500,
    overlap: number = 50
): string[] {
    // Rough approximation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    const overlapChars = overlap * 4;

    if (text.length <= maxChars) {
        return [text.trim()].filter(t => t.length > 0);
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + maxChars;

        // Try to break at sentence boundary
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > start + maxChars / 2) {
                end = breakPoint + 1;
            }
        }

        const chunk = text.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        // Move forward with overlap
        start = end - overlapChars;
        if (start >= text.length) break;
    }

    return chunks;
}

/**
 * Extract text from PDF using pdf.js
 * Note: This requires pdfjs-dist to be available
 */
export async function extractFromPdf(filePath: string): Promise<string> {
    try {
        console.log('[ContentExtractor] Reading PDF:', filePath);
        
        // Read PDF file as binary via main process
        const pdfBuffer = await __hostApi.module.invoke('@citadel-app/base', 'fs.readFileBinary', filePath);
        if (!pdfBuffer) {
            console.warn('[ContentExtractor] Could not read PDF file:', filePath);
            return '';
        }

        // Convert to Uint8Array if it's a Buffer
        const pdfData = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
        console.log('[ContentExtractor] PDF data size:', pdfData.length, 'bytes');

        // Dynamic import of pdf.js
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
        ).toString();

        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        console.log('[ContentExtractor] PDF pages:', pdf.numPages);
        
        const textParts: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            textParts.push(pageText);
        }

        const fullText = textParts.join('\n\n');
        console.log('[ContentExtractor] Extracted', fullText.length, 'chars from PDF');
        return fullText;
    } catch (e) {
        console.error('[ContentExtractor] PDF extraction failed:', e);
        return '';
    }
}

/**
 * Extract text from a remote PDF URL
 */
export async function extractFromRemotePdf(url: string): Promise<string> {
    try {
        console.log('[ContentExtractor] Fetching remote PDF:', url);
        
        // Fetch PDF via main process
        const response = await __hostApi.net.fetch(url);
        if (!response.ok) {
            console.warn('[ContentExtractor] Could not fetch remote PDF:', url);
            return '';
        }

        // Get binary data - response might have different formats
        let pdfData: Uint8Array;
        if (response.buffer) {
            pdfData = new Uint8Array(response.buffer);
        } else if (typeof response.text === 'string') {
            // Fallback: convert string to bytes (shouldn't happen for binary)
            const encoder = new TextEncoder();
            pdfData = encoder.encode(response.text);
        } else {
            console.warn('[ContentExtractor] Unexpected response format for PDF');
            return '';
        }
        
        console.log('[ContentExtractor] Remote PDF size:', pdfData.length, 'bytes');

        // Dynamic import of pdf.js
        const pdfjsLib = await import('pdfjs-dist');
        const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        console.log('[ContentExtractor] Remote PDF pages:', pdf.numPages);
        
        const textParts: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            textParts.push(pageText);
        }

        const fullText = textParts.join('\n\n');
        console.log('[ContentExtractor] Extracted', fullText.length, 'chars from remote PDF');
        return fullText;
    } catch (e) {
        console.error('[ContentExtractor] Remote PDF extraction failed:', e);
        return '';
    }
}

/**
 * Extract article text from URL using Readability
 * Note: This fetches and parses the page content
 */
export async function extractFromUrl(url: string): Promise<string> {
    try {
        // Fetch page content via main process
        const response = await __hostApi.net.fetch(url);
        if (!response.ok) {
            console.warn('[ContentExtractor] Could not fetch URL:', url);
            return '';
        }

        const html = response.text;

        // Dynamic import of Readability
        const { Readability } = await import('@mozilla/readability');
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract article content
        const reader = new Readability(doc);
        const article = reader.parse();

        return article?.textContent || '';
    } catch (e) {
        console.error('[ContentExtractor] URL extraction failed:', e);
        return '';
    }
}

/**
 * Extract text from markdown content
 * Strips formatting, keeps structure
 */
export function extractFromMarkdown(content: string): string {
    if (!content) return '';

    // Remove code blocks (keep for context but simplify)
    let text = content.replace(/```[\s\S]*?```/g, '[code block]');
    
    // Remove inline code
    text = text.replace(/`[^`]+`/g, '');
    
    // Remove links but keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    
    // Remove headers markdown but keep text
    text = text.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold/italic markers
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    
    // Remove blockquotes
    text = text.replace(/^>\s*/gm, '');
    
    // Remove list markers
    text = text.replace(/^[-*+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    
    // Normalize whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
}

/**
 * Configuration for content extraction
 */
export interface ExtractionConfig {
    chunkSize?: number;      // characters per chunk (default: 1000)
    chunkOverlap?: number;   // overlap between chunks (default: 100)
    indexPdf?: boolean;      // whether to index PDF content (default: true)
    indexUrl?: boolean;      // whether to index URL/webview content (default: true)
    indexMarkdown?: boolean; // whether to index markdown content (default: true)
}

/**
 * Extract all content from an entry (all modules)
 */
export async function extractAllFromEntry(
    entry: CodexEntry,
    config: ExtractionConfig & { typeConfig?: EntryTypeConfig } = {}
): Promise<ExtractionResult> {
    const {
        chunkSize = 1000,
        chunkOverlap = 100,
        indexPdf = true,
        indexUrl = true,
        indexMarkdown = true,
        typeConfig
    } = config;

    // Convert chars to tokens (rough: 4 chars = 1 token)
    const maxTokens = Math.floor(chunkSize / 4);
    const overlapTokens = Math.floor(chunkOverlap / 4);

    const chunks: TextChunk[] = [];
    let totalChars = 0;

    // 0. Extract Dynamic Metadata Chunk (High Importance)
    if (typeConfig) {
        let metaText = `TITLE: ${entry.title}\nTITLE (ALT): ${entry.title}\nTYPE: ${entry.type}\n`;
        
        if (entry.tags && entry.tags.length > 0) {
            metaText += `TAGS: ${entry.tags.join(', ')}\n`;
        }

        // Include Metadata fields from Schema
        if (typeConfig.metadata) {
            typeConfig.metadata.forEach(m => {
                const val = entry.frontmatter?.[m.key] || (entry as any)[m.key];
                if (val !== undefined && val !== null && val !== '') {
                    metaText += `${m.label}: ${Array.isArray(val) ? val.join(', ') : val}`;
                    if (m.description) metaText += ` (Hint: ${m.description})`;
                    metaText += '\n';
                }
            });
        }

        // Include Form fields from Schema
        if (typeConfig.fields) {
            typeConfig.fields.forEach(f => {
                const val = entry.frontmatter?.[f.key] || (entry as any)[f.key];
                if (val !== undefined && val !== null && val !== '') {
                    metaText += `${f.label}: ${Array.isArray(val) ? val.join(', ') : val}`;
                    if (f.description) metaText += ` (Hint: ${f.description})`;
                    metaText += '\n';
                }
            });
        }

        chunks.push({
            id: `${entry.id}-metadata`,
            text: metaText.trim(),
            sourceType: 'metadata',
            chunkIndex: 0
        });
        totalChars += metaText.length;
    }

    // 1. Extract from PDF if present and enabled
    if (indexPdf) {
        const pdfPath = entry.frontmatter?.pdfPath;
        if (pdfPath) {
            console.log('[ContentExtractor] Found pdfPath in frontmatter:', pdfPath);
            
            let pdfText = '';
            
            // Check if it's a URL or local file
            if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
                // Remote PDF - fetch and extract
                console.log('[ContentExtractor] Fetching remote PDF:', pdfPath);
                pdfText = await extractFromRemotePdf(pdfPath);
            } else {
                // Local file - resolve relative path
                const normalizedFile = entry.filePath.replace(/\\/g, '/');
                const parentDir = normalizedFile.substring(0, normalizedFile.lastIndexOf('/'));
                
                let absolutePath = pdfPath;
                if (pdfPath.startsWith('./')) {
                    absolutePath = `${parentDir}/${pdfPath.substring(2)}`;
                } else if (!pdfPath.includes(':') && !pdfPath.startsWith('/')) {
                    absolutePath = `${parentDir}/${pdfPath}`;
                }
                
                // Allow cross-platform path parsing relying on the main process safely or just replacing normalized paths
                // On Windows/Unix, main process `fs` handles most cross-platform `path.join`, but for now `absolutePath` is kept neutral.
                
                console.log('[ContentExtractor] Reading local PDF:', absolutePath);
                pdfText = await extractFromPdf(absolutePath);
            }
            
            if (pdfText) {
                const pdfChunks = chunkText(pdfText, maxTokens, overlapTokens);
                pdfChunks.forEach((text, idx) => {
                    chunks.push({
                        id: `${entry.id}-pdf-${idx}`,
                        text,
                        sourceType: 'pdf',
                        chunkIndex: idx
                    });
                    totalChars += text.length;
                });
            }
        }
    }

    // 2. Extract from URL if present and enabled
    if (indexUrl && entry.sourceUrl) {
        const urlText = await extractFromUrl(entry.sourceUrl);
        if (urlText) {
            const urlChunks = chunkText(urlText, maxTokens, overlapTokens);
            urlChunks.forEach((text, idx) => {
                chunks.push({
                    id: `${entry.id}-webview-${idx}`,
                    text,
                    sourceType: 'webview',
                    chunkIndex: idx
                });
                totalChars += text.length;
            });
        }
    }

    // 3. Extract from markdown content if present and enabled
    if (indexMarkdown && entry.content) {
        const mdText = extractFromMarkdown(entry.content);
        if (mdText) {
            const mdChunks = chunkText(mdText, maxTokens, overlapTokens);
            mdChunks.forEach((text, idx) => {
                chunks.push({
                    id: `${entry.id}-sections-${idx}`,
                    text,
                    sourceType: 'sections',
                    chunkIndex: idx
                });
                totalChars += text.length;
            });
        }
    }

    return {
        entryId: entry.id,
        chunks,
        totalChars
    };
}

/**
 * Create a simple text representation of an entry for display/preview
 */
export function getEntryPreviewText(entry: CodexEntry): string {
    const parts = [entry.title];
    
    if (entry.tags?.length) {
        parts.push(`Tags: ${entry.tags.join(', ')}`);
    }
    
    if (entry.content) {
        const preview = extractFromMarkdown(entry.content).slice(0, 200);
        parts.push(preview + (entry.content.length > 200 ? '...' : ''));
    }
    
    return parts.join('\n');
}
