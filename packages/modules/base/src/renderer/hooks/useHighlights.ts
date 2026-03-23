import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CodexEntry } from '../lib/db';
import { dataManager } from '../lib/data-manager';
import { resolveResourceUrl } from '@citadel-app/core';

interface Highlight {
    id: string;
    content?: {
        text?: string;
        image?: string;
    };
    position?: any;
    comment?: any;
    [key: string]: any;
}

interface UseHighlightsOptions {
    entry: CodexEntry | undefined;
}

interface UseHighlightsReturn {
    highlights: Highlight[];
    resolvedHighlights: Highlight[];
    handleHighlightAdd: (highlight: Highlight, content?: string) => Promise<void>;
    handleHighlightDelete: (highlightId: string) => Promise<void>;
    handleHighlightClick: (highlightId: string, scrollFn?: (h: Highlight) => void) => void;
}

export const useHighlights = ({ entry }: UseHighlightsOptions): UseHighlightsReturn => {
    const [highlights, setHighlights] = useState<Highlight[]>([]);

    // Use a ref to always have access to the latest state without re-creating handlers
    const latestRef = useRef({ highlights, entry });
    useEffect(() => {
        latestRef.current = { highlights, entry };
    }, [highlights, entry]);

    // Sync from entry highlights
    useEffect(() => {
        if (entry?.highlights) {
            setHighlights(entry.highlights);
        } else {
            setHighlights([]);
        }
    }, [entry?.highlights]);

    // Resolve image URLs for display
    const resolvedHighlights = useMemo(() => {
        if (!entry?.filePath) return highlights;
        return highlights.map(h => {
            if (h.content?.image && !h.content.image.startsWith('data:')) {
                return {
                    ...h,
                    content: {
                        ...h.content,
                        image: resolveResourceUrl(entry.filePath, h.content.image)
                    }
                };
            }
            return h;
        });
    }, [highlights, entry?.filePath]);

    // Add highlight with image asset saving
    const handleHighlightAdd = useCallback(async (highlight: Highlight, content?: string) => {
        const { entry: currentEntry } = latestRef.current;
        if (!currentEntry) return;

        let processedHighlight = { ...highlight };

        // Handle image highlights - save to assets
        if (highlight.content?.image?.startsWith('data:')) {
            try {
                const base64Data = highlight.content.image;
                const byteString = atob(base64Data.split(',')[1]);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: 'image/png' });
                const file = new File([blob], `highlight-${Date.now()}.png`, { type: 'image/png' });

                const assetPath = await dataManager.saveAsset(currentEntry.id, file);
                processedHighlight = {
                    ...processedHighlight,
                    content: {
                        ...processedHighlight.content,
                        image: assetPath
                    }
                };
            } catch (e) {
                console.error('Failed to save highlight image asset', e);
            }
        }

        // Use functional update to ensure we have the latest highlights
        setHighlights(prevHighlights => {
            if (prevHighlights.some(h => h.id === processedHighlight.id)) {
                return prevHighlights;
            }

            const newHighlights = [...prevHighlights, processedHighlight];
            
            dataManager.updateEntry(currentEntry.id, {
                highlights: newHighlights,
                ...(content !== undefined ? { content } : {})
            }).catch(e => console.error('Failed to persist highlights:', e));

            return newHighlights;
        });
    }, []); // Stable identity

    // Delete highlight
    const handleHighlightDelete = useCallback(async (highlightId: string) => {
        const { entry: currentEntry, highlights: currentHighlights } = latestRef.current;
        if (!currentEntry) return;

        const newHighlights = currentHighlights.filter(h => h.id !== highlightId);
        setHighlights(newHighlights);

        await dataManager.updateEntry(currentEntry.id, {
            highlights: newHighlights
        });
    }, []); // Stable identity

    // Click handler for scrolling
    const handleHighlightClick = useCallback((highlightId: string, scrollFn?: (h: Highlight) => void) => {
        const { highlights: currentHighlights, entry: currentEntry } = latestRef.current;
        if (!currentEntry || !scrollFn) return;

        const highlight = currentHighlights.find(h => h.id === highlightId);
        if (highlight) {
            // Resolve URL if it's an image highlight
            const resolved = (highlight.content?.image && !highlight.content.image.startsWith('data:'))
                ? {
                    ...highlight,
                    content: {
                        ...highlight.content,
                        image: resolveResourceUrl(currentEntry.filePath, highlight.content.image)
                    }
                }
                : highlight;
            
            scrollFn(resolved);
        }
    }, []); // Stable identity

    return {
        highlights,
        resolvedHighlights,
        handleHighlightAdd,
        handleHighlightDelete,
        handleHighlightClick
    };
};
