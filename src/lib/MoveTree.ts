import { Chess } from "chess.js";
import { MoveNode } from "./MoveNode";
import { PgnReader } from "@mliebelt/pgn-reader";
import PgnWriter = require("@mliebelt/pgn-writer");

const generateId = () => Math.random().toString(36).substring(2, 9);

export class MoveTree {
  private chess: Chess;
  public root: MoveNode;
  public currentNode: MoveNode;

  constructor(
    fen: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  ) {
    this.chess = new Chess(fen);
    this.root = this.createNode(null, "start", fen, "a0", "a0");
    this.currentNode = this.root;
  }

  private createNode(
    parent: MoveNode | null,
    san: string,
    fen: string,
    from: string,
    to: string
  ): MoveNode {
    return { id: generateId(), parent, san, fen, from, to, children: [] };
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
      result.to
    );
    this.currentNode.children.push(newNode);
    this.currentNode = newNode;
    return newNode;
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
    const reader = new PgnReader({ pgn });
    const games = reader.getGames();
    if (!games || games.length === 0) return;
    const parsedPgn = games[0];
    const startFen =
      parsedPgn.headers.find((h: any) => h.name === "FEN")?.value ||
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    this.chess = new Chess(startFen);
    this.root = this.createNode(null, "start", startFen, "a0", "a0");
    this.buildTreeFromParsed(parsedPgn.moves, this.root);
    this.currentNode = this.root;
    this.chess.load(this.root.fen);
  }

  private buildTreeFromParsed(moves: any[], parentNode: MoveNode) {
    if (!moves || moves.length === 0) return;
    this.chess.load(parentNode.fen);
    const mainMove = moves[0];
    try {
      const result = this.chess.move(mainMove.notation.notation);
      if (result) {
        const newNode = this.createNode(
          parentNode,
          result.san,
          this.chess.fen(),
          result.from,
          result.to
        );
        newNode.comment = mainMove.comment;
        newNode.nags = mainMove.nags;
        parentNode.children.push(newNode);
        mainMove.variations.forEach((variation: any[]) => {
          this.buildTreeFromParsed(variation, parentNode);
        });
        this.buildTreeFromParsed(moves.slice(1), newNode);
      }
    } catch (e) {
      /* Ignore illegal moves in PGN */
    }
  }

  public toPgn(): string {
    const writer = new PgnWriter();
    const headers = new Map();
    if (
      this.root.fen !==
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    ) {
      headers.set("FEN", this.root.fen);
      headers.set("SetUp", "1");
    }
    const pgnData = { headers, moves: this.buildPgnMoves(this.root) };
    return writer.writePgn(pgnData);
  }

  private buildPgnMoves(node: MoveNode): any[] {
    if (node.children.length === 0) return [];
    const mainMoveNode = node.children[0];
    const mainMovePgn: any = {
      notation: { notation: mainMoveNode.san },
      comment: mainMoveNode.comment,
      nags: mainMoveNode.nags,
      variations: [],
    };
    for (let i = 1; i < node.children.length; i++) {
      const variationNode = node.children[i];
      mainMovePgn.variations.push(this.buildPgnMoves(variationNode));
    }
    const nextMoves = this.buildPgnMoves(mainMoveNode);
    return [mainMovePgn, ...nextMoves];
  }
}
