import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  secondary?: string | null;
  query?: string;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-accent px-0.5 text-accent-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchResultItem({ icon: Icon, label, secondary, query }: Props) {
  return (
    <div className="flex w-full items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{highlight(label, query ?? "")}</div>
        {secondary && (
          <div className="truncate text-xs text-muted-foreground">
            {highlight(secondary, query ?? "")}
          </div>
        )}
      </div>
    </div>
  );
}
