import { describe, expect, it } from "vitest";
import {
  buildBackup,
  describeSelection,
  selectionBytes,
  type BackupSource,
} from "./backupPayload";
import {
  resolveSelection,
  selectionFrom,
  wholeLibrarySelection,
} from "./shareSelection";
import { recordsForMedia, shareCatalog } from "./shareCatalog";
import { DEFAULT_PREFS } from "../store/slices/prefsSlice";
import type {
  Background,
  Manuscript,
  MediaItem,
  ScripturePassage,
  Slide,
  Theme,
} from "../types";

const STAMP = "2026-01-01T00:00:00.000Z";

const slide = (overrides: Partial<Slide> = {}): Slide => ({
  id: "slide-1",
  type: "verse",
  label: "Verse 1",
  lines: [],
  overrides: {},
  notes: "",
  ...overrides,
});

const manuscript = (
  id: string,
  overrides: Partial<Manuscript> = {},
): Manuscript =>
  ({
    id,
    title: id,
    slides: [],
    body: "",
    defaultThemeId: "classic",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  }) as Manuscript;

const media = (
  id: string,
  kind: MediaItem["kind"],
  size: number,
): MediaItem => ({
  id,
  kind,
  name: id,
  size,
  hasThumb: true,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const passage = (id: string, quick?: boolean): ScripturePassage => ({
  id,
  title: id,
  quick,
  version: "KJV",
  range: {
    bookId: 43,
    bookName: "John",
    chapter: 3,
    verseStart: 16,
    verseEnd: 16,
  },
  verses: [{ v: 16, t: "For God so loved the world" }],
  versesPerSlide: 1,
  showVerseNumbers: true,
  showReference: true,
  slides: [],
  defaultThemeId: "scripture",
  createdAt: STAMP,
  updatedAt: STAMP,
});

const theme = (id: string, builtIn?: boolean): Theme =>
  ({ id, name: id, builtIn, backgroundId: "" }) as Theme;

const background = (
  id: string,
  extra: Partial<Background> = {},
): Background => ({
  id,
  name: id,
  category: "Custom",
  type: "image",
  createdAt: STAMP,
  ...extra,
});

const source: BackupSource = {
  manuscripts: [
    manuscript("hymn", {
      defaultBackgroundId: "bg-photo",
      defaultAudioId: "sound",
      slides: [
        slide({
          media: [
            {
              id: "m1",
              kind: "video",
              mediaId: "clip",
              frame: { x: 0, y: 0, width: 10, height: 10 },
            },
          ],
        }),
      ],
    }),
    manuscript("sermon"),
  ],
  scriptures: [passage("john-3"), passage("overlay-passage-1", true)],
  media: [media("photo", "image", 1_000), media("clip", "video", 2_000_000)],
  themes: [theme("classic", true), theme("mine")],
  backgrounds: [
    background("built-in", { builtIn: true, type: "gradient" }),
    background("bg-photo", { blobId: "photo", size: 1_000 }),
    background("bg-solid", { type: "solid", color: "#fff" }),
  ],
  audio: [
    { id: "sound", name: "Pad", blobId: "sound", size: 500, createdAt: STAMP },
    { id: "built-in-sound", name: "Chime", builtIn: true },
  ],
  overlayPresets: [],
  prefs: DEFAULT_PREFS,
};

describe("buildBackup", () => {
  it("carries only the records that were chosen", () => {
    const { payload } = buildBackup(
      source,
      selectionFrom([{ collection: "media", id: "clip" }]),
    );

    expect(payload.media?.map((item) => item.id)).toEqual(["clip"]);
    expect(payload.manuscripts).toBeUndefined();
    expect(payload.prefs).toBeUndefined();
  });

  it("names the files the chosen records need, thumbnails included", () => {
    const { fileIds } = buildBackup(
      source,
      selectionFrom([{ collection: "media", id: "clip" }]),
    );

    expect(fileIds).toContain("clip");
    expect(fileIds).toContain("clip:thumb");
  });

  it("sends a manuscript with the background, sound and clip it uses", () => {
    const { payload } = buildBackup(
      source,
      selectionFrom([{ collection: "manuscripts", id: "hymn" }]),
    );

    expect(payload.backgrounds?.map((entry) => entry.id)).toEqual(["bg-photo"]);
    expect(payload.audio?.map((entry) => entry.id)).toEqual(["sound"]);
    expect(payload.media?.map((entry) => entry.id).sort()).toEqual([
      "clip",
      "photo",
    ]);
  });

  it("leaves built-in themes, backgrounds and sounds behind", () => {
    const { payload } = buildBackup(source, wholeLibrarySelection(source));

    expect(payload.themes?.map((entry) => entry.id)).toEqual(["mine"]);
    expect(payload.backgrounds?.map((entry) => entry.id)).toEqual([
      "bg-photo",
      "bg-solid",
    ]);
    expect(payload.audio?.map((entry) => entry.id)).toEqual(["sound"]);
  });

  it("leaves quick-present passages out of a whole-library send", () => {
    const { payload } = buildBackup(source, wholeLibrarySelection(source));

    expect(payload.scriptures?.map((entry) => entry.id)).toEqual(["john-3"]);
    expect(payload.prefs).toBe(DEFAULT_PREFS);
  });
});

describe("resolveSelection", () => {
  it("drops records this device no longer holds", () => {
    const resolved = resolveSelection(
      source,
      selectionFrom([{ collection: "manuscripts", id: "gone" }]),
    );

    expect(resolved.manuscripts).toEqual([]);
  });
});

describe("selectionBytes", () => {
  it("counts a borrowed file once", () => {
    const bytes = selectionBytes(
      source,
      selectionFrom([
        { collection: "media", id: "photo" },
        { collection: "backgrounds", id: "bg-photo" },
      ]),
    );

    expect(bytes).toBe(1_000);
  });
});

describe("describeSelection", () => {
  it("reads as a sentence", () => {
    expect(
      describeSelection(
        source,
        selectionFrom([{ collection: "media", id: "clip" }]),
      ),
    ).toBe("1 video");

    expect(describeSelection(source, selectionFrom([]))).toBe("nothing");
  });
});

describe("shareCatalog", () => {
  it("lists a picture once, however many places name it", () => {
    const images = shareCatalog(source).find((tab) => tab.id === "images");

    expect(images?.items).toHaveLength(1);
    expect(images?.items[0].records.map((entry) => entry.collection)).toEqual([
      "media",
      "backgrounds",
    ]);
  });

  it("keeps colours out of the images tab", () => {
    const colours = shareCatalog(source).find((tab) => tab.id === "colours");

    expect(colours?.items.map((item) => item.key)).toEqual(["bg-solid"]);
  });

  it("leaves built-in sounds out of the audio tab", () => {
    const audio = shareCatalog(source).find((tab) => tab.id === "audio");

    expect(audio?.items.map((item) => item.key)).toEqual(["sound"]);
  });

  it("hands a card every record behind its file", () => {
    expect(recordsForMedia(source, "photo")).toEqual([
      { collection: "media", id: "photo" },
      { collection: "backgrounds", id: "bg-photo" },
    ]);
  });
});
