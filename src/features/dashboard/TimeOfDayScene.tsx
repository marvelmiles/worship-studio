import { useId } from "react";
import { useUITheme } from "../../theme/ThemeProvider";

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

/** Fixed star field so the night sky doesn't reshuffle on re-render. */
const STARS: [number, number, number, number][] = [
  [46, 44, 1.3, 0.8],
  [104, 98, 1, 0.5],
  [158, 34, 1.6, 0.9],
  [214, 80, 1, 0.45],
  [262, 26, 1.2, 0.7],
  [312, 104, 1, 0.5],
  [344, 48, 1.5, 0.85],
  [408, 24, 1, 0.55],
  [560, 128, 1.1, 0.6],
  [524, 36, 1.4, 0.8],
  [576, 84, 1, 0.5],
  [136, 138, 1, 0.4],
  [380, 118, 1, 0.45],
  [452, 148, 1, 0.4],
];

const SUN: Record<
  Exclude<DayPeriod, "night">,
  { cx: number; cy: number; body: string; glow: string; halo: number }
> = {
  // Rising sun peeking over the far ridge.
  morning: { cx: 400, cy: 158, body: "#fde68a", glow: "#fbbf24", halo: 160 },
  // High, bright sun.
  afternoon: { cx: 460, cy: 76, body: "#fef3c7", glow: "#fcd34d", halo: 140 },
  // Low, warm setting sun.
  evening: { cx: 420, cy: 152, body: "#fdba74", glow: "#fb7185", halo: 170 },
};

const FAR_RIDGE =
  "M0,238 C80,232 140,196 210,206 C280,216 300,168 380,150 C440,138 500,180 600,168";
const NEAR_RIDGE =
  "M0,286 C70,278 120,244 200,252 C270,258 320,208 410,196 C480,187 540,224 600,214";

/** Decorative skyline that blends into the app's night-purple background.
 *  Renders a sunrise, daytime sun, sunset or crescent moon depending on the
 *  period so it always matches the dashboard greeting. */
export function TimeOfDayScene({ period }: { period: DayPeriod }) {
  const theme = useUITheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `tod-${name}-${uid}`;
  const night = period === "night";
  const sun = night ? null : SUN[period];
  const glowColor = night ? theme.colors.accentSoft : sun!.glow;

  return (
    <svg
      viewBox="0 0 600 320"
      width="100%"
      height="100%"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id={id("halo")}>
          <stop offset="0%" stopColor={glowColor} stopOpacity={night ? 0.38 : 0.5} />
          <stop offset="55%" stopColor={glowColor} stopOpacity={night ? 0.13 : 0.18} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("sky")} x1="1" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#4c1d95" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("far")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7d5ce0" stopOpacity="0.65" />
          <stop offset="45%" stopColor="#43318f" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1a1338" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("near")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d2b7d" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#221a4a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0b0918" stopOpacity="0" />
        </linearGradient>
        <mask id={id("crescent")}>
          <rect x="0" y="0" width="600" height="320" fill="white" />
          <circle cx="503" cy="58" r="27" fill="black" />
        </mask>
      </defs>

      {/* Ambient sky wash in the top-right corner. */}
      <rect x="0" y="0" width="600" height="320" fill={`url(#${id("sky")})`} />

      {night ? (
        <>
          {STARS.map(([x, y, r, o]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#e9e5ff" opacity={o} />
          ))}
          <circle cx="488" cy="72" r="130" fill={`url(#${id("halo")})`} />
          <circle
            cx="488"
            cy="72"
            r="30"
            fill="#ece9ff"
            mask={`url(#${id("crescent")})`}
          />
        </>
      ) : (
        <>
          <circle cx={sun!.cx} cy={sun!.cy} r={sun!.halo} fill={`url(#${id("halo")})`} />
          <circle cx={sun!.cx} cy={sun!.cy} r="26" fill={sun!.body} opacity="0.95" />
        </>
      )}

      {/* Far ridge with a soft lit edge. */}
      <path d={`${FAR_RIDGE} L600,320 L0,320 Z`} fill={`url(#${id("far")})`} />
      <path
        d={FAR_RIDGE}
        fill="none"
        stroke={glowColor}
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />

      {/* Near ridge: wide soft glow under a crisp highlight line. */}
      <path d={`${NEAR_RIDGE} L600,320 L0,320 Z`} fill={`url(#${id("near")})`} />
      <path
        d={NEAR_RIDGE}
        fill="none"
        stroke={glowColor}
        strokeOpacity="0.14"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={NEAR_RIDGE}
        fill="none"
        stroke={glowColor}
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
