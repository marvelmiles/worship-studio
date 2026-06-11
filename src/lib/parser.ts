import type { Slide } from "../types";
import { uid } from "./id";

export const SECTION_MAP: Record<string, string> = {
  intro: "Intro",
  verse: "Verse",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
  tag: "Tag",
  refrain: "Refrain",
  prechorus: "Pre-Chorus",
  "pre-chorus": "Pre-Chorus",
  "pre chorus": "Pre-Chorus",
  ending: "Ending",
};

interface Section {
  type: string;
  baseLabel: string;
  lines: string[];
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
 *   [refrain], [pre-chorus] (and custom tags).
 * - A section label is numbered (Verse 1, Verse 2) only when it repeats.
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
        const key = m[1].trim().toLowerCase();
        const type = SECTION_MAP[key] ? key.replace(" ", "-") : "custom";
        const label =
          SECTION_MAP[key] ||
          m[1].trim().charAt(0).toUpperCase() + m[1].trim().slice(1);
        current = { type, baseLabel: label, lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(line);
      } else if (line.trim() !== "") {
        current = { type: "verse", baseLabel: "Verse", lines: [line] };
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
      lines: g,
    }));
    if (!sections.length && src.trim())
      sections = [{ type: "verse", baseLabel: "Verse", lines: src.split("\n") }];
  }

  // Numbering: a label gets a number only when its base repeats across the song.
  const counts: Record<string, number> = {};
  sections.forEach((s) => {
    counts[s.baseLabel] = (counts[s.baseLabel] || 0) + 1;
  });
  const running: Record<string, number> = {};
  const slides: Slide[] = [];
  for (const s of sections) {
    running[s.baseLabel] = (running[s.baseLabel] || 0) + 1;
    const numbered =
      counts[s.baseLabel] > 1
        ? `${s.baseLabel} ${running[s.baseLabel]}`
        : s.baseLabel;
    const chunks = chunkLines(s.lines, maxLines);
    chunks.forEach((lines, i) => {
      const label =
        chunks.length > 1 ? `${numbered} · ${i + 1}/${chunks.length}` : numbered;
      slides.push({ id: uid(), type: s.type, label, lines, overrides: {}, notes: "" });
    });
  }
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
