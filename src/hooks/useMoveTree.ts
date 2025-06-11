import { useState, useRef, useCallback, useMemo } from "react";
import { MoveTree } from "../lib/MoveTree";
import { MoveNode } from "../lib/MoveNode";

export const useMoveTree = (initialFen?: string) => {
  const moveTree = useRef<MoveTree>(new MoveTree(initialFen));
  const [currentNode, setCurrentNode] = useState<MoveNode>(
    moveTree.current.root
  );

  const addMove = useCallback(
    (move: string | { from: string; to: string; promotion?: string }) => {
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

  const goForward = useCallback((variationIndex: number = 0) => {
    const nextNode = moveTree.current.goForward(variationIndex);
    if (nextNode) setCurrentNode(nextNode);
  }, []);

  const goToNode = useCallback((nodeId: string) => {
    const targetNode = moveTree.current.goToNode(nodeId);
    if (targetNode) setCurrentNode(targetNode);
  }, []);

  const reset = useCallback((fen?: string) => {
    moveTree.current = new MoveTree(fen);
    setCurrentNode(moveTree.current.root);
  }, []);

  const loadPgn = useCallback((pgn: string) => {
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
    () =>
      currentNode.parent
        ? { from: currentNode.from, to: currentNode.to }
        : null,
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
    toPgn,
  };
};
