export interface MoveNode {
  id: string;
  san: string;
  fen: string;
  from: string;
  to: string;
  comment?: string;
  nags?: number[];
  parent: MoveNode | null;
  children: MoveNode[];
}
