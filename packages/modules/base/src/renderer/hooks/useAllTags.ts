import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useMemo } from 'react';

export function useAllTags(): string[] {
    const allTagsArrays = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => e.tags || []);
    }) || [];

    const existingTags = useMemo(() => {
        const set = new Set<string>();
        for (const arr of allTagsArrays) {
            for (const t of arr) {
                set.add(t);
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allTagsArrays]);

    return existingTags;
}
