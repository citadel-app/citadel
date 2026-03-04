import { CodexEntry } from '../../lib/db';
import { QueryParser } from '../core/QueryParser';
import { evaluateQuery } from '../core/QueryEvaluator';
import { QueryLexer } from '../core/QueryLexer';
import { EntryTypeConfig } from '../../config/entry-types';

export interface Suggestion {
  text: string;
  type: 'tag' | 'field' | 'value' | 'operator';
  description?: string;
  icon?: string;
}

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
  ) {
    const tags = new Set<string>();
    const fields = new Set<string>(['tags', 'type']);
    const valuesByField: Record<string, Set<string>> = {
      type: new Set(Object.keys(entryTypes))
    };

    entries.forEach(entry => {
      entry.tags?.forEach(tag => tags.add(tag));
      
      if (entry.frontmatter) {
        Object.entries(entry.frontmatter).forEach(([key, val]) => {
          fields.add(key);
          if (!valuesByField[key]) valuesByField[key] = new Set();
          if (Array.isArray(val)) {
            val.forEach(v => valuesByField[key].add(String(v)));
          } else if (val !== null && val !== undefined) {
            valuesByField[key].add(String(val));
          }
        });
      }

      Object.values(entryTypes).forEach(typeConfig => {
        typeConfig.metadata?.forEach(m => fields.add(m.key));
        typeConfig.fields?.forEach(f => fields.add(String(f.key)));
      });
    });

    return {
      tags: Array.from(tags).sort(),
      fields: Array.from(fields).sort(),
      valuesByField: Object.fromEntries(
        Object.entries(valuesByField).map(([k, v]) => [k, Array.from(v).sort()])
      )
    };
  }

  /**
   * Generates suggestions based on query and cursor position.
   */
  static getSuggestions(
    query: string,
    cursorPosition: number,
    metadata: { tags: string[], fields: string[], valuesByField: Record<string, string[]> }
  ): { suggestions: Suggestion[], range: { start: number, end: number } | null } {
    if (cursorPosition < 0) return { suggestions: [], range: null };

    const tokens = QueryLexer.tokenize(query);
    const textBefore = query.slice(0, cursorPosition);
    const activeToken = tokens.find(t => cursorPosition >= t.start && cursorPosition <= t.end);
    
    let filterText = '';
    let range = { start: cursorPosition, end: cursorPosition };
    let contextType: 'tag' | 'field' | 'value' | 'operator' | 'general' = 'general';

    if (activeToken) {
      filterText = query.slice(activeToken.start, cursorPosition);
      range = { start: activeToken.start, end: cursorPosition };

      if (activeToken.text.startsWith('#')) {
        contextType = 'tag';
        filterText = filterText.startsWith('#"') ? filterText.slice(2) : filterText.slice(1);
      } else if (activeToken.text === ':') {
        const tokenIdx = tokens.indexOf(activeToken);
        const prev = tokenIdx > 0 ? tokens[tokenIdx - 1] : null;
        if (prev) {
          contextType = 'value';
          range = { start: cursorPosition, end: cursorPosition }; 
        }
      } else {
        const tokenIdx = tokens.indexOf(activeToken);
        const prev = tokenIdx > 0 ? tokens[tokenIdx - 1] : null;
        if (prev && prev.text === ':') {
          contextType = 'value';
        } else {
          contextType = 'general';
        }
      }
    } else {
      if (textBefore.endsWith('#')) {
        contextType = 'tag';
        range = { start: cursorPosition - 1, end: cursorPosition };
        filterText = '';
      } else if (textBefore.endsWith(':')) {
        contextType = 'value';
        range = { start: cursorPosition, end: cursorPosition };
        filterText = '';
      } else if (textBefore.endsWith(' ')) {
        contextType = 'general';
      }
    }

    const lowMatch = filterText.replace(/^"(.*)"$/, '$1').toLowerCase();

    if (contextType === 'tag') {
      const suggestions: Suggestion[] = metadata.tags
        .filter(t => t.toLowerCase().includes(lowMatch))
        .map(t => ({
          text: t.includes(' ') ? `#"${t}"` : `#${t}`,
          type: 'tag',
          icon: 'Tag'
        }));
      return { suggestions, range };
    }

    if (contextType === 'value') {
      const colonPos = query.lastIndexOf(':', cursorPosition);
      const textBeforeColon = query.slice(0, colonPos).trim();
      const fieldMatch = textBeforeColon.match(/[^\s()]+$/);
      const field = fieldMatch ? fieldMatch[0].replace(/^"(.*)"$/, '$1') : '';
      
      const fieldValues = metadata.valuesByField[field] || [];
      const suggestions: Suggestion[] = fieldValues
        .filter(v => v.toLowerCase().includes(lowMatch))
        .map(v => ({
          text: v.includes(' ') ? `"${v}"` : v,
          type: 'value',
          icon: 'Check'
        }));
      return { suggestions, range };
    }

    const trimmedBefore = textBefore.trimEnd();
    const endsWithOperator = /\b(AND|OR|NOT)$/i.test(trimmedBefore);
    const isAtStart = trimmedBefore.length === 0 || trimmedBefore.endsWith('(');
    const hasSpaceBefore = textBefore.endsWith(' ');

    const operators: Suggestion[] = (!isAtStart && !endsWithOperator && (hasSpaceBefore || lowMatch.length > 0))
      ? ['AND', 'OR', 'NOT']
          .filter(op => op.toLowerCase().startsWith(lowMatch))
          .map(op => ({ text: op, type: 'operator', icon: 'Zap' }))
      : [];

    const tags: Suggestion[] = (lowMatch.length > 0 || hasSpaceBefore || isAtStart)
      ? metadata.tags
          .filter(t => t.toLowerCase().includes(lowMatch))
          .map(t => ({
            text: t.includes(' ') ? `#"${t}"` : `#${t}`,
            type: 'tag',
            icon: 'Tag'
          }))
      : [];

    const fields: Suggestion[] = (operators.length === 0 || lowMatch.length > 0)
      ? metadata.fields
          .filter(f => f.toLowerCase().includes(lowMatch))
          .map(f => ({
            text: f.includes(' ') ? `"${f}":` : `${f}:`,
            type: 'field',
            icon: 'Filter'
          }))
      : [];

    const suggestions = [...operators, ...tags, ...fields];
    if (lowMatch === '' && !hasSpaceBefore && !isAtStart) return { suggestions: [], range: null };

    return { suggestions, range };
  }
}
