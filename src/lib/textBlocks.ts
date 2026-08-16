/**
 * Breaking long text into parts small enough to be read at a glance.
 *
 * Two callers share this: the Bible module, which splits a verse that would
 * overflow a projected slide, and the broadcast overlays, which split a passage
 * or a manuscript into as many blocks as its frame has room for. Both need the
 * same thing — breaks at word boundaries, nudged toward the nearest sentence
 * pause, landing as close as possible to an even division of the text — so the
 * maths lives here rather than in either feature.
 */

/**
 * Splits text into roughly equal parts at word boundaries, nudging each break
 * toward the nearest sentence punctuation so parts read naturally. Text already
 * inside the budget is returned untouched.
 */
export function splitTextIntoParts(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const count = Math.ceil(text.length / maxChars);
  const words = text.split(/\s+/).filter(Boolean);

  // Word boundaries as cumulative character positions (position after word i).
  const bounds: { pos: number; index: number; punct: boolean }[] = [];
  let pos = 0;
  words.forEach((word, i) => {
    pos += (i === 0 ? 0 : 1) + word.length;
    bounds.push({ pos, index: i, punct: /[,;:.!?]$/.test(word) });
  });

  const total = text.length;
  const chosen: number[] = []; // word indices after which we break
  for (let k = 1; k < count; k++) {
    const ideal = (total * k) / count;
    const prev = chosen.length ? chosen[chosen.length - 1] : -1;
    let best = -1;
    let bestScore = Infinity;
    for (const b of bounds) {
      if (b.index <= prev || b.index >= words.length - 1) continue;
      // Distance from the ideal split point, with a discount for breaking
      // right after punctuation so natural pauses win close calls.
      const score = Math.abs(b.pos - ideal) - (b.punct ? maxChars * 0.15 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = b.index;
      }
    }
    if (best >= 0) chosen.push(best);
  }

  const parts: string[] = [];
  let start = 0;
  for (const breakIdx of chosen) {
    parts.push(words.slice(start, breakIdx + 1).join(" "));
    start = breakIdx + 1;
  }
  parts.push(words.slice(start).join(" "));
  return parts.filter(Boolean);
}

/**
 * Packs lines into blocks that each stay inside the character budget, keeping
 * the original line structure wherever it fits. A single line longer than the
 * whole budget is split into parts of its own, so one runaway paragraph never
 * produces a block that cannot be shown.
 *
 * Always returns at least one block, so callers can index into the result
 * without guarding for empty content.
 */
export function splitLinesIntoBlocks(
  lines: string[],
  maxChars: number,
): string[][] {
  const budget = Math.max(1, Math.floor(maxChars));
  const blocks: string[][] = [];
  let current: string[] = [];
  let used = 0;

  const flush = () => {
    if (current.length === 0) return;
    blocks.push(current);
    current = [];
    used = 0;
  };

  for (const line of lines) {
    for (const part of splitTextIntoParts(line, budget)) {
      if (used > 0 && used + part.length > budget) flush();
      current.push(part);
      used += part.length + 1;
    }
  }
  flush();

  return blocks.length > 0 ? blocks : [[]];
}
