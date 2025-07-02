import { Chess } from "chess.js";
import { MoveNode } from "./MoveNode";
import { parse } from "@mliebelt/pgn-parser";
// @ts-ignore: No types for this commonjs module, we'll require at runtime when needed

const generateId = () => Math.random().toString(36).substring(2, 9);

export class MoveTree {
  private chess: Chess;
  public root: MoveNode;
  public currentNode: MoveNode;
  public nodes: MoveNode[];

  constructor(
    pgnOrFen: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  ) {
    this.chess = new Chess();
    this.nodes = [];
    this.root = this.createNode(null, "start", this.chess.fen(), "a0", "a0", 0, 'w');
    this.currentNode = this.root;

    // Check if the input is a FEN or a PGN
    if (pgnOrFen.includes(' ') || pgnOrFen.includes('/')) {
        try {
            this.chess.load(pgnOrFen);
            this.root = this.createNode(null, "start", this.chess.fen(), "a0", "a0", 0, 'w');
        } catch (e) {
            this.loadPgn(pgnOrFen);
            return;
        }
    } else {
        this.loadPgn(pgnOrFen);
        return;
    }

    this.currentNode = this.root;
  }

  private createNode(
    parent: MoveNode | null,
    san: string,
    fen: string,
    from: string,
    to: string,
    moveNumber: number,
    turn: 'w' | 'b'
  ): MoveNode {
    const newNode = { id: generateId(), parent, san, fen, from, to, children: [], moveNumber, turn };
    this.nodes.push(newNode);
    return newNode;
  }

  public addMove(
    move: string | { from: string; to: string; promotion?: string }
  ): MoveNode | null {
    this.chess.load(this.currentNode.fen);
    let result;
    try {
      result = this.chess.move(move);
    } catch (e) {
      return null;
    }
    if (!result) return null;

    const existingNode = this.currentNode.children.find(
      (child) => child.san === result.san
    );
    if (existingNode) {
      this.currentNode = existingNode;
      return existingNode;
    }

    const newNode = this.createNode(
      this.currentNode,
      result.san,
      this.chess.fen(),
      result.from,
      result.to,
      this.chess.moveNumber(),
      this.chess.turn()
    );
    this.currentNode.children.push(newNode);
    this.currentNode = newNode;
    return newNode;
  }

  public addVariation(san: string, afterMove: string) {
    const parentNode = this.findNodeByMove(afterMove);
    if (!parentNode || !parentNode.parent) {
      return;
    }

    this.chess.load(parentNode.parent.fen);
    const move = this.chess.move(san);
    if (!move) {
      return;
    }

    const newNode = this.createNode(
      parentNode.parent,
      move.san,
      this.chess.fen(),
      move.from,
      move.to,
      this.chess.moveNumber(),
      this.chess.turn()
    );

    parentNode.parent.children.push(newNode);
  }

  public deleteVariation(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || !node.parent) {
      return;
    }

