import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import type { BibleVersionId, ScripturePassage } from "../../types";
import { bookById } from "../../data/bibleBooks";
import { useStore, type ScriptureSelection } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchInput } from "../../components/ui/SearchInput";
import { Spinner } from "../../components/ui/Spinner";
import { VerseSnippet } from "../bible/VerseSnippet";
import { useBibleChapter } from "../bible/useBibleChapter";
import { useBibleSearch } from "../bible/useBibleSearch";
import {
  formatParsedReference,
  parseReference,
  referenceSpan,
  type ParsedReference,
} from "../bible/lib/reference";
import { buildScriptureSelection } from "../bible/lib/scriptureSelection";
import { createOverlayPassage } from "./lib/overlayPassage";

/** The passage document an inserted overlay will point at. */
export interface OverlayPassageChoice {
  contentId: string;
  label: string;
}

/**
 * Finds the scripture to put on the broadcast, from anywhere it might be.
 *
 * The first version of this offered saved passages only, which is the one place
 * an operator mid-service usually cannot find what they need: the preacher has
 * just called out a reference nobody prepared. So this is the Bible page's own
 * search, in a modal — a saved passage by name, a reference typed any way it is
 * normally written ("jn 3:16-22", "1 cor 13", "john 3"), or the words of a verse
 * whose address nobody remembers ("book of life").
 *
 * Whatever is chosen, one click inserts it. A reference or a verse hit gets a
 * passage document of its own (see lib/overlayPassage) so it never collides with
 * the Bible page's quick present, and it arrives one verse per slide, which the
 * overlay then breaks into as many blocks as its frame needs.
 */
