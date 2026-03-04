import { PDFDocumentProxy } from 'pdfjs-dist';
import { TtsSentence } from '../hooks/useTts';

// Regex for filtering
const CAPTION_REGEX = /^(Fig\.|Figure|Table)\s+\d+/i;
const PAGE_NUMBER_REGEX = /^\d+$/;

/**
 * Light sanitization for TTS — replace ligatures with ASCII equivalents,
 * strip only truly non-speakable symbols (math, geometric, arrows).
 * Keeps all Latin text, digits, and common punctuation.
 */
function sanitizeForTts(text: string): string {
    return text
        // Replace common PDF ligatures with ASCII
        .replace(/\uFB00/g, 'ff')
        .replace(/\uFB01/g, 'fi')
        .replace(/\uFB02/g, 'fl')
        .replace(/\uFB03/g, 'ffi')
        .replace(/\uFB04/g, 'ffl')
        .replace(/\uFB05/g, 'st')
        .replace(/\uFB06/g, 'st')
        // Strip non-speakable symbol ranges
        .replace(/[\u2200-\u22FF]/g, '')   // Mathematical Operators
        .replace(/[\u25A0-\u25FF]/g, '')   // Geometric Shapes
        .replace(/[\u2500-\u259F]/g, '')   // Box Drawing + Block Elements
        .replace(/[\u2190-\u21FF]/g, '')   // Arrows
        .replace(/[\u2700-\u27BF]/g, '')   // Dingbats
        .replace(/[\u2300-\u23FF]/g, '')   // Misc Technical
        .replace(/[\u27C0-\u27EF\u2980-\u29FF\u2A00-\u2AFF]/g, '') // Misc Math
        .replace(/\s+/g, ' ')
        .trim();
}

interface TextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Detect if items on a page are laid out in 2 columns.
 * Returns the column split X coordinate, or null if single-column.
 */
function detectColumnSplit(items: TextItem[], pageW: number): number | null {
    if (items.length < 10) return null;

    const midX = pageW / 2;
    const gap = pageW * 0.05; // 5% gap tolerance around center

    let leftCount = 0;
    let rightCount = 0;

    for (const item of items) {
        const cx = item.x + item.width / 2;
        if (cx < midX - gap) leftCount++;
        else if (cx > midX + gap) rightCount++;
    }

    // If both sides have substantial content, it's likely 2-column
    const total = items.length;
    if (leftCount > total * 0.25 && rightCount > total * 0.25) {
        return midX;
    }
    return null;
}

/**
 * Sort items for reading order, respecting 2-column layouts.
 * For 2-column: read left column top-to-bottom, then right column top-to-bottom.
 * For single-column: top-to-bottom, left-to-right.
 */
function sortForReadingOrder(items: TextItem[], pageW: number): TextItem[] {
    const split = detectColumnSplit(items, pageW);

    if (split !== null) {
        // 2-column: partition into left and right
        const left: TextItem[] = [];
        const right: TextItem[] = [];
        for (const item of items) {
            const cx = item.x + item.width / 2;
            if (cx < split) left.push(item);
            else right.push(item);
        }

        const sortColumn = (col: TextItem[]) => {
            col.sort((a, b) => {
                const yDiff = Math.abs(a.y - b.y);
                if (yDiff < 5) return a.x - b.x;
                return b.y - a.y; // Descending Y for top-to-bottom
            });
        };

        sortColumn(left);
        sortColumn(right);
        return [...left, ...right];
    }

    // Single column: standard sort
    items.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff < 5) return a.x - b.x;
        return b.y - a.y;
    });
    return items;
}

/**
 * Group items by approximate Y position into line groups.
 * Returns per-line normalized rects and an overall bounding box.
 */
