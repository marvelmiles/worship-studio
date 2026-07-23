import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import type { Background } from "../../types";
import { fade } from "../../theme/tokens";
import { formatDate } from "../../lib/id";

export interface UsedItem {
  id: string;
  name: string;
  count: number;
  bg?: Background;
}

export type UsageTab = "background" | "theme" | "sound";

/** One row in the Recent Activities feed, gathered from every module. */
export interface Activity {
  key: string;
  title: string;
  detail: string;
  at: string;
  icon: LucideIcon;
  open: () => void;
}

/** True when a doc was created and never meaningfully edited afterwards. */
export function isCreation(createdAt?: string, updatedAt?: string): boolean {
  if (!createdAt) return false;
  if (!updatedAt) return true;
  return +new Date(updatedAt) - +new Date(createdAt) < 5000;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

/** Time-of-day greeting. Neutral and inspirational through the week (the
 *  studio is used far beyond Sunday services); on Sundays the tone leans
 *  church/Christian inspirational. */
export function greeting(): { label: string; heading: string; tag: string } {
  const now = new Date();
  const h = now.getHours();
  const sunday = now.getDay() === 0;

  if (h >= 22 || h < 5)
    return {
      label: sunday ? "Blessed Sunday night!" : "Hello, night owl!",
      heading: "Burning the midnight oil",
      tag: sunday
        ? "He gives songs in the night. Rest is a gift too."
        : "The quiet hours are perfect for getting things done.",
    };

  if (sunday) {
    if (h < 12)
      return {
        label: "Happy Sunday!",
        heading: "This is the day the Lord has made",
        tag: "Rejoice, and let's make worship beautiful today.",
      };
    if (h < 17)
      return {
        label: "Happy Sunday!",
        heading: "Grateful hearts, joyful songs",
        tag: "May today's blessing carry through the whole week.",
      };
    return {
      label: "Blessed Sunday evening!",
      heading: "Well done, good and faithful",
      tag: "Rest and be refreshed. What you gave today mattered.",
    };
  }

  if (h < 12)
    return {
      label: "Good morning!",
      heading: "Rise and shine",
      tag: "A fresh start. Let's create something beautiful today.",
    };
  if (h < 17)
    return {
      label: "Good afternoon!",
      heading: "Keep the momentum going",
      tag: "Steady steps today become something great tomorrow.",
    };
  return {
    label: "Good evening!",
    heading: "Let your light shine",
    tag: "Even a quiet evening can carry a joyful song.",
  };
}

export function rank(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

/** Shared accent scheme for ranking bars: the top-ranked row gets the boldest
 *  fill and a glow, lower ranks fade progressively. */
export function rankBarStyle(
  accent: string,
  accentSoft: string,
  index: number,
): CSSProperties {
  const strength = Math.max(0.35, 1 - index * 0.16);
  return {
    background: `linear-gradient(90deg,${fade(accent, strength)},${fade(accentSoft, strength)})`,
    boxShadow: index === 0 ? `0 0 10px ${fade(accent, 0.35)}` : "none",
  };
}
