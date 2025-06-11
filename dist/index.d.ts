interface MoveNode {
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

declare const useMoveTree: (initialFen?: string) => {
    fen: string;
    turn: "w" | "b";
    mainline: MoveNode[];
    lastMove: {
        from: string;
        to: string;
    } | null;
    legalMoves: string[];
    variations: MoveNode[];
    currentNode: MoveNode;
    root: MoveNode;
    addMove: (move: string | {
        from: string;
        to: string;
        promotion?: string;
    }) => boolean;
    goBack: () => void;
    goForward: (variationIndex?: number) => void;
    goToNode: (nodeId: string) => void;
    reset: (fen?: string) => void;
    loadPgn: (pgn: string) => void;
    toPgn: () => string;
};

declare class MoveTree {
    private chess;
    root: MoveNode;
    currentNode: MoveNode;
    constructor(fen?: string);
    private createNode;
    addMove(move: string | {
        from: string;
        to: string;
        promotion?: string;
    }): MoveNode | null;
    goBack(): MoveNode | null;
    goForward(variationIndex?: number): MoveNode | null;
    goToNode(nodeId: string): MoveNode | null;
    getMainline(node?: MoveNode): MoveNode[];
    getLegalMoves(node?: MoveNode): string[];
    getTurn(node?: MoveNode): "w" | "b";
    loadPgn(pgn: string): void;
    private buildTreeFromParsed;
    toPgn(): string;
    private buildPgnMoves;
}

export { type MoveNode, MoveTree, useMoveTree };
