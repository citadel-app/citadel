export interface Token {
  text: string;
  start: number;
  end: number;
}

export class QueryLexer {
  static readonly TOKEN_REGEX = /#?"(?:\\"|[^"])*"|#?[^\s"():]+|:|(?<=\w+):|[()]/g;

  static tokenize(query: string): Token[] {
    const tokens: Token[] = [];
    let match;
    this.TOKEN_REGEX.lastIndex = 0;
    while ((match = this.TOKEN_REGEX.exec(query)) !== null) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return tokens;
  }
}

export interface QueryNode {
  type: 'AND' | 'OR' | 'NOT' | 'TERM';
  left?: QueryNode;
  right?: QueryNode;
  operand?: QueryNode;
  value?: string;
  field?: string;
}

export class QueryParser {
  private tokens: Token[] = [];
  private pos = 0;

  constructor(query: string) {
    this.tokens = QueryLexer.tokenize(query);
  }

  parse(): QueryNode | null {
    if (this.tokens.length === 0) return null;
    this.pos = 0;
    try {
      return this.parseExpression();
    } catch (e) {
      return null;
    }
  }

  private parseExpression(): QueryNode {
    let node = this.parseTerm();
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos].text.toUpperCase();
      if (token === 'OR') {
        this.pos++;
        const right = this.parseExpression();
        node = { type: 'OR', left: node, right };
      } else if (token === 'AND') {
        this.pos++;
        const right = this.parseTerm();
        node = { type: 'AND', left: node, right };
      } else if (token === ')') {
        break; 
      } else {
        const right = this.parseTerm();
        node = { type: 'AND', left: node, right };
      }
    }
    return node;
  }

  private parseTerm(): QueryNode {
    const token = this.tokens[this.pos++];
    if (!token) return { type: 'TERM', value: '' };

    if (token.text === '(') {
      const node = this.parseExpression();
      if (this.pos < this.tokens.length && this.tokens[this.pos].text === ')') this.pos++;
      return node;
    }

    if (token.text.toUpperCase() === 'NOT') {
      return { type: 'NOT', operand: this.parseTerm() };
    }

    if (this.pos < this.tokens.length && this.tokens[this.pos].text === ':') {
      const field = token.text.replace(/^"(.*)"$/, '$1'); 
      this.pos++;
      if (this.pos < this.tokens.length && this.tokens[this.pos].text === '(') {
          this.pos++;
          const node = this.parseFieldGroup(field);
          if (this.pos < this.tokens.length && this.tokens[this.pos].text === ')') this.pos++;
          return node;
      } else if (this.pos < this.tokens.length) {
          const val = this.tokens[this.pos++].text.replace(/^"(.*)"$/, '$1');
          return { type: 'TERM', value: val, field };
      }
    }

    let value = token.text;
    if (value.startsWith('#')) {
        const content = value.slice(1);
        value = '#' + content.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
    } else {
        value = value.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
    }
    
    if (value === '#' && this.pos < this.tokens.length) {
        const next = this.tokens[this.pos++];
        value = '#' + next.text.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
    }
    
    return { type: 'TERM', value };
  }

  private parseFieldGroup(field: string): QueryNode {
    let node = this.parseFieldValue(field);
    while (this.pos < this.tokens.length && this.tokens[this.pos].text !== ')') {
        const token = this.tokens[this.pos].text.toUpperCase();
        if (token === 'OR') {
            this.pos++;
            const right = this.parseFieldGroup(field);
            node = { type: 'OR', left: node, right };
        } else if (token === 'AND') {
            this.pos++;
            const right = this.parseFieldValue(field);
            node = { type: 'AND', left: node, right };
        } else {
            const right = this.parseFieldValue(field);
            node = { type: 'AND', left: node, right };
        }
    }
    return node;
  }

  private parseFieldValue(field: string): QueryNode {
    const token = this.tokens[this.pos++];
    if (!token) return { type: 'TERM', value: '', field };
    return { type: 'TERM', value: token.text.replace(/^"(.*)"$/, '$1'), field };
  }
}

export function evaluateQuery(node: QueryNode | null, data: any, getEntryTypeConfig: (type: string) => any): boolean {
  if (!node) return true;

  switch (node.type) {
    case 'AND':
      return evaluateQuery(node.left!, data, getEntryTypeConfig) && evaluateQuery(node.right!, data, getEntryTypeConfig);
    case 'OR':
      return evaluateQuery(node.left!, data, getEntryTypeConfig) || evaluateQuery(node.right!, data, getEntryTypeConfig);
    case 'NOT':
      return !evaluateQuery(node.operand!, data, getEntryTypeConfig);
    case 'TERM': {
      const { value, field } = node;
      if (value === undefined) return false;
      const lowerVal = value.toLowerCase();

      if (field) {
        const rawValue = data.frontmatter?.[field] || data[field];
        const config = getEntryTypeConfig(data.type);
        if (config) {
            const fieldDef = config.fields.find((f: any) => f.key === field) || config.metadata.find((m: any) => m.key === field);
            if (fieldDef?.type === 'tags' && Array.isArray(rawValue)) {
                return rawValue.some(tag => String(tag).toLowerCase().includes(lowerVal));
            }
        }
        return String(rawValue || '').toLowerCase().includes(lowerVal);
      }

      if (value.startsWith('#')) {
        const targetTag = value.slice(1).toLowerCase();
        return (data.tags || []).some((t: string) => t.toLowerCase() === targetTag);
      }

      const titleMatch = data.title?.toLowerCase().includes(lowerVal);
      const tagMatch = (data.tags || []).some((t: string) => t.toLowerCase().includes(lowerVal));
      const metadataMatch = Object.values(data.frontmatter || {}).some(v =>
          String(v).toLowerCase().includes(lowerVal)
      );

      return titleMatch || tagMatch || metadataMatch;
    }
  }
}

export interface Suggestion {
  text: string;
  type: 'tag' | 'field' | 'value' | 'operator';
  description?: string;
  icon?: string;
}

export interface SearchMetadata {
  tags: string[];
  fields: string[];
  valuesByField: Record<string, string[]>;
}

export class SearchLogic {
  /**
   * Aggregates available tags, fields, and values from a list of entries.
   */
  static aggregateMetadata(
    entries: any[],
    entryTypes: Record<string, any>
  ): SearchMetadata {
    const tags = new Set<string>();
    const fields = new Set<string>(['tags', 'type']);
    const valuesByField: Record<string, Set<string>> = {
      type: new Set(Object.keys(entryTypes))
    };

    entries.forEach(entry => {
      entry.tags?.forEach((tag: string) => tags.add(tag));
      
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
        typeConfig.metadata?.forEach((m: any) => fields.add(m.key));
        typeConfig.fields?.forEach((f: any) => fields.add(String(f.key)));
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
    metadata: SearchMetadata
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