function computeRects(
    chunkItems: TextItem[],
    pageW: number,
    pageH: number
): { box: TtsSentence['box']; rects: TtsSentence['rects'] } {
    if (chunkItems.length === 0) {
        return { box: { x: 0, y: 0, width: 0, height: 0 }, rects: [] };
    }

    // Group by approximate Y (items within 5 PDF units are on the same line)
    const lines: TextItem[][] = [];
    let currentLine: TextItem[] = [chunkItems[0]];

    for (let i = 1; i < chunkItems.length; i++) {
        const item = chunkItems[i];
        const prevY = currentLine[currentLine.length - 1].y;
        if (Math.abs(item.y - prevY) < 5) {
            currentLine.push(item);
        } else {
            lines.push(currentLine);
            currentLine = [item];
        }
    }
    lines.push(currentLine);

    // Compute per-line rects (normalized 0-1)
    const rects: TtsSentence['rects'] = [];
    let minNormX = 1, minNormY = 1, maxNormX2 = 0, maxNormY2 = 0;

    for (const line of lines) {
        const minX = Math.min(...line.map(it => it.x));
        const maxX = Math.max(...line.map(it => it.x + it.width));
        // Use max height in the line for consistent line height
        const lineH = Math.max(...line.map(it => it.height));
        // Use average Y for the line baseline
        const lineY = line.reduce((sum, it) => sum + it.y, 0) / line.length;

        const nx = minX / pageW;
        const ny = 1 - ((lineY + lineH) / pageH); // top in normalized coords
        const nw = (maxX - minX) / pageW;
        const nh = lineH / pageH;

        rects.push({ x: nx, y: ny, width: nw, height: nh });

        minNormX = Math.min(minNormX, nx);
        minNormY = Math.min(minNormY, ny);
        maxNormX2 = Math.max(maxNormX2, nx + nw);
        maxNormY2 = Math.max(maxNormY2, ny + nh);
    }

    return {
        box: {
            x: minNormX,
            y: minNormY,
            width: maxNormX2 - minNormX,
            height: maxNormY2 - minNormY
        },
        rects
    };
}

export const extractSentencesFromPdf = async (pdf: PDFDocumentProxy): Promise<TtsSentence[]> => {
    const sentences: TtsSentence[] = [];
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
        try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });
            const pageW = viewport.width;
            const pageH = viewport.height;

            // Parse items
            const rawItems: TextItem[] = (textContent.items as any[]).map(item => {
                const tx = item.transform;
                return {
                    str: item.str,
                    x: tx[4],
                    y: tx[5],
                    width: item.width,
                    height: item.height || 10,
                };
            });

            // Sort for reading order (handles 2-column layouts)
            const items = sortForReadingOrder(rawItems, pageW);

            // Filter and Group into complete sentences
            let currentChunkText = "";
            let currentChunkItems: TextItem[] = [];

            const margin = pageH * 0.05;

            const flushChunk = () => {
                const cleanText = sanitizeForTts(currentChunkText);
                if (cleanText.length > 3 && currentChunkItems.length > 0) {
                    const { box, rects } = computeRects(currentChunkItems, pageW, pageH);
                    sentences.push({ text: cleanText, page: i, box, rects });
                }
                currentChunkText = "";
                currentChunkItems = [];
            };

            for (const item of items) {
                // Filter Heuristics
                if (item.y < margin || item.y > pageH - margin) continue;
                if (PAGE_NUMBER_REGEX.test(item.str.trim())) continue;
                if (CAPTION_REGEX.test(item.str.trim())) continue;
                if (item.str.trim().startsWith("Table ")) continue;

                const text = item.str;
                if (!text.trim()) continue;

                currentChunkItems.push(item);
                currentChunkText += text + " ";

                // Sentence-end detection: analyze the ACCUMULATED text, not individual items
                // (PDF items can split "V" and "." into separate items)
                const accumulated = currentChunkText.trim();
                const wordCount = accumulated.split(/\s+/).length;

                let isSentenceEnd = false;

                if (/[a-zA-Z]{2,}[!?]\s*$/.test(accumulated)) {
                    // ! or ? after a real word (2+ letters) at end of accumulated text
                    isSentenceEnd = true;
                } else if (/\.\s*$/.test(accumulated)) {
                    // Period at end of accumulated text - check what's before it
                    // Extract the last word before the period
                    const beforePeriod = accumulated.slice(0, -1).trim();
                    const lastWord = beforePeriod.split(/[\s()\[\]{}]+/).filter(Boolean).pop() || '';

                    const isDecimal = /\d$/.test(lastWord);  // "3" in "3."
                    const isSingleChar = lastWord.length <= 1; // "V" in "V ."
                    const abbrevs = ['e.g', 'i.e', 'et', 'al', 'vs', 'fig', 'dr', 'mr', 'mrs', 'ms', 'prof', 'inc', 'ltd', 'jr', 'sr', 'st', 'dept', 'approx', 'est', 'ref', 'eq', 'sec', 'ch', 'vol', 'no', 'pp'];
                    const isAbbrev = abbrevs.includes(lastWord.toLowerCase());
                    const isParenOrBracket = /[)\]}\d]$/.test(accumulated.replace(/\.\s*$/, '').trim()); // "(1)." or "]."

                    isSentenceEnd = !isDecimal && !isSingleChar && !isAbbrev && !isParenOrBracket;
                }

                if (isSentenceEnd && wordCount >= 5) {
                    flushChunk();
                }
            }
            flushChunk();
        } catch (e) {
            console.error(`Failed to parse page ${i}`, e);
        }
    }

    return sentences;
};
