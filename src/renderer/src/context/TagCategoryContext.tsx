import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dataManager } from '../lib/data-manager';
import { v4 as uuidv4 } from 'uuid';
import { useConfig } from '@renderer/context/ConfigContext';

export interface TagCategory {
    id: string;
    name: string;
    color: string;
    tags: string[];
}

interface TagCategoryContextType {
    categories: TagCategory[];
    isLoading: boolean;
    addCategory: (category: Omit<TagCategory, 'id'>) => void;
    updateCategory: (id: string, updates: Partial<Omit<TagCategory, 'id'>>) => void;
    deleteCategory: (id: string) => void;
    moveTag: (tag: string, fromCategoryId: string | null, toCategoryId: string) => void;
    reorderCategories: (newCategories: TagCategory[]) => void;
    refresh: () => Promise<void>;
}

const TagCategoryContext = createContext<TagCategoryContextType | undefined>(undefined);

export const useTagCategories = () => {
    const context = useContext(TagCategoryContext);
    if (!context) {
        throw new Error('useTagCategories must be used within a TagCategoryProvider');
    }
    return context;
};

export const TagCategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [categories, setCategories] = useState<TagCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { vaultPath } = useConfig();

    const loadCategories = useCallback(async () => {
        if (!vaultPath) return;
        setIsLoading(true);
        try {
            const data = await dataManager.loadTagCategories();
            console.log('[TagCategoryContext] categories loaded:', data?.length);
            setCategories(data || []);
        } catch (error) {
            console.error('[TagCategoryContext] Failed to load categories:', error);
        } finally {
            setIsLoading(false);
        }
    }, [vaultPath]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const saveCategories = useCallback(async (newCategories: TagCategory[]) => {
        if (!vaultPath || isLoading) {
            console.warn('[TagCategoryContext] Skipping save: vaultPath missing or still loading', { vaultPath, isLoading });
            return;
        }
        try {
            await dataManager.saveTagCategories(newCategories);
        } catch (error) {
            console.error('[TagCategoryContext] Failed to save categories:', error);
        }
    }, [vaultPath, isLoading]);

    const addCategory = useCallback((category: Omit<TagCategory, 'id'>) => {
        const id = crypto.randomUUID();
        setCategories(prev => {
            const updated = [...prev, { ...category, id }];
            saveCategories(updated);
            return updated;
        });
    }, [saveCategories]);

    const updateCategory = useCallback((id: string, updates: Partial<Omit<TagCategory, 'id'>>) => {
        setCategories(prev => {
            const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
            saveCategories(updated);
            return updated;
        });
    }, [saveCategories]);

    const deleteCategory = useCallback((id: string) => {
        setCategories(prev => {
            const updated = prev.filter(c => c.id !== id);
            saveCategories(updated);
            return updated;
        });
    }, [saveCategories]);

    const moveTag = useCallback((tag: string, fromCategoryId: string | null, toCategoryId: string) => {
        setCategories(prev => {
            const updated = prev.map(c => {
                // Remove from source if it was in another category
                if (c.id === fromCategoryId) {
                    return { ...c, tags: c.tags.filter(t => t !== tag) };
                }
                // Ensure it's not in ANY other category (enforce exclusivity)
                if (c.id !== toCategoryId && c.tags.includes(tag)) {
                    return { ...c, tags: c.tags.filter(t => t !== tag) };
                }
                // Add to target
                if (c.id === toCategoryId) {
                    return { ...c, tags: [...new Set([...c.tags, tag])] };
                }
                return c;
            });
            saveCategories(updated);
            return updated;
        });
    }, [saveCategories]);

    const reorderCategories = useCallback((newCategories: TagCategory[]) => {
        setCategories(newCategories);
        saveCategories(newCategories);
    }, [saveCategories]);

    return (
        <TagCategoryContext.Provider value={{
            categories,
            isLoading,
            addCategory,
            updateCategory,
            deleteCategory,
            moveTag,
            reorderCategories,
            refresh: loadCategories
        }}>
            {children}
        </TagCategoryContext.Provider>
    );
};
