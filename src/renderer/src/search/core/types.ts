export type QueryNode =
  | { type: 'AND'; left: QueryNode; right: QueryNode }
  | { type: 'OR'; left: QueryNode; right: QueryNode }
  | { type: 'NOT'; operand: QueryNode }
  | { type: 'TERM'; value: string; field?: string };
