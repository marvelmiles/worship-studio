import type { Slide } from "../types";
import { uid } from "./id";

interface SectionMeta {
  type: string;
  label: string;
}

/** Maps a recognised tag key to its slide type and display label. [solo] is
 * treated as a verse so it shares verse numbering and the verse-only
 * Ctrl+number jump shortcuts. */
export const SECTION_MAP: Record<string, SectionMeta> = {
  intro: { type: "intro", label: "Intro" },
  verse: { type: "verse", label: "Verse" },
  solo: { type: "verse", label: "Verse" },
  chorus: { type: "chorus", label: "Chorus" },
  bridge: { type: "bridge", label: "Bridge" },
  outro: { type: "outro", label: "Outro" },
  tag: { type: "tag", label: "Tag" },
  refrain: { type: "refrain", label: "Refrain" },
  prechorus: { type: "pre-chorus", label: "Pre-Chorus" },
  "pre-chorus": { type: "pre-chorus", label: "Pre-Chorus" },
  "pre chorus": { type: "pre-chorus", label: "Pre-Chorus" },
  ending: { type: "ending", label: "Ending" },
};

interface Section {
  type: string;
  baseLabel: string;
  /** Explicit number from the tag itself, e.g. "Verse 3" -> 3. Null if untagged. */
  explicitNum: number | null;
  lines: string[];
}

/** Splits a tag's inner text into its base name and an optional trailing
 * number, e.g. "Verse 3" / "Verse-3" / "Verse3" -> { base: "Verse", num: 3 }. */
function splitTagNumber(raw: string): { base: string; num: number | null } {
  const m = raw.match(/^(.*?)[\s-]*(\d+)$/);
  if (m && m[1].trim()) return { base: m[1].trim(), num: parseInt(m[2], 10) };
  return { base: raw.trim(), num: null };
}

/** Split a section's lines into slide chunks. Blank lines are hard breaks. */
function chunkLines(lines: string[], maxLines: number): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) {
      out.push(cur);
      cur = [];
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    if (line.trim() === "") {
      flush();
      continue;
    }
    cur.push(line);
    if (cur.length >= maxLines) flush();
  }
  flush();
  return out.length ? out : [[]];
}

/**
 * Convert raw lyrics into slides.
 * - Recognises [verse], [chorus], [bridge], [intro], [outro], [tag],
 *   [refrain], [pre-chorus] (and custom tags). [solo] is treated as a verse.
 * - A section label is numbered (Verse 1, Verse 2) only when it repeats.
 * - A tag may include an explicit number, e.g. [Verse 3]. Explicit numbers are
 *   reserved first; sections left without one fill in whatever numbers remain,
 *   smallest first, in the order they appear. Slides of the same label are
 *   then reordered into ascending numeric order — e.g. typing Verse 2 before
 *   Verse 1 still presents Verse 1 first. Other section types keep their own
 *   position, so a Verse/Chorus/Verse/Chorus skeleton is preserved even while
 *   the verses themselves get sorted into place.
 * - Untagged lyrics: blank-line-separated stanzas become numbered verses.
 * - Long sections are split across slides at `maxLines`.
 */
export function parseLyrics(text: string, maxLines = 6): Slide[] {
  const src = (text || "").replace(/\r\n?/g, "\n");
  const headerRe = /^\s*\[([a-zA-Z0-9 \-]{1,24})\]\s*$/;
  const hasHeaders = src.split("\n").some((l) => headerRe.test(l));

  let sections: Section[] = [];
  if (hasHeaders) {
    let current: Section | null = null;
    for (const line of src.split("\n")) {
      const m = line.match(headerRe);
      if (m) {
        const { base, num } = splitTagNumber(m[1]);
        const key = base.toLowerCase();
        const meta = SECTION_MAP[key];
        const type = meta ? meta.type : "custom";
        const label = meta?.label || base.charAt(0).toUpperCase() + base.slice(1);
        current = { type, baseLabel: label, explicitNum: num, lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(line);
      } else if (line.trim() !== "") {
        current = { type: "verse", baseLabel: "Verse", explicitNum: null, lines: [line] };
        sections.push(current);
      }
    }
  } else {
    const stanzas = src
      .split(/\n\s*\n/)
      .map((s) => s.split("\n"))
      .filter((g) => g.some((l) => l.trim() !== ""));
    sections = stanzas.map((g) => ({
      type: "verse",
      baseLabel: "Verse",
      explicitNum: null,
      lines: g,
    }));
    if (!sections.length && src.trim())
      sections = [
        { type: "verse", baseLabel: "Verse", explicitNum: null, lines: src.split("\n") },
      ];
  }

  // Resolve each section's final number: explicit numbers (e.g. "Verse 3") are
  // reserved first, then unnumbered sections fill in whatever's left, smallest
  // first, in document order.
  const slotsByLabel: Record<string, number[]> = {};
  sections.forEach((s, i) => (slotsByLabel[s.baseLabel] ||= []).push(i));

  const resolvedNum: (number | null)[] = sections.map(() => null);
  const order = sections.map((_, i) => i);
  for (const slots of Object.values(slotsByLabel)) {
    if (slots.length < 2 && sections[slots[0]].explicitNum === null) continue;

    const claimed = new Set<number>();
    for (const i of slots) {
      const n = sections[i].explicitNum;
      if (n !== null && !claimed.has(n)) {
        resolvedNum[i] = n;
        claimed.add(n);
      }
    }
    let next = 1;
    for (const i of slots) {
      if (resolvedNum[i] !== null) continue;
      while (claimed.has(next)) next++;
      resolvedNum[i] = next;
      claimed.add(next++);
    }

    // Reorder: each slot (by document position) takes the content whose
    // resolved number matches that slot's rank, so the group ends up sorted
    // ascending while sections of other labels keep their own position.
    const byNum = [...slots].sort((a, b) => resolvedNum[a]! - resolvedNum[b]!);
    slots.forEach((slot, rank) => (order[slot] = byNum[rank]));
  }

  const slides: Slide[] = [];
  order.forEach((srcIndex) => {
    const s = sections[srcIndex];
    const num = resolvedNum[srcIndex];
    const numbered = num !== null ? `${s.baseLabel} ${num}` : s.baseLabel;
    const chunks = chunkLines(s.lines, maxLines);
    chunks.forEach((lines, i) => {
      const label =
        chunks.length > 1 ? `${numbered} · ${i + 1}/${chunks.length}` : numbered;
      slides.push({ id: uid(), type: s.type, label, lines, overrides: {}, notes: "" });
    });
  });
  if (!slides.length)
    slides.push({
      id: uid(),
      type: "verse",
      label: "Slide 1",
      lines: ["(empty)"],
      overrides: {},
      notes: "",
    });
  return slides;
}
