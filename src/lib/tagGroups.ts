import type { Slide } from "../types";

export interface TagGroup {
  type: string;
  label: string;
  firstIndex: number;
  /** Only set for verse groups, Ctrl+number jumps are verse-only. */
  shortcutNum?: number;
}

/** Fixed Ctrl+letter shortcuts for non-verse section types, these jump to
 * the first slide of that type instead of being part of the verse numbering. */
export const FIXED_TAG_SHORTCUTS: {
  letter: string;
  type: string;
  label: string;
}[] = [
  { letter: "c", type: "chorus", label: "Chorus" },
  { letter: "b", type: "bridge", label: "Bridge" },
  { letter: "o", type: "outro", label: "Outro" },
  { letter: "t", type: "tag", label: "Tag" },
  { letter: "p", type: "pre-chorus", label: "Pre-Chorus" },
  { letter: "i", type: "intro", label: "Intro" },
  { letter: "r", type: "refrain", label: "Refrain" },
];

export const FIXED_SHORTCUT_BY_LETTER: Record<
  string,
  { type: string; label: string }
> = Object.fromEntries(
  FIXED_TAG_SHORTCUTS.map((f) => [f.letter, { type: f.type, label: f.label }]),
);

export const FIXED_SHORTCUT_BY_TYPE: Record<
  string,
  { letter: string; label: string }
> = Object.fromEntries(
  FIXED_TAG_SHORTCUTS.map((f) => [
    f.type,
    { letter: f.letter, label: f.label },
  ]),
);

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
 * each get their own entry.
 *
 * Only verse groups receive a `shortcutNum` (Ctrl+number jumps are verse-only).
 * Other recognised types (chorus, bridge, outro, tag, pre-chorus, intro,
 * refrain) use the fixed Ctrl+letter shortcuts in `FIXED_TAG_SHORTCUTS` instead.
 */
export function computeTagGroups(slides: Slide[]): TagGroup[] {
  const seen = new Set<string>();
  const groups: TagGroup[] = [];
  let num = 1;
  for (let i = 0; i < slides.length; i++) {
    const key = baseLabel(slides[i].label);
    if (!seen.has(key)) {
      seen.add(key);
      const type = slides[i].type;
      groups.push({
        type,
        label: key,
        firstIndex: i,
        shortcutNum: type === "verse" ? num++ : undefined,
      });
    }
  }
  return groups;
}
