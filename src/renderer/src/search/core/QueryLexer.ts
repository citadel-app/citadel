export interface Token {
  text: string;
  start: number;
  end: number;
}

export class QueryLexer {
  /**
   * Tokenizer regex: matches quotes (with optional # or key: prefix), parentheses, and operators.
   * Includes lookbehind/lookahead for prefixes like # or key:.
   */
  static readonly TOKEN_REGEX = /#?"(?:\\"|[^"])*"|#?[^\s"():]+|:|(?<=\w+):|[()]/g;

  /**
   * Tokenizes a query string into a list of tokens with their offsets.
   */
  static tokenize(query: string): Token[] {
    const tokens: Token[] = [];
    let match;
    
    // Reset regex state since it's global
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
