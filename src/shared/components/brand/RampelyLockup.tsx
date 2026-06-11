import { RampelyMark } from "./RampelyMark";

interface RampelyLockupProps {
  height?: number;
  className?: string;
}

/**
 * Full Rampely lockup: brandmark + wordmark.
 * Wordmark color follows currentColor for theming flexibility.
 */
export function RampelyLockup({ height = 32, className }: RampelyLockupProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(height * 0.31),
        lineHeight: 1,
      }}
    >
      <RampelyMark size={height} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: Math.round(height * 0.62),
          letterSpacing: "-0.02em",
          color: "currentColor",
        }}
      >
        Rampely
      </span>
    </div>
  );
}