import { describe, expect, it } from "vitest";
import { windowFeatures } from "./liveWindow";

const tv = { left: 1920, top: 0, width: 1920, height: 1080 };

const featureMap = (features: string): Record<string, string> =>
  Object.fromEntries(
    features.split(",").map((feature) => {
      const [name, value = ""] = feature.split("=");
      return [name, value];
    }),
  );

describe("windowFeatures", () => {
  it("opens the window on the display it was given", () => {
    const features = featureMap(windowFeatures(tv, true));

    expect(features).toMatchObject({
      left: "1920",
      top: "0",
      width: "1920",
      height: "1080",
    });
  });

  /* A window cannot be told to fill a display after it has opened, so the one
     click that opens it has to ask for both at once. */
  it("asks for a window that already fills the display", () => {
    expect(windowFeatures(tv, true)).toContain("fullscreen");
  });

  it("stays a popup, which is the only kind of window that can fill one", () => {
    expect(featureMap(windowFeatures(tv, true)).popup).toBe("yes");
  });

  it("does not ask to fill a display this site may not touch", () => {
    expect(windowFeatures(tv, false)).not.toContain("fullscreen");
  });
});
