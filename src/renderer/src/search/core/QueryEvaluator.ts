import { QueryNode } from './types';

export function evaluateQuery(node: QueryNode | null, data: any, getEntryTypeConfig: any): boolean {
  if (!node) return true;

  switch (node.type) {
    case 'AND':
      return evaluateQuery(node.left, data, getEntryTypeConfig) && evaluateQuery(node.right, data, getEntryTypeConfig);
    case 'OR':
      return evaluateQuery(node.left, data, getEntryTypeConfig) || evaluateQuery(node.right, data, getEntryTypeConfig);
    case 'NOT':
      return !evaluateQuery(node.operand, data, getEntryTypeConfig);
    case 'TERM': {
      const { value, field } = node;
      const lowerVal = value.toLowerCase();

      // Field specific search
      if (field) {
        const rawValue = data.frontmatter?.[field] || data[field];
        
        // Handle tags type specially
        const config = getEntryTypeConfig(data.type);
        if (config) {
            const fieldDef = config.fields.find((f: any) => f.key === field) || config.metadata.find((m: any) => m.key === field);
            
            if (fieldDef?.type === 'tags' && Array.isArray(rawValue)) {
                return rawValue.some(tag => String(tag).toLowerCase().includes(lowerVal));
            }
        }
        
        return String(rawValue || '').toLowerCase().includes(lowerVal);
      }

      // Tag match
      if (value.startsWith('#')) {
        const targetTag = value.slice(1).toLowerCase();
        return (data.tags || []).some((t: string) => t.toLowerCase() === targetTag);
      }

      // General search
      const titleMatch = data.title?.toLowerCase().includes(lowerVal);
      const tagMatch = (data.tags || []).some((t: string) => t.toLowerCase().includes(lowerVal));
      const metadataMatch = Object.values(data.frontmatter || {}).some(v =>
          String(v).toLowerCase().includes(lowerVal)
      );

      return titleMatch || tagMatch || metadataMatch;
    }
  }
}
