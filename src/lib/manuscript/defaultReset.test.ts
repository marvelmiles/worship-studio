import { describe, expect, it } from "vitest";
import { defaultManuscript, seedManuscripts } from "../../data/seed";
import { matchesDefault } from "./defaults";

const shippedPair = async () => {
  const [seeded] = await seedManuscripts();
  const shipped = await defaultManuscript(seeded.id);
  if (!shipped) throw new Error(`No shipped manuscript for ${seeded.id}`);
  return { seeded, shipped };
};

describe("matchesDefault", () => {
  it("reads an untouched default manuscript as unchanged", async () => {
    const { seeded, shipped } = await shippedPair();
    expect(matchesDefault(seeded, shipped)).toBe(true);
  });

  it("reads a renamed manuscript as changed", async () => {
    const { seeded, shipped } = await shippedPair();
    expect(
      matchesDefault({ ...seeded, title: `${seeded.title} (live)` }, shipped),
    ).toBe(false);
  });

  it("reads a retyped slide as changed", async () => {
    const { seeded, shipped } = await shippedPair();
    const edited = {
      ...seeded,
      slides: seeded.slides.map((slide, index) =>
        index === 0 ? { ...slide, lines: ["Changed"] } : slide,
      ),
    };
    expect(matchesDefault(edited, shipped)).toBe(false);
  });
});
