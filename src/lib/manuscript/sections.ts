import { extractRepeatCount } from "./repeats";

export interface SectionMeta {
  type: string;
  label: string;
}

/**
 * Every section name the parser understands, mapped to the slide type that
 * drives shortcuts and to the label the operator sees.
 *
 * Performer cues (choir, soloist, lead) are typed as verses on purpose: in a
 * call-and-response song they are the stanzas, so they earn verse numbering
 * and the Ctrl+number jumps, while keeping their own name on the slide.
 */
export const SECTION_MAP: Record<string, SectionMeta> = {
  intro: { type: "intro", label: "Intro" },
  prelude: { type: "intro", label: "Prelude" },
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
  postchorus: { type: "post-chorus", label: "Post-Chorus" },
  "post-chorus": { type: "post-chorus", label: "Post-Chorus" },
  "post chorus": { type: "post-chorus", label: "Post-Chorus" },
  ending: { type: "ending", label: "Ending" },
  coda: { type: "ending", label: "Coda" },
  reprise: { type: "reprise", label: "Reprise" },
  interlude: { type: "interlude", label: "Interlude" },
  instrumental: { type: "interlude", label: "Instrumental" },
  vamp: { type: "vamp", label: "Vamp" },
  hook: { type: "hook", label: "Hook" },
  rap: { type: "rap", label: "Rap" },
  chant: { type: "chant", label: "Chant" },
  adlib: { type: "adlib", label: "Ad-lib" },
  adlibs: { type: "adlib", label: "Ad-lib" },
  "ad-lib": { type: "adlib", label: "Ad-lib" },
  "ad-libs": { type: "adlib", label: "Ad-lib" },
  adlips: { type: "adlib", label: "Ad-lib" },
  choir: { type: "verse", label: "Choir" },
  soloist: { type: "verse", label: "Soloist" },
  lead: { type: "verse", label: "Lead" },
  vocal: { type: "verse", label: "Vocal" },
  vocals: { type: "verse", label: "Vocal" },
  "lead/vocal": { type: "verse", label: "Lead Vocal" },
  "lead/vocals": { type: "verse", label: "Lead Vocal" },
  "lead vocal": { type: "verse", label: "Lead Vocal" },
  "lead vocals": { type: "verse", label: "Lead Vocal" },
  congregation: { type: "verse", label: "Congregation" },
  all: { type: "verse", label: "All" },
  response: { type: "response", label: "Response" },
  call: { type: "call", label: "Call" },
};

export interface SectionHeaderMatch {
  base: string;
  /** Explicit number carried by the name itself, e.g. "Verse 3". */
  num: number | null;
  /** Repeat count written into the header, e.g. "Chorus (2x):". */
  repeat: number | null;
  /** Lyrics typed on the same line, e.g. "Chorus: I am favoured". */
  content: string;
}

/** `[Chorus]`, `[Verse 2]` — explicit, so any name is accepted. */
const BRACKET_FORM = /^\[\s*([^\]]{1,32}?)\s*\]$/;
/** Markdown headings, `# Chorus` / `### Verse 2` — also explicit. */
const HEADING_FORM = /^#{1,6}\s+(.{1,32}?)\s*#*$/;
/** `**Chorus**`, `_Verse 2_` — known names only. */
const EMPHASIS_FORM =
  /^(?:\*{1,3}|_{1,3}|~~)\s*([^*_~]{1,32}?)\s*(?:\*{1,3}|_{1,3}|~~)$/;
/** `Chorus:` and `Chorus: I am favoured` — known names only. */
const COLON_FORM = /^([^:]{1,32}?)\s*:\s*(.*)$/;
/** `Choir- 'go ni fun baba` — a dashed speaker prefix, known names only. */
const DASH_FORM = /^([a-zA-Z][a-zA-Z0-9 '()/-]{0,31}?)\s*[-–—]\s+(\S.*)$/;
/** `(Adlibs)` on its own line — known names only. */
const PAREN_FORM = /^\(\s*([a-zA-Z][^()]{0,30}?)\s*\)$/;
/** A bare `Chorus` line — known names only. */
const BARE_FORM = /^([a-zA-Z][a-zA-Z0-9 '/-]{0,31})$/;

/**
 * Splits a name into its base and an optional trailing number, e.g.
 * "Verse 3" / "Verse-3" / "Verse3" -> { base: "Verse", num: 3 }.
 */
export function splitTagNumber(raw: string): {
  base: string;
  num: number | null;
} {
  const match = raw.match(/^(.*?)[\s-]*(\d+)$/);
  if (match && match[1].trim())
    return { base: match[1].trim(), num: parseInt(match[2], 10) };
  return { base: raw.trim(), num: null };
}

const lookup = (name: string): SectionMeta | undefined =>
  SECTION_MAP[splitTagNumber(name).base.toLowerCase().replace(/\s+/g, " ")];

export const isKnownSection = (name: string): boolean =>
  Boolean(name.trim()) && Boolean(lookup(name));

export function sectionMetaFor(name: string): SectionMeta {
  const meta = lookup(name);
  if (meta) return meta;
  const base = splitTagNumber(name).base;
  return {
    type: "custom",
    label: base.charAt(0).toUpperCase() + base.slice(1),
  };
}

/** The label a repeat cue points at, normalised to how the slide is titled. */
export function canonicalSectionLabel(name: string): string {
  const { num } = splitTagNumber(name);
  const label = sectionMetaFor(name).label;
  return num !== null ? `${label} ${num}` : label;
}

function build(
  nameRaw: string,
  content: string,
  explicit: boolean,
): SectionHeaderMatch | null {
  const { text, count } = extractRepeatCount(nameRaw);
  const name = text.trim();
  if (!name) return null;
  if (!explicit && !isKnownSection(name)) return null;
  const { base, num } = splitTagNumber(name);
  if (!base) return null;
  return { base, num, repeat: count, content: content.trim() };
}

/**
 * Recognises every way a section gets marked in a lyric document: the app's
 * own `[Verse 2]` tags, Markdown headings, an emphasised, bracketed,
 * colon-terminated or dash-prefixed name, or the bare word on its own line.
 * The looser forms only count when they name a section the app knows, so an
 * ordinary lyric line is never swallowed as a heading.
 */
export function matchSectionHeader(rawLine: string): SectionHeaderMatch | null {
  const line = rawLine.trim();
  if (!line) return null;

  const bracket = line.match(BRACKET_FORM) || line.match(HEADING_FORM);
  if (bracket) return build(bracket[1], "", true);

  const emphasis = line.match(EMPHASIS_FORM);
  if (emphasis) return build(emphasis[1], "", false);

  const colon = line.match(COLON_FORM);
  if (colon) {
    const header = build(colon[1], colon[2], false);
    if (header) return header;
  }

  const dash = line.match(DASH_FORM);
  if (dash) {
    const header = build(dash[1], dash[2], false);
    if (header) return header;
  }

  const paren = line.match(PAREN_FORM);
  if (paren) return build(paren[1], "", false);

  const bare = line.match(BARE_FORM);
  if (bare) return build(bare[1], "", false);

  return null;
}
