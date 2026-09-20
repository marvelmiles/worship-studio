import { describe, expect, it } from "vitest";
import {
  pickProjectorScreen,
  type ScreenDetailed,
  type ScreenDetails,
} from "./screens";

const screen = (
  label: string,
  extra: Partial<ScreenDetailed> = {},
): ScreenDetailed => ({
  label,
  left: 0,
  top: 0,
  width: 1920,
  height: 1080,
  isPrimary: false,
  isInternal: false,
  ...extra,
});

const details = (
  screens: ScreenDetailed[],
  currentIndex = 0,
): ScreenDetails => ({ screens, currentScreen: screens[currentIndex] });

describe("pickProjectorScreen", () => {
  it("finds nothing when this device has one display", () => {
    const laptop = screen("laptop", { isPrimary: true, isInternal: true });

    expect(pickProjectorScreen(details([laptop]))).toBeNull();
  });

  it("takes the attached screen rather than the built-in one", () => {
    const laptop = screen("laptop", { isPrimary: true, isInternal: true });
    const tv = screen("tv", { left: 1920 });

    expect(pickProjectorScreen(details([laptop, tv]))?.label).toBe("tv");
  });

  it("never projects onto the display the app is already on", () => {
    const laptop = screen("laptop", { isPrimary: true, isInternal: true });
    const tv = screen("tv", { left: 1920 });

    /* The operator has dragged the app onto the television, so the laptop is
       the one left to project onto. */
    expect(pickProjectorScreen(details([laptop, tv], 1))?.label).toBe("laptop");
  });

  it("falls back to any other display when none says what it is", () => {
    const first = screen("first", {
      isPrimary: undefined,
      isInternal: undefined,
    });
    const second = screen("second", {
      isPrimary: undefined,
      isInternal: undefined,
      left: 1920,
    });

    expect(pickProjectorScreen(details([first, second]))?.label).toBe("second");
  });

  it("prefers an attached screen that is not the primary one", () => {
    const laptop = screen("laptop", { isPrimary: false, isInternal: true });
    const monitor = screen("monitor", { isPrimary: true, left: 1920 });
    const projector = screen("projector", { left: 3840 });

    expect(
      pickProjectorScreen(details([laptop, monitor, projector]))?.label,
    ).toBe("projector");
  });
});
