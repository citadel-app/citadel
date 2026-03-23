/**
 * Content Extractor Service
 * Extracts text from various content sources for RAG indexing.
 * Refactored for Main process.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { net } from 'electron';
import type { CodexEntry } from '@citadel-app/core';
import type { EntryTypeConfig } from './config/entry-types';

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
 */
export function chunkText(
    text: string,
    maxTokens: number = 500,
    overlap: number = 50
): string[] {
    const maxChars = maxTokens * 4;
    const overlapChars = overlap * 4;

    if (text.length <= maxChars) {
        return [text.trim()].filter(t => t.length > 0);
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + maxChars;

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

        start = end - overlapChars;
        if (start >= text.length) break;
    }

    return chunks;
}

/**
 * Extract text from PDF using pdf.js
 */
export async function extractFromPdf(filePath: string): Promise<string> {
    try {
        console.log('[ContentExtractor] Reading PDF:', filePath);
        
        if (!fs.existsSync(filePath)) {
            console.warn('[ContentExtractor] PDF file does not exist:', filePath);
            return '';
        }

        const pdfData = new Uint8Array(fs.readFileSync(filePath));
        console.log('[ContentExtractor] PDF data size:', pdfData.length, 'bytes');

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
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
        
        const response = await net.fetch(url);
        if (!response.ok) {
            console.warn('[ContentExtractor] Could not fetch remote PDF:', url);
            return '';
        }

        const arrayBuffer = await response.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        
        console.log('[ContentExtractor] Remote PDF size:', pdfData.length, 'bytes');

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const textParts: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            textParts.push(pageText);
        }

        return textParts.join('\n\n');
    } catch (e) {
        console.error('[ContentExtractor] Remote PDF extraction failed:', e);
        return '';
    }
}

/**
 * Extract article text from URL
 */
export async function extractFromUrl(url: string): Promise<string> {
    try {
        const response = await net.fetch(url);
        if (!response.ok) return '';

        const html = await response.text();

        // Simplified HTML to text removal for Main process (avoiding DOMParser/Readability complexity)
        // In a real app, you might use 'cheerio' or 'jsdom' here.
        let text = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    } catch (e) {
        console.error('[ContentExtractor] URL extraction failed:', e);
        return '';
    }
}

/**
 * Extract text from markdown content
 */
export function extractFromMarkdown(content: string): string {
    if (!content) return '';

    let text = content.replace(/```[\s\S]*?```/g, '[code block]');
    text = text.replace(/`[^`]+`/g, '');
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    text = text.replace(/^>\s*/gm, '');
    text = text.replace(/^[-*+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
}

export interface ExtractionConfig {
    chunkSize?: number;
    chunkOverlap?: number;
    indexPdf?: boolean;
    indexUrl?: boolean;
    indexMarkdown?: boolean;
}

/**
 * Extract all content from an entry
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

    const maxTokens = Math.floor(chunkSize / 4);
    const overlapTokens = Math.floor(chunkOverlap / 4);

    const chunks: TextChunk[] = [];
    let totalChars = 0;

    // 0. Extract Metadata
    if (typeConfig) {
        let metaText = `TITLE: ${entry.title}\nTYPE: ${entry.type}\n`;
        
        if (entry.tags && entry.tags.length > 0) {
            metaText += `TAGS: ${entry.tags.join(', ')}\n`;
        }

        if (typeConfig.metadata) {
            typeConfig.metadata.forEach(m => {
                const val = entry.frontmatter?.[m.key] || (entry as any)[m.key];
                if (val !== undefined && val !== null && val !== '') {
                    metaText += `${m.label}: ${Array.isArray(val) ? val.join(', ') : val}\n`;
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

    // 1. PDF
    if (indexPdf) {
        const pdfPath = entry.frontmatter?.pdfPath;
        if (pdfPath) {
            let pdfText = '';
            if (pdfPath.startsWith('http')) {
                pdfText = await extractFromRemotePdf(pdfPath);
            } else {
                const parentDir = path.dirname(entry.filePath);
                let absolutePath = pdfPath;
                if (pdfPath.startsWith('./')) {
                    absolutePath = path.join(parentDir, pdfPath.substring(2));
                } else if (!path.isAbsolute(pdfPath)) {
                    absolutePath = path.join(parentDir, pdfPath);
                }
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

    // 2. URL
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

    // 3. Markdown
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

export function getEntryPreviewText(entry: CodexEntry): string {
    const parts = [entry.title];
    if (entry.tags?.length) parts.push(`Tags: ${entry.tags.join(', ')}`);
    if (entry.content) parts.push(extractFromMarkdown(entry.content).slice(0, 200));
    return parts.join('\n');
}
