import { expect, test } from "vitest";
import { looksSyllabified, readHymnalSource } from "./hymnal";
import { planDefaultManuscripts } from "./defaults";
import { parseManuscript } from "../parser";
import { sectionMetaFor } from "./sections";
import { compareLibraryNames } from "../librarySort";
import { buildSearchIndex, matchesSearch } from "../search";
import { HYMN_MAX_LINES, loadHymns } from "../../data/hymns";
import type { Manuscript } from "../../types";

const slideText = (text: string, maxLines = HYMN_MAX_LINES): string =>
  parseManuscript(text, { maxLines })
    .slides.flatMap((slide) => [
      ...slide.lines,
      ...(slide.textBoxes ?? []).flatMap((box) => box.lines ?? []),
    ])
    .join(" ");

test("ordinary lyrics keep their real hyphens", () => {
  const lyric = [
    "[verse]",
    "We sing of your self-control and grace",
    "A well-known love, a never-ending song",
    "Twenty-one reasons to lift you high",
    "Co-workers in the harvest field",
  ].join("\n");

  expect(looksSyllabified(lyric)).toBe(false);

  const text = slideText(lyric);
  for (const word of [
    "self-control",
    "well-known",
    "never-ending",
    "Twenty-one",
    "Co-workers",
  ])
    expect(text).toContain(word);
});

test("hyphenated prose survives even when the pieces are short", () => {
  const prose = [
    "SERMON: Grace",
    "Preacher: Sam Ade",
    "",
    "A God-given, life-changing truth for every day-to-day decision.",
  ].join("\n");

  const text = slideText(prose, 6);
  for (const word of ["God-given", "life-changing", "day-to-day"])
    expect(text).toContain(word);
});

test("singing hyphens and underscores go, proper compounds stay", () => {
  const hymn = [
    "Test Hymn Of Glo-ry",
    "",
    "Verse 1:",
    "Won-der-ful sto-ry of ev-er-last-ing love,",
    "A-bide with me, O Sav-ior-Prince a-bove,",
    "Sing hal-le-lu-jah with the an_gels O_",
    "For-ev-er and for-ev-er we shall pray.",
  ].join("\n");

  expect(looksSyllabified(hymn)).toBe(true);

  const parsed = parseManuscript(hymn, { maxLines: HYMN_MAX_LINES });
  expect(parsed.title).toBe("Test Hymn Of Glory");

  const text = parsed.slides.flatMap((slide) => slide.lines).join(" ");
  expect(text).toContain("Wonderful story of everlasting");
  expect(text).toContain("Abide with me");
  expect(text).toContain("Savior-Prince");
  expect(text).toContain("angels");
  expect(text).not.toContain("_");
  expect(text).not.toMatch(/[a-z]-[a-z]/);
});

test("tune cues, road maps and credit lines never reach a slide", () => {
  const hymn = [
    "Cue Test Hymn",
    "",
    "Verse 1:@e1",
    "Won-der-ful sto-ry of ev-er-last-ing love,",
    "A-bide with me, O Sav-ior a-bove,",
    "Sing hal-le-lu-jah, sing a-gain to-day,",
    "For-ev-er and for-ev-er we shall pray.",
    "",
    "Road Map: @D1;1;2;3",
    "Author: James G. Deck (1802-1884)",
  ].join("\n");

  const source = readHymnalSource(hymn);
  expect(source.author).toBe("James G. Deck (1802-1884)");
  expect(source.text).not.toContain("@");
  expect(source.text).not.toContain("Road Map");

  const parsed = parseManuscript(hymn, { maxLines: HYMN_MAX_LINES });
  expect(parsed.author).toBe("James G. Deck (1802-1884)");

  const text = parsed.slides.flatMap((slide) => slide.lines).join(" ");
  expect(text).not.toContain("@");
  expect(text).not.toContain("Author:");
});

test("hymnal headings resolve, including lettered refrains", () => {
  expect(sectionMetaFor("Refrain A")).toEqual({
    type: "refrain",
    label: "Refrain A",
  });
  expect(sectionMetaFor("Introduction").type).toBe("intro");
  expect(sectionMetaFor("Verse 2").label).toBe("Verse");
});

