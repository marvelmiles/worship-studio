import { useUITheme } from "../../theme/ThemeProvider";

/**
 * A verse as a search result reads it: trimmed to a window around the first
 * match, with the searched words picked out.
 *
 * Shared by every surface that lists verse hits — the Bible page's own search
 * and the broadcast's passage picker — so a result looks and reads the same
 * wherever an operator finds it.
 */

/** Escapes regex metacharacters so search words can be matched literally. */
const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** How much of a long verse a result shows before it is trimmed. */
const SNIPPET_LENGTH = 180;

/** Trims long verse text to a window around the first search match. */
function snippetAroundFirstMatch(
  text: string,
  term: string,
  span = SNIPPET_LENGTH,
): string {
  if (text.length <= span) return text;
  const firstWord = term.split(/\s+/).filter(Boolean)[0] || "";
  const at = firstWord
    ? text.toLowerCase().indexOf(firstWord.toLowerCase())
    : -1;
  if (at <= span / 2) return `${text.slice(0, span)}…`;
  const start = Math.max(0, at - Math.floor(span / 2));
  const end = Math.min(text.length, start + span);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export function VerseSnippet({ text, term }: { text: string; term: string }) {
  const { colors } = useUITheme();
  const snippet = snippetAroundFirstMatch(text, term);
  const words = term.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return <>{snippet}</>;

  const splitter = new RegExp(`(${words.join("|")})`, "gi");
  const isMatch = new RegExp(`^(?:${words.join("|")})$`, "i");
  return (
    <>
      {snippet.split(splitter).map((part, index) =>
        isMatch.test(part) ? (
          <span
            key={index}
            style={{ color: colors.accentSoft, fontWeight: 700 }}
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
