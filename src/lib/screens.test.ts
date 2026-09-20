import { describe, expect, it } from "vitest";
import {
  isOnScreen,
  pickProjectorScreen,
  projectorScreenOf,
  screenLabel,
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

describe("projectorScreenOf", () => {
  const laptop = screen("laptop", { isPrimary: true, isInternal: true });
  const tv = screen("tv", {
    left: 1920,
    top: -120,
    availLeft: 1920,
    availTop: -80,
    availWidth: 1900,
    availHeight: 1000,
  });

  it("keeps the taskbar clear when placing the window", () => {
    expect(projectorScreenOf(details([laptop, tv]))?.placement).toEqual({
      left: 1920,
      top: -80,
      width: 1900,
      height: 1000,
    });
  });

  it("measures the whole display when asking where a window stands", () => {
    expect(projectorScreenOf(details([laptop, tv]))?.bounds).toEqual({
      left: 1920,
      top: -120,
      width: 1920,
      height: 1080,
    });
  });

  it("finds nothing on a device with one display", () => {
    expect(projectorScreenOf(details([laptop]))).toBeNull();
  });
});

describe("isOnScreen", () => {
  const laptop = screen("laptop", { isPrimary: true, isInternal: true });
  const tv = screen("tv", { left: 1920, availTop: 40 });
  const projector = projectorScreenOf(details([laptop, tv]));

  const windowAt = (screenX: number, screenY: number) =>
    ({ screenX, screenY }) as Window;

  it("counts a window standing on the display", () => {
    expect(isOnScreen(windowAt(2400, 300), projector!)).toBe(true);
  });

  /* A window filling the display sits above the taskbar, outside the area it
     was placed in, and is still on the projector. */
  it("counts a window that has gone fullscreen above the taskbar", () => {
    expect(isOnScreen(windowAt(1920, 0), projector!)).toBe(true);
  });

  it("rejects a window left behind on the laptop", () => {
    expect(isOnScreen(windowAt(300, 200), projector!)).toBe(false);
  });
});

describe("screenLabel", () => {
  it("names a display the browser would not name", () => {
    expect(screenLabel(screen("", { label: "" }), 1)).toBe("Display 2");
  });

  it("marks the built-in display of a laptop", () => {
    expect(screenLabel(screen("", { label: "", isInternal: true }), 0)).toBe(
      "Built-in display",
    );
  });

  it("keeps the name the browser gives", () => {
    expect(screenLabel(screen("BenQ"), 0)).toBe("BenQ");
  });
});
