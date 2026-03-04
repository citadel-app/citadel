import { QueryLexer, Token } from './QueryLexer';
import { QueryNode } from './types';

export class QueryParser {
  private tokens: Token[] = [];
  private pos = 0;

  constructor(query: string) {
    this.tokens = QueryLexer.tokenize(query);
  }

  // AST
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
        // Implicit AND
        const right = this.parseTerm();
        node = { type: 'AND', left: node, right };
      }
    }
    return node;
  }

  private parseTerm(): QueryNode {
    const token = this.tokens[this.pos++];

    if (!token) {
      return { type: 'TERM', value: '' };
    }

    if (token.text === '(') {
      const node = this.parseExpression();
      if (this.pos < this.tokens.length && this.tokens[this.pos].text === ')') this.pos++;
      return node;
    }

    if (token.text.toUpperCase() === 'NOT') {
      return { type: 'NOT', operand: this.parseTerm() };
    }

    // Check for key:value or key:(...)
    if (this.pos < this.tokens.length && this.tokens[this.pos].text === ':') {
      const field = token.text.replace(/^"(.*)"$/, '$1'); 
      this.pos++; // consume ':'
      
      if (this.pos < this.tokens.length && this.tokens[this.pos].text === '(') {
          this.pos++; // consume '('
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
    if (!token) {
      return { type: 'TERM', value: '', field };
    }
    return { type: 'TERM', value: token.text.replace(/^"(.*)"$/, '$1'), field };
  }
}
