// Recharts theme for the dark app shell. Recharts needs concrete color values
// (it doesn't compute CSS vars correctly inside SVG fills/strokes), so the
// Rampely design-system hex values are inlined here.

export const chartTheme = {
  // Primary brand color used for default series
  primary: "#4759E8",
  muted: "rgba(255,255,255,0.4)",
  grid: "rgba(255,255,255,0.07)",
  axis: "rgba(255,255,255,0.4)",
  // Semantic chart colors
  won: "#28C840",
  lost: "#FF5F57",
  created: "#4759E8",
  fontSize: 11,
  fontFamily: "Manrope, system-ui, sans-serif",
} as const;

// Activity-type donut palette (5 types) — blue scale + semantic accents.
export const ACTIVITY_COLORS: Record<string, string> = {
  call: "#6B7FFF",
  email: "#4759E8",
  meeting: "#FEBC2E",
  note: "#8B99F0",
  task: "#28C840",
};

// Hover cursor (bar/line highlight) — subtle white wash instead of recharts' grey
export const tooltipCursor = { fill: "rgba(255,255,255,0.06)" } as const;

// Tooltip default style — elevated dark surface
export const tooltipStyle = {
  background: "#1A1D40",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  fontSize: 12,
  color: "#FFFFFF",
  fontFamily: "Manrope, system-ui, sans-serif",
};
