import { CodexEntry } from '../../lib/db';
import { 
  QueryParser, 
  evaluateQuery, 
  SearchLogic, 
  type EntryTypeConfig, 
  type Suggestion,
  type SearchMetadata
} from '@citadel-app/core';

export type { Suggestion, SearchMetadata };

export class SearchService {
  /**
   * Evaluates a boolean query against a list of entries.
   */
  static evaluate(
    query: string,
    entries: CodexEntry[],
    getEntryTypeConfig: (type: string) => EntryTypeConfig,
    typeFilter: string = 'all'
  ): CodexEntry[] {
    const queryTree = new QueryParser(query).parse();
    if (!queryTree && typeFilter === 'all') return entries;

    return entries.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (!queryTree) return true;
      return evaluateQuery(queryTree, e, getEntryTypeConfig);
    });
  }

  /**
   * Aggregates available tags, fields, and values from a list of entries.
   */
  static aggregateMetadata(
    entries: CodexEntry[],
    entryTypes: Record<string, EntryTypeConfig>
  ): SearchMetadata {
    return SearchLogic.aggregateMetadata(entries, entryTypes);
  }

  /**
   * Generates suggestions based on query and cursor position.
   */
  static getSuggestions(
    query: string,
    cursorPosition: number,
    metadata: SearchMetadata
  ): { suggestions: Suggestion[], range: { start: number, end: number } | null } {
    return SearchLogic.getSuggestions(query, cursorPosition, metadata);
  }
}
