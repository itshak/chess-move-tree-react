// src/hooks/useMoveTree.ts
import { useState, useRef, useCallback, useMemo } from "react";

// src/lib/MoveTree.ts
import { Chess } from "chess.js";
import { PgnReader } from "@mliebelt/pgn-reader";
import PgnWriter from "@mliebelt/pgn-writer";
var generateId = () => Math.random().toString(36).substring(2, 9);
var MoveTree = class {
  constructor(fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
    this.chess = new Chess(fen);
    this.root = this.createNode(null, "start", fen, "a0", "a0");
    this.currentNode = this.root;
  }
  createNode(parent, san, fen, from, to) {
    return { id: generateId(), parent, san, fen, from, to, children: [] };
  }
  addMove(move) {
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
  goBack() {
    if (this.currentNode.parent) {
      this.currentNode = this.currentNode.parent;
      this.chess.load(this.currentNode.fen);
      return this.currentNode;
    }
    return null;
  }
  goForward(variationIndex = 0) {
    const childNode = this.currentNode.children[variationIndex];
    if (childNode) {
      this.currentNode = childNode;
      this.chess.load(this.currentNode.fen);
      return childNode;
    }
    return null;
  }
  goToNode(nodeId) {
    const findNode = (node) => {
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
  getMainline(node = this.currentNode) {
    const line = [];
    let current = node;
    while (current && current.parent) {
      line.push(current);
      current = current.parent;
    }
    return line.reverse();
  }
  getLegalMoves(node = this.currentNode) {
    this.chess.load(node.fen);
    return this.chess.moves();
  }
  getTurn(node = this.currentNode) {
    this.chess.load(node.fen);
    return this.chess.turn();
  }
  loadPgn(pgn) {
    const reader = new PgnReader({ pgn });
    const games = reader.getGames();
    if (!games || games.length === 0) return;
    const parsedPgn = games[0];
    const startFen = parsedPgn.tags?.["FEN"] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    this.chess = new Chess(startFen);
    this.root = this.createNode(null, "start", startFen, "a0", "a0");
    this.buildTreeFromParsed(parsedPgn.moves, this.root);
    this.currentNode = this.root;
    this.chess.load(this.root.fen);
  }
  buildTreeFromParsed(moves, parentNode) {
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
        mainMove.variations.forEach((variation) => {
          this.buildTreeFromParsed(variation, parentNode);
        });
        this.buildTreeFromParsed(moves.slice(1), newNode);
      }
    } catch (e) {
    }
  }
  toPgn() {
    const writer = new PgnWriter();
    const headers = /* @__PURE__ */ new Map();
    if (this.root.fen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
      headers.set("FEN", this.root.fen);
      headers.set("SetUp", "1");
    }
    const pgnData = { headers, moves: this.buildPgnMoves(this.root) };
    return writer.writePgn(pgnData);
  }
  buildPgnMoves(node) {
    if (node.children.length === 0) return [];
    const mainMoveNode = node.children[0];
    const mainMovePgn = {
      notation: { notation: mainMoveNode.san },
      comment: mainMoveNode.comment,
      nags: mainMoveNode.nags,
      variations: []
    };
    for (let i = 1; i < node.children.length; i++) {
      const variationNode = node.children[i];
      mainMovePgn.variations.push(this.buildPgnMoves(variationNode));
    }
    const nextMoves = this.buildPgnMoves(mainMoveNode);
    return [mainMovePgn, ...nextMoves];
  }
};

// src/hooks/useMoveTree.ts
var useMoveTree = (initialFen) => {
  const moveTree = useRef(new MoveTree(initialFen));
  const [currentNode, setCurrentNode] = useState(
    moveTree.current.root
  );
  const addMove = useCallback(
    (move) => {
      const newNode = moveTree.current.addMove(move);
      if (newNode) setCurrentNode(newNode);
      return !!newNode;
    },
    []
  );
  const goBack = useCallback(() => {
    const prevNode = moveTree.current.goBack();
    if (prevNode) setCurrentNode(prevNode);
  }, []);
  const goForward = useCallback((variationIndex = 0) => {
    const nextNode = moveTree.current.goForward(variationIndex);
    if (nextNode) setCurrentNode(nextNode);
  }, []);
  const goToNode = useCallback((nodeId) => {
    const targetNode = moveTree.current.goToNode(nodeId);
    if (targetNode) setCurrentNode(targetNode);
  }, []);
  const reset = useCallback((fen2) => {
    moveTree.current = new MoveTree(fen2);
    setCurrentNode(moveTree.current.root);
  }, []);
  const loadPgn = useCallback((pgn) => {
    moveTree.current.loadPgn(pgn);
    setCurrentNode(moveTree.current.root);
  }, []);
  const toPgn = useCallback(() => {
    return moveTree.current.toPgn();
  }, []);
  const fen = currentNode.fen;
  const mainline = useMemo(
    () => moveTree.current.getMainline(currentNode),
    [currentNode]
  );
  const lastMove = useMemo(
    () => currentNode.parent ? { from: currentNode.from, to: currentNode.to } : null,
    [currentNode]
  );
  const legalMoves = useMemo(
    () => moveTree.current.getLegalMoves(currentNode),
    [currentNode]
  );
  const turn = useMemo(
    () => moveTree.current.getTurn(currentNode),
    [currentNode]
  );
  return {
    fen,
    turn,
    mainline,
    lastMove,
    legalMoves,
    variations: currentNode.children,
    currentNode,
    root: moveTree.current.root,
    addMove,
    goBack,
    goForward,
    goToNode,
    reset,
    loadPgn,
    toPgn
  };
};
export {
  MoveTree,
  useMoveTree
};
//# sourceMappingURL=index.mjs.map