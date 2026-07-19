// Types for the holy-bible data files. Declaring the shape here stops
// TypeScript from parsing the multi-megabyte JSON just to infer "string[]".

declare module "holy-bible/bibles/kjv.json" {
  const verses: string[];
  export default verses;
}

declare module "holy-bible/bibles/asv.json" {
  const verses: string[];
  export default verses;
}
