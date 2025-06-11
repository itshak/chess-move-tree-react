import { useState, useRef, useCallback, useMemo } from 'react';
import { MoveTree } from '../lib/MoveTree';
import { MoveNode } from '../lib/MoveNode';

export const useMoveTree = (initialFen?: string) => {
  // Use useRef to hold the class instance. It persists across re-renders.
  const moveTree = useRef<MoveTree>(new MoveTree(initialFen));

  // Use useState to track the current node, which will trigger re-renders.
  const [currentNode, setCurrentNode] = useState<MoveNode>(moveTree.current.root);

  const addMove = useCallback((move: string | { from: string; to: string; promotion?: string }) => {
    const newNode = moveTree.current.addMove(move);
    if (newNode) {
      setCurrentNode(newNode);
    }
    // You might want to return the result for UI feedback
    return !!newNode;
  }, []);

  const goBack = useCallback(() => {
    const prevNode = moveTree.current.goBack();
    if (prevNode) {
      setCurrentNode(prevNode);
    }
  }, []);

  const goForward = useCallback((variationIndex: number = 0) => {
    const nextNode = moveTree.current.goForward(variationIndex);
    if (nextNode) {
      setCurrentNode(nextNode);
    }
  }, []);
  
  const goToNode = useCallback((nodeId: string) => {
    const targetNode = moveTree.current.goToNode(nodeId);
    if (targetNode) {
        setCurrentNode(targetNode);
    }
  }, []);

  // Expose useful state derived from the current node
  const fen = currentNode.fen;
  const variations = currentNode.children;
  const canGoBack = !!currentNode.parent;
  const canGoForward = currentNode.children.length > 0;

  // Function to reset the tree or load a new position
  const reset = useCallback((fen?: string) => {
    moveTree.current = new MoveTree(fen);
    setCurrentNode(moveTree.current.root);
  }, []);

  return {
    // State
    fen,
    currentNode,
    variations,
    canGoBack,
    canGoForward,
    
    // Methods
    addMove,
    goBack,
    goForward,
    goToNode,
    reset,
    
    // We can also expose the entire tree if needed for complex rendering
    root: moveTree.current.root,
  };
};
