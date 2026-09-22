import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIDEO_SETTINGS,
  audioPlayLength,
  formatTrimmedDuration,
  isTrimmed,
  mediaPlayLength,
  trimmedDuration,
} from "./media";
import type { AudioItem, MediaItem } from "../types";

const video = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "clip",
  kind: "video",
  name: "Clip",
  size: 1,
  duration: 60,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("trimmedDuration", () => {
  it("returns the full length when nothing is trimmed", () => {
    expect(trimmedDuration(60)).toBe(60);
    expect(trimmedDuration(60, { trimStart: 0, trimEnd: null })).toBe(60);
  });

  it("measures the window between the trim points", () => {
    expect(trimmedDuration(60, { trimStart: 10, trimEnd: 40 })).toBe(30);
    expect(trimmedDuration(60, { trimStart: 15, trimEnd: null })).toBe(45);
  });

  it("never runs past the clip or below zero", () => {
    expect(trimmedDuration(60, { trimStart: 10, trimEnd: 90 })).toBe(50);
    expect(trimmedDuration(60, { trimStart: 70, trimEnd: null })).toBe(0);
  });

  it("uses the trim end when the clip length is unknown", () => {
    expect(trimmedDuration(undefined, { trimStart: 5, trimEnd: 20 })).toBe(15);
    expect(trimmedDuration(undefined, { trimStart: 5, trimEnd: null })).toBe(
      undefined,
    );
    expect(trimmedDuration(Number.NaN)).toBe(undefined);
  });
});

describe("formatTrimmedDuration", () => {
  it("names the full length only when the clip is trimmed", () => {
    expect(formatTrimmedDuration(60)).toBe("1:00");
    expect(formatTrimmedDuration(60, { trimStart: 10, trimEnd: 40 })).toBe(
      "0:30 of 1:00",
    );
    expect(isTrimmed(60, { trimStart: 0, trimEnd: 60 })).toBe(false);
  });
});

describe("play lengths", () => {
  it("reads a video's saved trim", () => {
    expect(mediaPlayLength(video())).toBe(60);
    expect(
      mediaPlayLength(
        video({ video: { ...DEFAULT_VIDEO_SETTINGS, trimStart: 20 } }),
      ),
    ).toBe(40);
  });

  it("leaves an image's length alone", () => {
    expect(mediaPlayLength(video({ kind: "image", duration: undefined }))).toBe(
      undefined,
    );
  });

  it("reads a sound's saved trim", () => {
    const sound: AudioItem = {
      id: "sound",
      name: "Sound",
      duration: 120,
      settings: { trimStart: 30, trimEnd: 90, volume: 100 },
    };
    expect(audioPlayLength(sound)).toBe(60);
    expect(audioPlayLength({ ...sound, settings: undefined })).toBe(120);
  });
});
