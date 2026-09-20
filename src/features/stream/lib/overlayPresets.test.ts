import { describe, expect, it } from "vitest";
import {
  contentIdsOf,
  fromSavedOverlay,
  isSavedOverlayReady,
  suggestedPresetName,
  toSavedOverlay,
  type OverlayContentLibrary,
} from "./overlayPresets";
import {
  createContentOverlay,
  createMarqueeOverlay,
  type StreamOverlay,
} from "./streamOverlay";

const emptyLibrary: OverlayContentLibrary = {
  manuscripts: [],
  scriptures: [],
  media: [],
  backgrounds: [],
};

const onAir = (overlay: StreamOverlay): StreamOverlay => ({
  ...overlay,
  status: "live",
  pending: { opacity: 40 },
});

describe("toSavedOverlay", () => {
  it("keeps the look and drops where the overlay is right now", () => {
    const overlay = createContentOverlay("manuscript", "doc-1", "Opening song");
    const saved = toSavedOverlay({ ...overlay, opacity: 80 });

    expect(saved).not.toHaveProperty("id");
    expect(saved).not.toHaveProperty("status");
    expect(saved).not.toHaveProperty("pending");
    expect(saved.opacity).toBe(80);
    expect(saved.label).toBe("Opening song");
  });

  it("saves what is staged rather than what is on air", () => {
    const overlay = onAir(createMarqueeOverlay("Welcome"));
    expect(toSavedOverlay(overlay).opacity).toBe(40);
  });
});

describe("fromSavedOverlay", () => {
  it("comes back off air, visible and with an id of its own", () => {
    const overlay = createContentOverlay("video", "clip-1", "Countdown");
    const restored = fromSavedOverlay(
      toSavedOverlay({ ...overlay, hidden: true }),
    );

    expect(restored.id).not.toBe(overlay.id);
    expect(restored.status).toBe("draft");
    expect(restored.hidden).toBe(false);
    expect(restored.pending).toBeNull();
  });
});

describe("isSavedOverlayReady", () => {
  it("always uses an announcement, which stands on nothing", () => {
    const saved = toSavedOverlay(createMarqueeOverlay("Welcome"));
    expect(isSavedOverlayReady(saved, emptyLibrary)).toBe(true);
  });

  it("refuses a manuscript that is no longer in the library", () => {
    const saved = toSavedOverlay(
      createContentOverlay("manuscript", "doc-1", "Opening song"),
    );
    expect(isSavedOverlayReady(saved, emptyLibrary)).toBe(false);
  });

  it("reads a picture attached as a background from the backgrounds", () => {
    const saved = toSavedOverlay(
      createContentOverlay("image", "bg-1", "Logo", "background"),
    );
    expect(
      isSavedOverlayReady(saved, {
        ...emptyLibrary,
        backgrounds: [
          { id: "bg-1", name: "Logo", category: "Custom", type: "image" },
        ],
      }),
    ).toBe(true);
  });
});

describe("contentIdsOf", () => {
  it("lists only what points at a document, passage, picture or clip", () => {
    const overlays: StreamOverlay[] = [
      createContentOverlay("scripture", "overlay-passage-1", "John 3:16"),
      createMarqueeOverlay("Welcome"),
    ];
    expect(contentIdsOf(overlays)).toEqual(["overlay-passage-1"]);
  });
});

describe("suggestedPresetName", () => {
  it("names a content overlay after its label", () => {
    expect(
      suggestedPresetName(
        createContentOverlay("manuscript", "doc-1", "Opening song"),
      ),
    ).toBe("Opening song");
  });

  it("names an announcement after its words", () => {
    expect(suggestedPresetName(createMarqueeOverlay("Welcome"))).toBe(
      "Welcome",
    );
  });
});