    const parent = node.parent;
    parent.children = parent.children.filter(child => child.id !== nodeId);
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
  }

  public findNodeByMove(move: string): MoveNode | undefined {
    return this.nodes.find(node => node.san === move);
  }

  public renderPgn(): string {
    return this.toPgn();
  }

  public goBack(): MoveNode | null {
    if (this.currentNode.parent) {
      this.currentNode = this.currentNode.parent;
      this.chess.load(this.currentNode.fen);
      return this.currentNode;
    }
    return null;
  }

  public goForward(variationIndex: number = 0): MoveNode | null {
    const childNode = this.currentNode.children[variationIndex];
    if (childNode) {
      this.currentNode = childNode;
      this.chess.load(this.currentNode.fen);
      return childNode;
    }
    return null;
  }

  public goToNode(nodeId: string): MoveNode | null {
    const findNode = (node: MoveNode): MoveNode | null => {
      if (node.id === nodeId) return node;
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
      return null;
    };
    const targetNode = findNode(this.root);
    if (targetNode) {
      this.currentNode = targetNode;
      this.chess.load(this.currentNode.fen);
    }
    return targetNode;
  }

  public getMainline(node: MoveNode = this.currentNode): MoveNode[] {
    const line: MoveNode[] = [];
    let current: MoveNode | null = node;
    while (current && current.parent) {
      line.push(current);
      current = current.parent;
    }
    return line.reverse();
  }

  public getLegalMoves(node: MoveNode = this.currentNode): string[] {
    this.chess.load(node.fen);
    return this.chess.moves();
  }

  public getTurn(node: MoveNode = this.currentNode): "w" | "b" {
    this.chess.load(node.fen);
    return this.chess.turn();
  }

  public loadPgn(pgn: string) {
    let games;
    try {
      games = parse(pgn, { startRule: "games" }) as any[];
    } catch (_e) {
      try {
        const singleGame = parse(pgn, { startRule: "game" });
        games = [singleGame];
      } catch (err) {
        return;
      }
    }

    if (!games || games.length === 0) return;
    const parsedPgn = games[0];
    

    const startFen =
      parsedPgn.tags?.["FEN"] ||
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    this.chess = new Chess(startFen);
    this.nodes = [];
    this.root = this.createNode(null, "start", startFen, "a0", "a0", 0, 'w');
    this.currentNode = this.root;

    // For each top-level move in the parsed PGN, build a separate branch from the root
    this.buildTreeFromParsed(parsedPgn.moves, this.root, new Chess(startFen));
  }

  private buildTreeFromParsed(
    moves: any[],
    parentNode: MoveNode,
    chessState: Chess
  ) {
    if (!moves || moves.length === 0) {
      return;
    }

    let currentChess = new Chess(chessState.fen());
    let currentParent = parentNode;

    for (const moveData of moves) {
      try {
        const result = currentChess.move(moveData.notation.notation);
        if (result) {
          const newNode = this.createNode(
            currentParent,
            result.san,
            currentChess.fen(),
            result.from,
            result.to,
            moveData.moveNumber || currentChess.moveNumber(),
            currentChess.turn()
          );
          currentParent.children.push(newNode);

          newNode.comment = moveData.comment || moveData.commentDiag?.comment || moveData.commentAfter;
          newNode.nags = moveData.nags;

          // Process variations branching from the *currentParent* (before moving to newNode)
          if (moveData.variations && moveData.variations.length > 0) {
            moveData.variations.forEach((variation: any[]) => {
              this.buildTreeFromParsed(
                variation,
                currentParent, // Variations branch from the parent of the current node
                new Chess(fenBeforeMove) // Variations start from the FEN before the current move was made
              );
            });
          }

          currentParent = newNode;
        }
      } catch (e) {
        break;
      }
    }
  }

  public toPgn(): string {
    const headers = new Map<string, string>();
    if (
      this.root.fen !==
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    ) {
      headers.set("FEN", this.root.fen);
      headers.set("SetUp", "1");
    }

    const generatePgnRecursive = (node: MoveNode, currentChess: Chess, isVariation: boolean): string => {
      let pgnPart = "";

      if (node.san === "start") {
        // Main line
        if (node.children.length > 0) {
          pgnPart += generatePgnRecursive(node.children[0], new Chess(currentChess.fen()), false);
        }

        // Variations from the root
        const variations = [...node.children.slice(1)].sort((a, b) => a.san.localeCompare(b.san));
        for (const variationNode of variations) {
          pgnPart += ` (${generatePgnRecursive(variationNode, new Chess(currentChess.fen()), true)})`;
        }
        return pgnPart.trim();
      }

      // For a regular move node
      const tempChess = new Chess(currentChess.fen());
      const moveResult = tempChess.move({ from: node.from, to: node.to });

      if (!moveResult) {
        return "";
      }

      const moveNumber = node.moveNumber;
      const turn = node.turn;

      let prefix = "";
      if (turn === "w") {
        prefix = `${moveNumber}. `;
      } else if (isVariation) {
        prefix = `${moveNumber}... `;
      }

      pgnPart += `${prefix}${node.san}`;

      if (node.comment) {
        pgnPart += ` {${node.comment}}`;
      }

      // Variations branching from this move
      const variations = [...node.children.slice(1)].sort((a, b) => a.san.localeCompare(b.san));
      for (const variationNode of variations) {
        pgnPart += ` (${generatePgnRecursive(variationNode, new Chess(currentChess.fen()), true)})`;
      }

      // Continue main line
      if (node.children.length > 0) {
        pgnPart += ` ${generatePgnRecursive(node.children[0], tempChess, false)}`;
      }

      return pgnPart.trim();
    };

    let pgnMoves = generatePgnRecursive(this.root, new Chess(this.root.fen), false);

    let headerString = "";
    headers.forEach((value, key) => {
      headerString += `[${key} \"${value}\"]\n`;
    });

    return `${headerString}${pgnMoves}`.trim();
  }
}
