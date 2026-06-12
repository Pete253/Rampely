import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RampelyLockup } from "@/shared/components/brand/RampelyLockup";

/**
 * Full-screen auth backdrop: the brand hero gradient with a centered,
 * frosted dark panel (the one sanctioned gradient in the design system).
 */
export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="bg-hero-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className={cn(
          "shadow-modal w-full max-w-sm rounded-xl border border-white/12 bg-app-bg/85 backdrop-blur-md",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Centered white-on-dark lockup used at the top of auth panels. */
export function AuthLogo({ height = 36 }: { height?: number }) {
  return (
    <div className="flex justify-center">
      <RampelyLockup height={height} className="text-white" />
    </div>
  );
}
