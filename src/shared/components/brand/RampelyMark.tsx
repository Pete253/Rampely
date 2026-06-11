interface RampelyMarkProps {
  size?: number;
  primary?: string;
  primaryLight?: string;
  className?: string;
}

/**
 * Rampely brandmark — exact SVG from the brand board.
 * A light vertical capsule, a solid primary circle at its base,
 * and a rotated diagonal capsule across the middle.
 */
export function RampelyMark({
  size = 32,
  primary = "var(--rampely-primary)",
  primaryLight = "var(--rampely-primary-light)",
  className,
}: RampelyMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Rampely"
    >
      {/* Light vertical capsule behind */}
      <rect x="128" y="22" width="48" height="146" rx="24" fill={primaryLight} />
      {/* Solid circle — bottom of vertical pill, in primary */}
      <circle cx="152" cy="154" r="24" fill={primary} />
      {/* Main diagonal capsule */}
      <g transform="rotate(-22 100 100)">
        <rect x="14" y="76" width="172" height="48" rx="24" fill={primary} />
      </g>
    </svg>
  );
}