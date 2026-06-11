// Recharts theme tied to CSS theme tokens. Recharts needs concrete color values
// (it doesn't compute CSS vars correctly inside SVG fills/strokes), so we expose
// HSL helper colors mapped to the design system.

export const chartTheme = {
  // Primary brand color used for default series
  primary: "hsl(var(--primary, 222 47% 11%))",
  muted: "hsl(var(--muted-foreground, 215 16% 47%))",
  grid: "hsl(var(--border, 220 13% 91%))",
  axis: "hsl(var(--muted-foreground, 215 16% 47%))",
  // Semantic chart colors — kept distinct from theme accents for legibility
  won: "#10b981",
  lost: "#ef4444",
  created: "#6366f1",
  fontSize: 11,
  fontFamily: "Inter, system-ui, sans-serif",
} as const;

// Activity-type donut palette (5 types).
export const ACTIVITY_COLORS: Record<string, string> = {
  call: "#06b6d4",
  email: "#6366f1",
  meeting: "#f59e0b",
  note: "#94a3b8",
  task: "#10b981",
};

// Tooltip default style
export const tooltipStyle = {
  background: "hsl(var(--popover, 0 0% 100%))",
  border: "1px solid hsl(var(--border, 220 13% 91%))",
  borderRadius: 6,
  fontSize: 12,
};