test("search matches on words, not on exact punctuation", () => {
  const index = buildSearchIndex([
    "Ye Must Be Born Again",
    "William T. Sleeper",
    "Hymns",
    undefined,
    undefined,
    "A ruler once came to Jesus by night,\nAnd asked Him the way of salvation:",
  ]);

  expect(matchesSearch(index, "A ruler once came to Jesus by night")).toBe(
    true,
  );
  expect(matchesSearch(index, "ruler once came")).toBe(true);
  expect(matchesSearch(index, "asked him the way")).toBe(true);
  expect(matchesSearch(index, "ye must be born again")).toBe(true);
  expect(matchesSearch(index, "sleeper")).toBe(true);
  expect(matchesSearch(index, "a phrase that is absent")).toBe(false);
});

test("titles that do not start with a letter sort last", () => {
  const titles = ["’Tis So Sweet", "Amazing Love", '"Till He Come!"', "Zion"];
  const sorted = [...titles].sort(compareLibraryNames);
  expect(sorted.slice(0, 2)).toEqual(["Amazing Love", "Zion"]);
});

test("an untouched default is refreshed while an edited one is left alone", () => {
  const stamp = (day: number) => new Date(Date.UTC(2026, 0, day)).toISOString();
  const seeded = (id: string, extra: Partial<Manuscript> = {}): Manuscript =>
    ({
      id,
      title: id,
      body: "old",
      slides: [],
      defaultThemeId: "hymnbook",
      builtIn: true,
      createdAt: stamp(1),
      updatedAt: stamp(1),
      ...extra,
    }) as Manuscript;

  const defaults = [
    seeded("hymn-a", { body: "new", createdAt: stamp(5), updatedAt: stamp(5) }),
    seeded("hymn-b", { body: "new", createdAt: stamp(5), updatedAt: stamp(5) }),
  ];
  const stored = [
    seeded("hymn-a", { body: "my edit", updatedAt: stamp(3) }),
    seeded("hymn-b", { pinned: true }),
    seeded("old-seed"),
    seeded("mine", { builtIn: false }),
  ];

  const plan = planDefaultManuscripts(stored, defaults);
  const edited = plan.manuscripts.find((m) => m.id === "hymn-a");
  const untouched = plan.manuscripts.find((m) => m.id === "hymn-b");

  expect(edited?.body).toBe("my edit");
  expect(untouched?.body).toBe("new");
  expect(untouched?.pinned).toBe(true);
  expect(plan.staleIds).toEqual(["old-seed"]);
  expect(plan.manuscripts.some((m) => m.id === "mine")).toBe(true);
});

test("every bundled hymn builds slides that leave room on the slide", async () => {
  const hymns = await loadHymns();
  expect(hymns.length).toBeGreaterThan(800);
  expect(new Set(hymns.map((hymn) => hymn.id)).size).toBe(hymns.length);

  for (const hymn of hymns) {
    expect(hymn.title.trim(), `${hymn.id} has no title`).not.toBe("");
    expect(hymn.body.trim(), `${hymn.id} has no body`).not.toBe("");
    expect(hymn.body, `${hymn.id} kept a singing hyphen`).not.toMatch(
      /[a-z]-[a-z]/,
    );
    expect(hymn.body, `${hymn.id} kept a held-note underscore`).not.toContain(
      "_",
    );

    const { slides } = parseManuscript(hymn.body, {
      maxLines: HYMN_MAX_LINES,
    });
    expect(slides.length, `${hymn.id} produced no slides`).toBeGreaterThan(0);
    for (const slide of slides) {
      expect(
        slide.lines.length,
        `${hymn.id} has a slide of ${slide.lines.length} lines`,
      ).toBeLessThanOrEqual(HYMN_MAX_LINES);
      expect(slide.lines, `${hymn.id} has a blank slide`).not.toEqual([
        "(empty)",
      ]);
    }
  }
});

test("the bundled hymns are stored in the order the library shows", async () => {
  const hymns = await loadHymns();
  for (let i = 1; i < hymns.length; i++) {
    const previous = hymns[i - 1].title;
    const current = hymns[i].title;
    expect(
      compareLibraryNames(previous, current),
      `"${previous}" should not come before "${current}"`,
    ).toBeLessThanOrEqual(0);
  }

  const firstOdd = hymns.findIndex(
    (hymn) => !/^\p{L}/u.test(hymn.title.trim()),
  );
  if (firstOdd !== -1)
    expect(
      hymns.slice(firstOdd).every((hymn) => !/^\p{L}/u.test(hymn.title.trim())),
    ).toBe(true);
});
