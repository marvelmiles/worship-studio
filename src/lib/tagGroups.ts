import type { Slide } from "../types";

export interface TagGroup {
  type: string;
  label: string;
  firstIndex: number;
  shortcutNum: number;
}

/**
 * Strips suffixes added by the parser (" · N/M") and the editor split
 * operation (" (b)", " (c)", …) so that split/chunked slides of the same
 * section share one tag group.
 *
 * Order matters: strip editor-split suffixes first so that a slide like
 * "Verse 1 · 1/2 (b)" reduces to "Verse 1" (not "Verse 1 · 1/2").
 * The `+` handles chained splits such as "Verse 1 (b) (b)".
 */
function baseLabel(label: string): string {
  // Strip all editor split suffixes: " (b)", " (c)", …, " (z)"
  let base = label.replace(/(\s\([b-z]\))+$/, "");
  // Strip parser chunk suffix: " · N/M"
  base = base.replace(/\s·\s\d+\/\d+$/, "");
  return base;
}

/**
 * Returns one entry per unique section label (base label, chunk-suffix stripped),
 * ordered by first appearance. Slides with the same base label (e.g. every
 * repeated [Chorus]) share a single entry pointing to the first occurrence.
 * Slides with different labels but the same type (e.g. Verse 1 vs Verse 2)
 * each get their own entry and shortcut number.
 */
export function computeTagGroups(slides: Slide[]): TagGroup[] {
  const seen = new Set<string>();
  const groups: TagGroup[] = [];
  let num = 1;
  for (let i = 0; i < slides.length; i++) {
    const key = baseLabel(slides[i].label);
    if (!seen.has(key)) {
      seen.add(key);
      groups.push({
        type: slides[i].type,
        label: key,
        firstIndex: i,
        shortcutNum: num++,
      });
    }
  }
  return groups;
}
