import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  hint?: string;
}

export function QuickAction({ icon: Icon, label, hint }: Props) {
  return (
    <div className="flex w-full items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      {hint && (
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {hint}
        </kbd>
      )}
    </div>
  );
}