export function OverlayPassagePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (choice: OverlayPassageChoice) => void;
}) {
  const { colors, fonts } = useUITheme();
  const version = useStore((s) => s.prefs.bibleVersion);
  const scriptures = useStore((s) => s.scriptures);
  const [query, setQuery] = useState("");

  /** Set when the query reads as a reference, e.g. "jn 3:16" or bare "john". */
  const reference = useMemo(() => parseReference(query), [query]);

  // A chapter and verse is an exact address, so the word search would only add
  // noise ("jn 3:16" appears in no verse). A bare book name is not: "mark" is
  // both a book and a word people search for, so both answers are offered.
  const search = useBibleSearch(version, reference?.hasChapter ? "" : query);

  const saved = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const library = scriptures.filter(
      (passage) => !passage.deleted && !passage.quick,
    );
    if (!needle) return library;
    return library.filter((passage) =>
      passage.title.toLowerCase().includes(needle),
    );
  }, [scriptures, query]);

  const insertSelection = (selection: ScriptureSelection | null) => {
    if (!selection?.verses.length) return;
    const passage = createOverlayPassage(selection);
    if (passage) insertPassage(passage);
  };

  const insertPassage = (passage: ScripturePassage) => {
    onPick({ contentId: passage.id, label: passage.title });
    setQuery("");
  };

  if (!open) return null;

  const nothingAtAll =
    saved.length === 0 && !reference && !search.enabled && !query.trim();

  return (
    <Modal open onClose={onClose} title="Add a passage" width={520}>
      <div style={{ marginBottom: 14 }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="A saved passage, a reference like Jn 3:16-22, or words"
        />
      </div>

      <div style={{ maxHeight: "56vh", overflowY: "auto", paddingRight: 2 }}>
        {nothingAtAll ? (
          <EmptyState
            icon={BookOpen}
            title="Nothing saved yet"
            message="Type a reference like John 3:16-22, or search the words of a verse. Passages you save from the Bible page appear here too."
            compact
            bare
          />
        ) : (
          <>
            {reference && (
              <Section title="Go to passage">
                <ReferenceResult
                  reference={reference}
                  version={version}
                  onInsert={insertSelection}
                />
              </Section>
            )}

            {saved.length > 0 && (
              <Section title="Saved passages">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {saved.map((passage) => (
                    <ResultRow
                      key={passage.id}
                      heading={passage.title}
                      onInsert={() => insertPassage(passage)}
                    >
                      <span
                        style={{
                          fontFamily: fonts.ui,
                          fontSize: 12.5,
                          color: colors.dim,
                        }}
                      >
                        {passage.verses.length} verse
                        {passage.verses.length === 1 ? "" : "s"}
                      </span>
                    </ResultRow>
                  ))}
                </div>
              </Section>
            )}

            {!reference?.hasChapter && query.trim() && saved.length === 0 && (
              <Note>No saved passage matches "{query.trim()}".</Note>
            )}

            {search.enabled && (
              <Section
                title={`Verses matching "${search.term}"${
                  search.total > 0 ? ` (${search.total.toLocaleString()})` : ""
                }`}
              >
                {search.loading && search.results.length === 0 && (
                  <div style={{ padding: "12px 2px" }}>
                    <Spinner size={18} />
                  </div>
                )}
                {search.error && <Note danger>{search.error}</Note>}
                {!search.loading &&
                  !search.error &&
                  search.results.length === 0 && (
                    <Note>
                      No verses in {version} contain "{search.term}".
                    </Note>
                  )}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {search.results.map((result) => {
                    const book = bookById(result.bookId);
                    if (!book) return null;
                    const heading = `${book.name} ${result.chapter}:${result.verse}`;
                    return (
                      <ResultRow
                        key={heading}
                        heading={heading}
                        onInsert={() =>
                          // The result carries its own verse text, so inserting
                          // it needs nothing more loaded.
                          insertSelection(
                            buildScriptureSelection({
                              version,
                              bookId: result.bookId,
                              chapter: result.chapter,
                              verseStart: result.verse,
                              verses: [{ v: result.verse, t: result.text }],
                            }),
                          )
                        }
                      >
                        <span
                          style={{
                            fontFamily: fonts.ui,
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: colors.sub,
                          }}
                        >
                          <VerseSnippet text={result.text} term={search.term} />
                        </span>
                      </ResultRow>
                    );
                  })}
                </div>
                {search.hasMore && (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={search.loadMore}
                      busy={search.loading}
                    >
                      Load more ({search.results.length} of{" "}
                      {search.total.toLocaleString()})
                    </Button>
                  </div>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * The reference typed into the box, ready to insert. It loads the chapter it
 * names so the operator can read what they are about to put on the broadcast
 * before it goes anywhere, and so a chapter-only reference can carry all of its
 * verses through.
 */
function ReferenceResult({
  reference,
  version,
  onInsert,
}: {
  reference: ParsedReference;
  version: BibleVersionId;
  onInsert: (selection: ScriptureSelection | null) => void;
}) {
  const { colors, fonts } = useUITheme();
  const { verses, loading, error } = useBibleChapter(
    version,
    reference.book.id,
    reference.chapter,
  );
  const span = referenceSpan(reference);
  const chosen = verses.filter((v) => v.v >= span.start && v.v <= span.end);

  return (
    <ResultRow
      heading={formatParsedReference(reference)}
      emphasis
      disabled={loading || Boolean(error) || chosen.length === 0}
      meta={`${version}${chosen.length > 1 ? ` · ${chosen.length} verses` : ""}`}
      onInsert={() =>
        onInsert(
          buildScriptureSelection({
            version,
            bookId: reference.book.id,
            chapter: reference.chapter,
            verseStart: span.start,
            verseEnd: span.end,
            verses,
          }),
        )
      }
    >
      {loading && <Spinner size={16} />}
      {error && (
        <span
          style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.danger }}
        >
          {error}
        </span>
      )}
      {!loading && !error && (
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 13,
            lineHeight: 1.55,
            color: colors.sub,
          }}
        >
          {chosen
            .slice(0, 2)
            .map((verse) => verse.t)
            .join(" ")}
          {chosen.length > 2 ? " …" : ""}
        </span>
      )}
    </ResultRow>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors, fonts } = useUITheme();
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: fonts.ui,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: colors.dim,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Note({ children, danger }: { children: ReactNode; danger?: boolean }) {
  const { colors, fonts } = useUITheme();
  return (
    <p
      style={{
        fontFamily: fonts.ui,
        fontSize: 12.5,
        color: danger ? colors.danger : colors.dim,
        margin: "0 0 14px",
      }}
    >
      {children}
    </p>
  );
}

/** One thing that can be put on the broadcast. Clicking it inserts it. */
function ResultRow({
  heading,
  meta,
  emphasis,
  disabled,
  onInsert,
  children,
}: {
  heading: string;
  meta?: string;
  /** The reference card, which leads the results. */
  emphasis?: boolean;
  /** Set while the verses behind the result are still loading. */
  disabled?: boolean;
  onInsert: () => void;
  children: ReactNode;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <button
      type="button"
      onClick={onInsert}
      disabled={disabled}
      title={`Add ${heading} to the broadcast`}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: emphasis ? "12px 14px" : "10px 12px",
        borderRadius: emphasis ? 12 : 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        background: colors.bg,
        border: `1px solid ${emphasis ? colors.accentSoft : colors.border}`,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          className="ws-ellipsis"
          style={{
            minWidth: 0,
            fontFamily: emphasis ? fonts.display : fonts.ui,
            fontSize: emphasis ? 15 : 12.5,
            fontWeight: 700,
            color: colors.accentSoft,
          }}
        >
          {heading}
        </span>
        {meta && (
          <span
            style={{
              flexShrink: 0,
              fontFamily: fonts.ui,
              fontSize: 11,
              fontWeight: 600,
              color: colors.dim,
            }}
          >
            {meta}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <ArrowRight size={15} color={colors.dim} style={{ flexShrink: 0 }} />
      </span>
      {children}
    </button>
  );
}
