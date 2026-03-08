import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CodexEntry } from '../lib/db';
import { dataManager } from '../lib/data-manager';
import { useConfig } from '../context/ConfigContext';
import { StandardMarkdownSerializer } from '@shared';

interface UseEntryContentOptions {
    entry: CodexEntry | undefined;
    debounceMs?: number;
}

interface UseEntryContentReturn {
    localContent: string;
    setLocalContent: (content: string) => void;
    sections: any[];
    missingSections: any[];
    handleSaveSection: (sectionId: string, newContent: string) => void;
    handleDeleteSection: (sectionId: string) => void;
    handleAddSection: (title: string) => void;
    handleUpdateFrontmatter: (newFrontmatter: any) => void;
    isLoaded: boolean;
    hasConflict: boolean;
    setHasConflict: (val: boolean) => void;
    resolveConflict: (resolution: 'use-local' | 'use-disk') => void;
}

const defaultSerializer = new StandardMarkdownSerializer();

export const useEntryContent = ({
    entry,
    debounceMs = 1000
}: UseEntryContentOptions): UseEntryContentReturn => {
    const { getEntryTypeConfig } = useConfig();
    const [localContent, setLocalContent] = useState<string>('');
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasConflict, setHasConflict] = useState(false);
    const lastSyncedContentRef = useRef<string | null>(null);

    // Initial load from entry
    useEffect(() => {
        if (entry && !isLoaded) {
            const content = entry.content || '';
            setLocalContent(content);
            lastSyncedContentRef.current = content;
            setIsLoaded(true);
        }
    }, [entry?.id, entry?.content, isLoaded]);

    // Handle background changes (git pull, etc)
    useEffect(() => {
        if (!entry || !isLoaded || hasConflict) return;

        const dbContent = entry.content || '';
        
        // If DB content changed since we last updated/loaded
        if (lastSyncedContentRef.current !== null && dbContent !== lastSyncedContentRef.current) {
            console.log('[useEntryContent] Background change detected for', entry.id);
            
            // Check if user has local changes relative to the OLD synced content
            const isDirty = localContent !== lastSyncedContentRef.current;

            if (isDirty) {
                console.warn('[useEntryContent] Conflict detected! Disk changed and user has unsaved changes.');
                setHasConflict(true);
            } else {
                // Silently update to match new disk content
                console.log('[useEntryContent] Silently updating to match disk changes.');
                setLocalContent(dbContent);
                lastSyncedContentRef.current = dbContent;
            }
        }
    }, [entry?.content, isLoaded, localContent, hasConflict]);

    // Reset on entry change
    useEffect(() => {
        if (!entry) {
            setIsLoaded(false);
            setLocalContent('');
            lastSyncedContentRef.current = null;
            setHasConflict(false);
        }
    }, [entry?.id]);

    // Debounced save
    useEffect(() => {
        if (!isLoaded || !entry || hasConflict) return;
        const handler = setTimeout(() => {
            // Only save if dirty relative to last synced
            if (localContent !== lastSyncedContentRef.current) {
                console.log('[useEntryContent] Auto-saving changes to disk...');
                dataManager.updateContent(entry.id, localContent);
                lastSyncedContentRef.current = localContent;
            }
        }, debounceMs);
        return () => clearTimeout(handler);
    }, [localContent, entry?.id, isLoaded, debounceMs, hasConflict]);

    const resolveConflict = useCallback((resolution: 'use-local' | 'use-disk') => {
        if (!entry) return;
        if (resolution === 'use-disk') {
            const dbContent = entry.content || '';
            setLocalContent(dbContent);
            lastSyncedContentRef.current = dbContent;
        } else {
            // use-local: keep local content, and mark it as the current "truth" for future diffs
            // This will trigger an auto-save shortly
            lastSyncedContentRef.current = localContent;
        }
        setHasConflict(false);
    }, [entry, localContent]);

    // Get Serializer
    const serializer = useMemo(() => {
        if (!entry?.type) return defaultSerializer;
        const config = getEntryTypeConfig(entry.type);
        // @ts-ignore - serializer is optional in some configs
        return config.serializer || defaultSerializer;
    }, [entry?.type]);

    // Parse and sort sections
    const sections = useMemo(() => {
        const { sections: parsed } = serializer.deserialize(localContent);
        
        if (!entry?.type) return parsed;

        const config = getEntryTypeConfig(entry.type);
        const sectionConfigs = config.sections;
        if (!sectionConfigs) return parsed;

        return parsed.sort((a, b) => {
            const indexA = sectionConfigs.findIndex(c => c.title.toLowerCase() === (a.title?.toLowerCase() || ''));
            const indexB = sectionConfigs.findIndex(c => c.title.toLowerCase() === (b.title?.toLowerCase() || ''));

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
        });
    }, [localContent, entry?.type, serializer]);

    // Track latest values in a ref for stable handlers
    const latestRef = useRef({ sections, entry, serializer });
    useEffect(() => {
        latestRef.current = { sections, entry, serializer };
    }, [sections, entry, serializer]);
    const missingSections = useMemo(() => {
        if (!entry?.type) return [];
        const config = getEntryTypeConfig(entry.type);
        const sectionConfigs = config.sections;
        if (!sectionConfigs) return [];

        const existingTitles = sections.map(s => s.title?.toLowerCase());
        return sectionConfigs.filter(c => !existingTitles.includes(c.title.toLowerCase()));
    }, [entry?.type, sections]);

    // Section handlers - stabilized with latestRef
    const handleSaveSection = useCallback((sectionId: string, newContent: string) => {
        const { sections: currentSections, entry: currentEntry, serializer: currentSerializer } = latestRef.current;
        console.log('[useEntryContent] handleSaveSection', sectionId);
        
        const updatedSections = currentSections.map(s => {
            if (s.id === sectionId) {
                return { ...s, rawContent: newContent };
            }
            return s;
        });

        const newData = {
            frontmatter: currentEntry?.frontmatter || {},
            content: '',
            sections: updatedSections
        };

        const newDoc = currentSerializer.serialize(newData);
        setLocalContent(newDoc);
    }, []); // Stable identity

    const handleDeleteSection = useCallback((sectionId: string) => {
        const { sections: currentSections, entry: currentEntry, serializer: currentSerializer } = latestRef.current;
        console.log('[useEntryContent] handleDeleteSection', sectionId);
        const remainingSections = currentSections.filter(s => s.id !== sectionId);
        
        const newData = {
            frontmatter: currentEntry?.frontmatter || {},
            content: '',
            sections: remainingSections
        };

        const newDoc = currentSerializer.serialize(newData);
        setLocalContent(newDoc);
    }, []); // Stable identity

    const handleAddSection = useCallback((title: string, initialContent?: string) => {
        const { sections: currentSections, entry: currentEntry, serializer: currentSerializer } = latestRef.current;
        console.log('[useEntryContent] handleAddSection', title, initialContent ? '(with content)' : '');
        const defaultContent = initialContent || '';
        
        const newSectionRaw = `## ${title}\n\n${defaultContent}`;

        const newSection = {
            id: `new-${Date.now()}`,
            title: title,
            content: defaultContent,
            rawContent: newSectionRaw
        };

        const isSummary = title.toLowerCase() === 'summary';
        const updatedSections = isSummary 
            ? [newSection, ...currentSections]
            : [...currentSections, newSection];

        const newData = {
            frontmatter: currentEntry?.frontmatter || {},
            content: '',
            sections: updatedSections
        };

        const newDoc = currentSerializer.serialize(newData);
        setLocalContent(newDoc);
    }, []); // Stable identity

    const handleUpdateFrontmatter = useCallback((newFrontmatter: any) => {
        const { sections: currentSections, entry: currentEntry, serializer: currentSerializer } = latestRef.current;
        const newData = {
            frontmatter: { ...currentEntry?.frontmatter, ...newFrontmatter },
            content: '',
            sections: currentSections
        };

        const newDoc = currentSerializer.serialize(newData);
        setLocalContent(newDoc);
    }, []); // Stable identity

    return {
        localContent,
        setLocalContent,
        sections,
        missingSections,
        handleSaveSection,
        handleDeleteSection,
        handleAddSection,
        handleUpdateFrontmatter,
        isLoaded,
        hasConflict,
        setHasConflict,
        resolveConflict
    };
};
