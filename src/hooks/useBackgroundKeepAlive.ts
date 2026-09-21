import { useEffect } from "react";

type AudioContextConstructor = new () => AudioContext;

interface AudioWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

/* Chrome only counts a page as playing once its output rises above roughly
   -72 dBFS, so the tone sits at -60 dBFS: enough to keep a hidden or minimised
   page running, and still far too quiet and too low to be heard. */
const KEEP_ALIVE_GAIN = 0.001;
const KEEP_ALIVE_FREQUENCY = 30;

const audioContextConstructor = (): AudioContextConstructor | null => {
  const scope = window as AudioWindow;
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
};

/**
 * Holds a page open while it is out of sight. A browser freezes a hidden tab
 * and throttles its timers, which stalls a camera that is meant to keep
 * sending; a page that is playing audio is left running instead, so an
 * inaudible tone plays for as long as the work needs to continue.
 */
export const useBackgroundKeepAlive = (isEnabled: boolean): void => {
  useEffect(() => {
    if (!isEnabled) return;
    const AudioContextClass = audioContextConstructor();
    if (!AudioContextClass) return;

    let context: AudioContext;
    try {
      context = new AudioContextClass();
    } catch {
      return;
    }

    const gain = context.createGain();
    gain.gain.value = KEEP_ALIVE_GAIN;
    const oscillator = context.createOscillator();
    oscillator.frequency.value = KEEP_ALIVE_FREQUENCY;
    oscillator.connect(gain);
    gain.connect(context.destination);

    try {
      oscillator.start();
    } catch {}

    // A phone suspends the context while it sleeps, so it is resumed on return.
    const resume = () => void context.resume().catch(() => {});
    resume();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      try {
        oscillator.stop();
      } catch {}
      oscillator.disconnect();
      gain.disconnect();
      void context.close().catch(() => {});
    };
  }, [isEnabled]);
};
