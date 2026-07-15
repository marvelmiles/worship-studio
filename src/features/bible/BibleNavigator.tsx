import { useMemo, useState } from "react";
import type { BibleVersionId } from "../../types";
import { BIBLE_BOOKS, BIBLE_VERSIONS, bookById } from "../../data/bibleBooks";
import { C, UI } from "../../theme/tokens";
import { Field, Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";

interface BibleNavigatorProps {
  version: BibleVersionId;
  bookId: number;
  chapter: number;
  onVersion: (version: BibleVersionId) => void;
  onNavigate: (bookId: number, chapter: number) => void;
  compact: boolean;
}

const versionOptions = BIBLE_VERSIONS.map((v) => ({ value: v.id, label: `${v.id} — ${v.name}` }));

export function BibleNavigator({
  version,
  bookId,
  chapter,
  onVersion,
  onNavigate,
  compact,
}: BibleNavigatorProps) {
  const [bookQuery, setBookQuery] = useState("");
  const book = bookById(bookId);

  const filteredBooks = useMemo(() => {
    const term = bookQuery.trim().toLowerCase();
    if (!term) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter(
      (b) => b.name.toLowerCase().includes(term) || b.aliases.some((a) => a.startsWith(term))
    );
  }, [bookQuery]);

  if (compact) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10, marginBottom: 14 }}>
        <Field label="Version">
          <Select value={version} options={versionOptions} onChange={(e) => onVersion(e.target.value as BibleVersionId)} />
        </Field>
        <Field label="Book">
          <Select
            value={String(bookId)}
            options={BIBLE_BOOKS.map((b) => ({ value: String(b.id), label: b.name }))}
            onChange={(e) => onNavigate(Number(e.target.value), 1)}
          />
        </Field>
        <Field label="Chapter">
          <Select
            value={String(chapter)}
            options={Array.from({ length: book?.chapters || 1 }, (_, i) => String(i + 1))}
            onChange={(e) => onNavigate(bookId, Number(e.target.value))}
          />
        </Field>
      </div>
    );
  }

  const testaments: { label: string; key: "old" | "new" }[] = [
    { label: "Old Testament", key: "old" },
    { label: "New Testament", key: "new" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>
      <Field label="Version">
        <Select value={version} options={versionOptions} onChange={(e) => onVersion(e.target.value as BibleVersionId)} />
      </Field>
      <SearchInput value={bookQuery} onChange={setBookQuery} placeholder="Find a book…" style={{ minWidth: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
        {testaments.map(({ label, key }) => {
          const books = filteredBooks.filter((b) => b.testament === key);
          if (!books.length) return null;
          return (
            <div key={key} style={{ marginBottom: 12 }}>
              <div className="ws-section-label" style={{ margin: "8px 0 7px" }}>
                {label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {books.map((b) => {
                  const active = b.id === bookId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => onNavigate(b.id, b.id === bookId ? chapter : 1)}
                      className="ws-ellipsis"
                      style={{
                        textAlign: "left",
                        padding: "7px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: "none",
                        fontFamily: UI,
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        background: active ? "rgba(216,162,74,0.14)" : "transparent",
                        color: active ? C.goldSoft : C.sub,
                      }}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {book && (
        <div>
          <div className="ws-section-label" style={{ marginBottom: 7 }}>
            {book.name} — Chapters
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(38px,1fr))",
              gap: 5,
              maxHeight: 150,
              overflowY: "auto",
            }}
          >
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => {
              const active = n === chapter;
              return (
                <button
                  key={n}
                  onClick={() => onNavigate(bookId, n)}
                  style={{
                    padding: "7px 0",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: UI,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    border: `1px solid ${active ? "rgba(216,162,74,0.4)" : C.border}`,
                    background: active ? "rgba(216,162,74,0.16)" : "transparent",
                    color: active ? C.goldSoft : C.sub,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
