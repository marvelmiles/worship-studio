import { useCallback, useEffect, useRef, useState } from "react";

export const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Reads a queue of text chunks aloud with the Web Speech API. One utterance
 * per chunk so callers can highlight/advance as each chunk starts.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [chunkIndex, setChunkIndex] = useState<number | null>(null);
  // Bumped on every stop/speak so stale utterance callbacks become no-ops.
  const session = useRef(0);

  const stop = useCallback(() => {
    session.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
    setChunkIndex(null);
  }, []);

  const speak = useCallback(
    (chunks: string[], onChunkStart?: (index: number) => void) => {
      if (!speechSupported) return;
      window.speechSynthesis.cancel();
      const id = ++session.current;
      const list = chunks
        .map((text, index) => ({ text: text.trim(), index }))
        .filter((chunk) => chunk.text);
      if (!list.length) {
        setSpeaking(false);
        setChunkIndex(null);
        return;
      }
      setSpeaking(true);
      list.forEach((chunk, i) => {
        const utterance = new SpeechSynthesisUtterance(chunk.text);
        utterance.onstart = () => {
          if (session.current !== id) return;
          setChunkIndex(chunk.index);
          onChunkStart?.(chunk.index);
        };
        if (i === list.length - 1) {
          utterance.onend = () => {
            if (session.current !== id) return;
            setSpeaking(false);
            setChunkIndex(null);
          };
        }
        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  useEffect(() => stop, [stop]);

  return { supported: speechSupported, speaking, chunkIndex, speak, stop };
}
