import type { Slide } from "../types";

export interface TagGroup {
  type: string;
  label: string;
  firstIndex: number;
  shortcutNum?: number;
}

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

const baseLabel = (label: string): string => {
  let base = label.replace(/(\s\([b-z]\))+$/, "");
  base = base.replace(/\s·\s\d+\/\d+$/, "");
  return base;
};

export const computeTagGroups = (slides: Slide[]): TagGroup[] => {
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
};
