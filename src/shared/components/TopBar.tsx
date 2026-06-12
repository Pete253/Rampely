import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/shared/components/search/use-command-palette";

export function TopBar() {
  const { setOpen } = useCommandPalette();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-[10px] bg-white/6 px-3.5 text-sm text-white/40 transition-all duration-200 hover:bg-white/9 hover:text-white/60"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left text-[13px]">Search…</span>
        <kbd className="rounded-[5px] border border-white/10 bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}
