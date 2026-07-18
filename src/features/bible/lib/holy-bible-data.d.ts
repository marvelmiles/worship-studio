// Hand-written types for the holy-bible package's data files, which have no
// type declarations of their own. Each file is a flat array of verse strings
// in reading order (see offlineBible.ts). Declaring the shape here means
// TypeScript (both tsc and the editor) never has to open and parse the
// multi-megabyte JSON files just to infer "string[]".

declare module "holy-bible/bibles/kjv.json" {
  const verses: string[];
  export default verses;
}

declare module "holy-bible/bibles/asv.json" {
  const verses: string[];
  export default verses;
}
