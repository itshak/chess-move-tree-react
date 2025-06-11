// src/pgn-writer.d.ts

// This declares the module so TypeScript knows it exists.
declare module '@mliebelt/pgn-writer' {
  // We define the shape of the class we want to import.
  class PgnWriter {
    constructor(configuration?: any);
    writePgn(game: { headers?: Map<string, string>, moves: any[] }): string;
  }
  
  // This is the most important part. It tells TypeScript that the module's
  // main export IS the PgnWriter class itself. This is what allows
  // `import PgnWriter = require(...)` to work correctly with types.
  export = PgnWriter;
}
