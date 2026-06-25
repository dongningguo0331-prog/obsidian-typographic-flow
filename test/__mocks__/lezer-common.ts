export interface SyntaxNode {
  type: { name: string };
  from: number;
  to: number;
  firstChild: SyntaxNode | null;
}
