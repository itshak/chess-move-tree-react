import { MoveTree } from "./MoveTree";

describe("MoveTree", () => {
  let tree: MoveTree;

  beforeEach(() => {
    tree = new MoveTree();
  });

  describe("Initialization", () => {
    it("should initialize with the starting FEN by default", () => {
      expect(tree.root.fen).toBe(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      );
      expect(tree.currentNode).toBe(tree.root);
    });

    it("should initialize with a custom FEN", () => {
      const customFen =
        "rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6";
      const customTree = new MoveTree(customFen);
      expect(customTree.root.fen).toBe(customFen);
    });
  });

  describe("Move Management", () => {
    it("should add a valid move and update the current node", () => {
      const initialNode = tree.currentNode;
      const moveResult = tree.addMove("e4");

      expect(moveResult).not.toBeNull();
      expect(tree.currentNode.san).toBe("e4");
      expect(tree.currentNode.parent).toBe(initialNode);
      expect(tree.root.children.length).toBe(1);
      expect(tree.root.children[0].san).toBe("e4");
    });

    it("should return null for an illegal move", () => {
      const moveResult = tree.addMove("e5");
      expect(moveResult).toBeNull();
      expect(tree.currentNode).toBe(tree.root);
    });

    it("should create a variation for a different move from the same position", () => {
      tree.addMove("e4");
      tree.goBack();

      expect(tree.currentNode).toBe(tree.root);

      tree.addMove("d4");

      expect(tree.root.children.length).toBe(2);
      expect(tree.root.children[0].san).toBe("e4");
      expect(tree.root.children[1].san).toBe("d4");
      expect(tree.currentNode.san).toBe("d4");
    });

    it("should switch to an existing variation instead of creating a new one", () => {
      tree.addMove("e4");
      tree.goBack();
      tree.addMove("d4");
      const d4NodeId = tree.currentNode.id;
      tree.goBack();
      tree.addMove("d4");
      expect(tree.root.children.length).toBe(2);
      expect(tree.currentNode.id).toBe(d4NodeId);
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      tree.addMove("e4");
      tree.addMove("e5");
      tree.addMove("Nf3");
    });

    it("should go back one move", () => {
      tree.goBack();
      expect(tree.currentNode.san).toBe("e5");
    });

    it("should not go back past the root node", () => {
      tree.goBack();
      tree.goBack();
      tree.goBack();
      const result = tree.goBack();
      expect(result).toBeNull();
      expect(tree.currentNode).toBe(tree.root);
    });

    it("should go forward to the main line", () => {
      tree.goBack();
      tree.goBack();
      tree.goForward();
      expect(tree.currentNode.san).toBe("e5");
    });

    it("should go to a specific variation", () => {
      tree.goBack();
      tree.goBack();
      tree.addMove("c5");
      tree.goBack();
      expect(tree.root.children[0].children.length).toBe(2);
      tree.goForward(1);
      expect(tree.currentNode.san).toBe("c5");
    });

    it("should jump to a specific node by its ID", () => {
      const e4Node = tree.currentNode.parent!.parent!;
      const nf3Node = tree.currentNode;
      tree.goToNode(e4Node.id);
      expect(tree.currentNode.san).toBe("e4");
      tree.goToNode(nf3Node.id);
      expect(tree.currentNode.san).toBe("Nf3");
    });
  });

  describe("PGN Serialization & Deserialization", () => {
    const pgnWithVariations = "1. e4 (1. d4) 1... e5";

    it("should load a PGN with variations correctly", () => {
      tree.loadPgn(pgnWithVariations);

      expect(tree.root.children.length).toBe(2);
      expect(tree.root.children[0].san).toBe("e4");
      expect(tree.root.children[1].san).toBe("d4");

      const e4Node = tree.root.children[0];
      expect(e4Node.children[0].san).toBe("e5");
    });

    it("should serialize the tree back to a PGN string", () => {
      tree.addMove("e4");
      tree.addMove("e5");
      tree.goBack();
      tree.goBack();
      tree.addMove("d4");

      const generatedPgn = tree.toPgn();
      expect(generatedPgn).toContain("1. e4 (1. d4) 1... e5");
    });
  });

  describe("Complex PGN Navigation and Modification", () => {
    const complexPgn = `
      [Event "?"]
      [Site "?"]
      [Date "2025.05.30"]
      [Round "?"]
      [White "Alexey"]
      [Black "Yan"]
      [Result "1-0"]

      1. e4 (1. d4 Nf6 2. c4 g6 3. Nc3 (3. Nf3 Bg7 4. Nc3 d5) 3... d5) 1... e5 (1... c5 2. Nf3 Nc6 (2... d6 3. Bc4) 3. d4) 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5
    `;

    let tree: MoveTree;

    beforeEach(() => {
      tree = new MoveTree();
      tree.loadPgn(complexPgn);
    });

    it("should correctly parse the initial multi-level structure", () => {
      expect(tree.root.children).toHaveLength(2);
      const e4Node = tree.root.children.find((m) => m.san === "e4");
      const d4Node = tree.root.children.find((m) => m.san === "d4");
      expect(e4Node).toBeDefined();
      expect(d4Node).toBeDefined();

      expect(e4Node!.children).toHaveLength(2);
      const e5Node = e4Node!.children.find((m) => m.san === "e5");
      const c5Node = e4Node!.children.find((m) => m.san === "c5");
      expect(e5Node).toBeDefined();
      expect(c5Node).toBeDefined();

      const g6Node = d4Node!.children[0].children[0].children[0];
      expect(g6Node.san).toBe("g6");
      expect(g6Node.children.map((m) => m.san)).toContain("Nc3");
      expect(g6Node.children.map((m) => m.san)).toContain("Nf3");
    });

    it("should allow navigation across completely different branches", () => {
      const nf3VarPath = ["d4", "Nf6", "c4", "g6", "Nf3", "Bg7"];
      let currentNode = tree.root;
      for (const san of nf3VarPath) {
        const nextNode = currentNode.children.find((m) => m.san === san);
        expect(nextNode).toBeDefined();
        tree.goToNode(nextNode!.id);
        currentNode = nextNode!;
      }
      expect(tree.currentNode.san).toBe("Bg7");

      const e4Node = tree.root.children.find((m) => m.san === "e4")!;
      const c5Node = e4Node.children.find((m) => m.san === "c5")!;
      const d6VarNode = c5Node.children
        .find((m) => m.san === "Nf3")!
        .children.find((m) => m.san === "d6")!;

      tree.goToNode(d6VarNode.id);
      expect(tree.currentNode.san).toBe("d6");
      expect(tree.currentNode.parent!.san).toBe("Nf3");
      expect(tree.currentNode.parent!.parent!.san).toBe("c5");
    });

    it("should add a new variation in the middle of a line", () => {
      const e4Node = tree.root.children.find((m) => m.san === "e4")!;
      const e5Node = e4Node.children.find((m) => m.san === "e5")!;
      const nf3Node = e5Node.children.find((m) => m.san === "Nf3")!;
      tree.goToNode(nf3Node.id);

      expect(tree.currentNode.children).toHaveLength(1);
      expect(tree.currentNode.children[0].san).toBe("Nc6");

      const moveResult = tree.addMove("Nf6");
      expect(moveResult).not.toBeNull();
      expect(tree.currentNode.san).toBe("Nf6");

      tree.goBack();
      expect(tree.currentNode.id).toBe(nf3Node.id);
      expect(tree.currentNode.children).toHaveLength(2);
      expect(tree.currentNode.children.map((m) => m.san)).toEqual(
        expect.arrayContaining(["Nc6", "Nf6"])
      );
    });

    it("should correctly extend the end of the main line", () => {
      tree.goToNode(
        tree.root.children[0].children[0].children[0].children[0].children[0].id
      );
      expect(tree.currentNode.san).toBe("Ng5");

      expect(tree.currentNode.children).toHaveLength(0);

      const moveResult = tree.addMove("d5");
      expect(moveResult).not.toBeNull();
      expect(tree.currentNode.san).toBe("d5");

      tree.goBack();
      expect(tree.currentNode.san).toBe("Ng5");
      expect(tree.currentNode.children).toHaveLength(1);
      expect(tree.currentNode.children[0].san).toBe("d5");
    });
  });
});
