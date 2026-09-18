import { extractRepeatCount } from "./repeats";

export interface SectionMeta {
  type: string;
  label: string;
}

export const SECTION_MAP: Record<string, SectionMeta> = {
  intro: { type: "intro", label: "Intro" },
  introduction: { type: "intro", label: "Introduction" },
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
  num: number | null;
  repeat: number | null;
  content: string;
}

const BRACKET_FORM = /^\[\s*([^\]]{1,32}?)\s*\]$/;
const HEADING_FORM = /^#{1,6}\s+(.{1,32}?)\s*#*$/;
const EMPHASIS_FORM =
  /^(?:\*{1,3}|_{1,3}|~~)\s*([^*_~]{1,32}?)\s*(?:\*{1,3}|_{1,3}|~~)$/;
const COLON_FORM = /^([^:]{1,32}?)\s*:\s*(.*)$/;
const DASH_FORM = /^([a-zA-Z][a-zA-Z0-9 '()/-]{0,31}?)\s*[-–—]\s+(\S.*)$/;
const PAREN_FORM = /^\(\s*([a-zA-Z][^()]{0,30}?)\s*\)$/;
const BARE_FORM = /^([a-zA-Z][a-zA-Z0-9 '/-]{0,31})$/;

export const splitTagNumber = (
  raw: string,
): {
  base: string;
  num: number | null;
} => {
  const match = raw.match(/^(.*?)[\s-]*(\d+)$/);
  if (match && match[1].trim())
    return { base: match[1].trim(), num: parseInt(match[2], 10) };
  return { base: raw.trim(), num: null };
};

const VARIANT_LETTER = /^(.*?)[\s-]+([A-Za-z])$/;

const splitVariantLetter = (
  raw: string,
): { base: string; letter: string | null } => {
  const match = raw.match(VARIANT_LETTER);
  if (match && match[1].trim())
    return { base: match[1].trim(), letter: match[2].toUpperCase() };
  return { base: raw.trim(), letter: null };
};

const sectionKey = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ");

interface ResolvedSection {
  meta: SectionMeta;
  letter: string | null;
}

const lookup = (name: string): ResolvedSection | undefined => {
  const base = splitTagNumber(name).base;
  const direct = SECTION_MAP[sectionKey(base)];
  if (direct) return { meta: direct, letter: null };

  const variant = splitVariantLetter(base);
  if (!variant.letter) return undefined;
  const meta = SECTION_MAP[sectionKey(variant.base)];
  return meta ? { meta, letter: variant.letter } : undefined;
};

export const isKnownSection = (name: string): boolean =>
  Boolean(name.trim()) && Boolean(lookup(name));

export const sectionMetaFor = (name: string): SectionMeta => {
  const resolved = lookup(name);
  if (resolved)
    return resolved.letter
      ? {
          type: resolved.meta.type,
          label: `${resolved.meta.label} ${resolved.letter}`,
        }
      : resolved.meta;
  const base = splitTagNumber(name).base;
  return {
    type: "custom",
    label: base.charAt(0).toUpperCase() + base.slice(1),
  };
};

export const canonicalSectionLabel = (name: string): string => {
  const { num } = splitTagNumber(name);
  const label = sectionMetaFor(name).label;
  return num !== null ? `${label} ${num}` : label;
};

const build = (
  nameRaw: string,
  content: string,
  explicit: boolean,
): SectionHeaderMatch | null => {
  const { text, count } = extractRepeatCount(nameRaw);
  const name = text.trim();
  if (!name) return null;
  if (!explicit && !isKnownSection(name)) return null;
  const { base, num } = splitTagNumber(name);
  if (!base) return null;
  return { base, num, repeat: count, content: content.trim() };
};

export const matchSectionHeader = (
  rawLine: string,
): SectionHeaderMatch | null => {
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
};
