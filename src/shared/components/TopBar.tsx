import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/shared/components/search/use-command-palette";

export function TopBar() {
  const { setOpen } = useCommandPalette();
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}
