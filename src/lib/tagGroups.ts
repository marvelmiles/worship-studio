import type { Slide } from "../types";

export interface TagGroup {
  type: string;
  label: string;
  firstIndex: number;
  shortcutNum: number;
}

/** Strips the " · N/M" chunk suffix that the parser appends to long sections. */
function baseLabel(label: string): string {
  return label.replace(/\s·\s\d+\/\d+$/, "");
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
