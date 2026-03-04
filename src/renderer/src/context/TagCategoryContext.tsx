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
    loading: boolean;
    addCategory: (name: string, color: string) => void;
    updateCategory: (id: string, updates: Partial<TagCategory>) => void;
    removeCategory: (id: string) => void;
    addTagToCategory: (categoryId: string, tag: string) => void;
    removeTagFromCategory: (categoryId: string, tag: string) => void;
    getCategoryForTag: (tag: string) => TagCategory | undefined;
    syncCategories: () => Promise<void>;
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
    const [loading, setLoading] = useState(true);
    const { vaultPath } = useConfig();

    const loadCategories = useCallback(async () => {
        if (!vaultPath) return;
        setLoading(true);
        try {
            const data = await dataManager.loadTagCategories();
            setCategories(data || []);
        } catch (e) {
            console.error('Failed to load tag categories', e);
        } finally {
            setLoading(false);
        }
    }, [vaultPath]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const syncCategories = useCallback(async (newCategories: TagCategory[]) => {
        try {
            await dataManager.saveTagCategories(newCategories);
        } catch (e) {
            console.error('Failed to save tag categories', e);
        }
    }, []);

    const addCategory = (name: string, color: string) => {
        const newCategory: TagCategory = {
            id: uuidv4(),
            name,
            color,
            tags: []
        };
        const updated = [...categories, newCategory];
        setCategories(updated);
        syncCategories(updated);
    };

    const updateCategory = (id: string, updates: Partial<TagCategory>) => {
        const updated = categories.map(cat =>
            cat.id === id ? { ...cat, ...updates } : cat
        );
        setCategories(updated);
        syncCategories(updated);
    };

    const removeCategory = (id: string) => {
        const updated = categories.filter(cat => cat.id !== id);
        setCategories(updated);
        syncCategories(updated);
    };

    const addTagToCategory = (categoryId: string, tag: string) => {
        // Enforce: A tag cannot belong to multiple categories
        const updated = categories.map(cat => {
            // Remove tag from other categories
            if (cat.id !== categoryId && cat.tags.includes(tag)) {
                return { ...cat, tags: cat.tags.filter(t => t !== tag) };
            }
            // Add tag to target category
            if (cat.id === categoryId && !cat.tags.includes(tag)) {
                return { ...cat, tags: [...cat.tags, tag] };
            }
            return cat;
        });
        setCategories(updated);
        syncCategories(updated);
    };

    const removeTagFromCategory = (categoryId: string, tag: string) => {
        const updated = categories.map(cat =>
            cat.id === categoryId ? { ...cat, tags: cat.tags.filter(t => t !== tag) } : cat
        );
        setCategories(updated);
        syncCategories(updated);
    };

    const getCategoryForTag = (tag: string) => {
        return categories.find(cat => cat.tags.includes(tag));
    };

    return (
        <TagCategoryContext.Provider value={{
            categories,
            loading,
            addCategory,
            updateCategory,
            removeCategory,
            addTagToCategory,
            removeTagFromCategory,
            getCategoryForTag,
            syncCategories: () => syncCategories(categories)
        }}>
            {children}
        </TagCategoryContext.Provider>
    );
};
