export const splitTextIntoParts = (
  text: string,
  maxChars: number,
): string[] => {
  if (text.length <= maxChars) return [text];
  const count = Math.ceil(text.length / maxChars);
  const words = text.split(/\s+/).filter(Boolean);

  const bounds: { pos: number; index: number; punct: boolean }[] = [];
  let pos = 0;
  words.forEach((word, i) => {
    pos += (i === 0 ? 0 : 1) + word.length;
    bounds.push({ pos, index: i, punct: /[,;:.!?]$/.test(word) });
  });

  const total = text.length;
  const chosen: number[] = [];
  for (let k = 1; k < count; k++) {
    const ideal = (total * k) / count;
    const prev = chosen.length ? chosen[chosen.length - 1] : -1;
    let best = -1;
    let bestScore = Infinity;
    for (const b of bounds) {
      if (b.index <= prev || b.index >= words.length - 1) continue;
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
};

export const splitLinesIntoBlocks = (
  lines: string[],
  maxChars: number,
): string[][] => {
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
};
