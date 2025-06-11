# Chess-Move-Tree-React: A React Hook for Chess Variation Management

A lightweight, powerful, and React-first library for managing chess game state, including complex variations, PGN import/export, and seamless integration with `chess.js` and chessboard components.

There is a noticeable gap in the React ecosystem for a simple, hook-based way to manage a chess game's move tree. Libraries like `chess.js` are excellent state engines but only track a single, linear history. This library solves that problem.

- **React-First:** Built around a single custom hook, `useMoveTree`.
- **Variation Support:** Easily create, view, and switch between different lines of play.
- **PGN Serialization:** Load games from PGN strings and export your game tree back to PGN.
- **Immutable State:** Designed to work flawlessly with React's render cycle.
- **TypeScript-Ready:** Fully typed for a superior development experience.

## Installation

```bash
npm install chess-move-tree-react
```

Your project must also have `react` and `chess.js` as dependencies.

```bash
npm install react chess.js
```

## Quick Start

```tsx
// src/components/MyChessGame.tsx
import React from "react";
import { useMoveTree } from "chess-move-tree-react"; // Import from your published package
// Example using react-chessboard
// import { Chessboard } from 'react-chessboard';

function MyChessGame() {
  const { fen, turn, mainline, addMove, goBack, goForward } = useMoveTree();

  // This would be called by your chessboard component's onDrop event
  function handleMove(sourceSquare: string, targetSquare: string) {
    addMove({ from: sourceSquare, to: targetSquare });
  }

  return (
    <div>
      {/* <Chessboard position={fen} onPieceDrop={handleMove} /> */}
      <p>Current FEN: {fen}</p>
      <p>Turn: {turn === "w" ? "White" : "Black"}</p>

      <div>
        <button onClick={goBack}>Back</button>
        <button onClick={() => goForward()}>Forward</button>
      </div>

      <h3>Moves:</h3>
      <div style={{ fontFamily: "monospace" }}>
        {mainline.map((move, i) => (
          <span key={move.id}>
            {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
            {move.san}{" "}
          </span>
        ))}
      </div>
    </div>
  );
}
```

---

## API Reference: `useMoveTree()`

This is the main hook and your primary interface with the library.

`const { ... } = useMoveTree(initialFen?: string)`

### Returned State

These are memoized state variables that will trigger re-renders when they change.

| Name              | Type                                   | Description                                                                                                                                             |
| :---------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`fen`**         | `string`                               | The FEN string of the current board position. Use this for your chessboard's `position` prop.                                                           |
| **`turn`**        | `'w' \| 'b'`                           | The current player to move.                                                                                                                             |
| **`mainline`**    | `MoveNode[]`                           | An array of `MoveNode` objects from the start of the game to the `currentNode`. Perfect for displaying the current move list.                           |
| **`lastMove`**    | `{ from: string, to: string } \| null` | An object containing the from/to squares of the last move. Ideal for highlighting squares on the board.                                                 |
| **`legalMoves`**  | `string[]`                             | An array of all **theoretically legal moves** (in SAN) from the current position, provided by `chess.js`.                                               |
| **`variations`**  | `MoveNode[]`                           | An array of all **known child moves** branching from the current position in the tree. Use this to show the user what lines have already been explored. |
| **`currentNode`** | `MoveNode`                             | The raw `MoveNode` object for the current position. Contains all data for the current move.                                                             |
| **`root`**        | `MoveNode`                             | The root node of the entire move tree. Useful for building a full tree view.                                                                            |

### Returned Methods

These are memoized callback functions to interact with the game state.

| Name            | Signature                                                   | Description                                                                                    |
| :-------------- | :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **`addMove`**   | `(move: string \| { from: string, to: string }) => boolean` | Adds a move to the current node. Creates a new variation if needed. Returns `true` on success. |
| **`goBack`**    | `() => void`                                                | Navigates to the parent of the current node.                                                   |
| **`goForward`** | `(variationIndex?: number) => void`                         | Navigates to a child node. Defaults to the main line (`variationIndex = 0`).                   |
| **`goToNode`**  | `(nodeId: string) => void`                                  | Jumps directly to any node in the tree by its unique ID.                                       |
| **`loadPgn`**   | `(pgn: string) => void`                                     | Clears the current tree and loads a new one from a PGN string.                                 |
| **`toPgn`**     | `() => string`                                              | Serializes the entire move tree into a PGN string.                                             |
| **`reset`**     | `(fen?: string) => void`                                    | Resets the game to the initial position or a custom FEN.                                       |

---

## Advanced Usage & Recipes

### Displaying Explored Variations

Use the `variations` property to show the user which lines have been played or loaded from the current position.

```tsx
function AnalysisPanel() {
  const { variations, goToNode } = useMoveTree();

  return (
    <div>
      <h4>Explored Lines from This Position:</h4>
      {variations.length > 0 ? (
        variations.map((move, index) => (
          <button key={move.id} onClick={() => goToNode(move.id)}>
            {index === 0 && <strong>(Main Line) </strong>}
            {move.san}
          </button>
        ))
      ) : (
        <p>No lines have been explored from here.</p>
      )}
    </div>
  );
}
```

### Highlighting the Last Move

If you use `react-chessboard`, you can use the `lastMove` state to style the board.

```tsx
import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
// ...
const { fen, lastMove, addMove } = useMoveTree();

function handleBoardMove(sourceSquare, targetSquare) {
  addMove({ from: sourceSquare, to: targetSquare });
  return true;
}

const squareStyles = useMemo(() => {
  if (!lastMove) return {};
  return {
    [lastMove.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
    [lastMove.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
  };
}, [lastMove]);

return (
  <Chessboard
    position={fen}
    onPieceDrop={handleBoardMove}
    customSquareStyles={squareStyles}
  />
);
```
