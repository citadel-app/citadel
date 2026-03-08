import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useConfig } from '../../context/ConfigContext';
import { SearchService, Suggestion } from '../services/SearchService';

export type { Suggestion };

export const useSearchIntellisense = (query: string, cursorPosition: number) => {
    const { entryTypes } = useConfig();
    const allEntries = useLiveQuery(async () => {
        const entries = await db.entries.toArray();
        return entries.map(e => ({
            ...e,
            content: undefined,
            highlights: undefined,
            whiteboard: undefined,
            code: undefined
        }));
    }) || [];

    const metadata = useMemo(() => 
        SearchService.aggregateMetadata(allEntries, entryTypes),
    [allEntries, entryTypes]);

    const intellisense = useMemo(() => 
        SearchService.getSuggestions(query, cursorPosition, metadata),
    [query, cursorPosition, metadata]);

    return intellisense;
};
