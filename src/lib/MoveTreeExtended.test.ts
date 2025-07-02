import { MoveTree } from './MoveTree';
import { Chess } from 'chess.js';

describe('MoveTreeExtended', () => {
  describe('PGN Reading', () => {
    it('should read a PGN with multiple variations', () => {
      const pgn = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6';
      const moveTree = new MoveTree(pgn);
      expect(moveTree.root.children.length).toBe(1);
      expect(moveTree.root.children[0].san).toBe('e4');
      expect(moveTree.root.children[0].children.length).toBe(2);
      expect(moveTree.root.children[0].children[0].san).toBe('e5');
      expect(moveTree.root.children[0].children[1].san).toBe('c5');
      expect(moveTree.root.children[0].children[1].children[0].san).toBe('Nf3');
    });

    it('should read a PGN with nested variations', () => {
      const pgn = '1. e4 e5 (1... c5 2. Nf3 (2... Nc6)) 2. Nf3 Nc6';
      const moveTree = new MoveTree(pgn);
      expect(moveTree.root.children.length).toBe(1);
      expect(moveTree.root.children[0].san).toBe('e4');
      expect(moveTree.root.children[0].children.length).toBe(2);
      expect(moveTree.root.children[0].children[0].san).toBe('e5');
      expect(moveTree.root.children[0].children[1].san).toBe('c5');
      expect(moveTree.root.children[0].children[1].children.length).toBe(1);
      expect(moveTree.root.children[0].children[1].children[0].san).toBe('Nf3');
      expect(moveTree.root.children[0].children[1].children[0].children.length).toBe(1);
      expect(moveTree.root.children[0].children[1].children[0].children[0].san).toBe('Nc6');
    });

    it('should read a PGN with comments', () => {
        const pgn = '1. e4 e5 {This is a comment} 2. Nf3 Nc6';
        const moveTree = new MoveTree(pgn);
        expect(moveTree.root.children[0].children[0].comment).toBe('This is a comment');
    });
  });

  describe('PGN Writing', () => {
    it('should write a PGN with multiple variations', () => {
      const pgn = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6';
      const moveTree = new MoveTree(pgn);
      const writtenPgn = moveTree.renderPgn();
      expect(writtenPgn).toBe('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6');
    });

    it('should write a PGN with nested variations', () => {
        const pgn = '1. e4 e5 (1... c5 2. Nf3 (2... Nc6)) 2. Nf3 Nc6';
        const moveTree = new MoveTree(pgn);
        const writtenPgn = moveTree.renderPgn();
        expect(writtenPgn).toBe("1. e4 e5 (1... c5 2. Nf3 (2... Nc6)) 2. Nf3 Nc6")
    });
  });
});