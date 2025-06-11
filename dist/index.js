"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MoveTree: () => MoveTree,
  useMoveTree: () => useMoveTree
});
module.exports = __toCommonJS(index_exports);

// src/hooks/useMoveTree.ts
var import_react = require("react");

// src/lib/MoveTree.ts
var import_chess = require("chess.js");
var import_pgn_reader = require("@mliebelt/pgn-reader");
var import_pgn_writer = __toESM(require("@mliebelt/pgn-writer"));
var generateId = () => Math.random().toString(36).substring(2, 9);
var MoveTree = class {
  constructor(fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
    this.chess = new import_chess.Chess(fen);
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
    const reader = new import_pgn_reader.PgnReader({ pgn });
    const games = reader.getGames();
    if (!games || games.length === 0) return;
    const parsedPgn = games[0];
    const startFen = parsedPgn.tags?.["FEN"] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    this.chess = new import_chess.Chess(startFen);
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
    const writer = new import_pgn_writer.default();
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
  const moveTree = (0, import_react.useRef)(new MoveTree(initialFen));
  const [currentNode, setCurrentNode] = (0, import_react.useState)(
    moveTree.current.root
  );
  const addMove = (0, import_react.useCallback)(
    (move) => {
      const newNode = moveTree.current.addMove(move);
      if (newNode) setCurrentNode(newNode);
      return !!newNode;
    },
    []
  );
  const goBack = (0, import_react.useCallback)(() => {
    const prevNode = moveTree.current.goBack();
    if (prevNode) setCurrentNode(prevNode);
  }, []);
  const goForward = (0, import_react.useCallback)((variationIndex = 0) => {
    const nextNode = moveTree.current.goForward(variationIndex);
    if (nextNode) setCurrentNode(nextNode);
  }, []);
  const goToNode = (0, import_react.useCallback)((nodeId) => {
    const targetNode = moveTree.current.goToNode(nodeId);
    if (targetNode) setCurrentNode(targetNode);
  }, []);
  const reset = (0, import_react.useCallback)((fen2) => {
    moveTree.current = new MoveTree(fen2);
    setCurrentNode(moveTree.current.root);
  }, []);
  const loadPgn = (0, import_react.useCallback)((pgn) => {
    moveTree.current.loadPgn(pgn);
    setCurrentNode(moveTree.current.root);
  }, []);
  const toPgn = (0, import_react.useCallback)(() => {
    return moveTree.current.toPgn();
  }, []);
  const fen = currentNode.fen;
  const mainline = (0, import_react.useMemo)(
    () => moveTree.current.getMainline(currentNode),
    [currentNode]
  );
  const lastMove = (0, import_react.useMemo)(
    () => currentNode.parent ? { from: currentNode.from, to: currentNode.to } : null,
    [currentNode]
  );
  const legalMoves = (0, import_react.useMemo)(
    () => moveTree.current.getLegalMoves(currentNode),
    [currentNode]
  );
  const turn = (0, import_react.useMemo)(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MoveTree,
  useMoveTree
});
//# sourceMappingURL=index.js.map