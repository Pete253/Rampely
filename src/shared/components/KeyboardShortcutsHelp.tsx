import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useShortcutsHelp } from "@/shared/hooks/useKeyboardShortcuts";

interface Shortcut {
  keys: string[];
  label: string;
}

const NAVIGATION: Shortcut[] = [
  { keys: ["G", "H"], label: "Go to Reports" },
  { keys: ["G", "C"], label: "Go to Companies" },
  { keys: ["G", "P"], label: "Go to Contacts" },
  { keys: ["G", "D"], label: "Go to Pipeline" },
  { keys: ["G", "L"], label: "Go to Calendar" },
  { keys: ["G", "T"], label: "Go to Tasks" },
];

const CREATE: Shortcut[] = [
  { keys: ["N", "C"], label: "Create Company" },
  { keys: ["N", "P"], label: "Create Contact" },
  { keys: ["N", "D"], label: "Create Deal" },
  { keys: ["N", "T"], label: "Create Task" },
  { keys: ["N", "E"], label: "Create Event" },
];

const OTHER: Shortcut[] = [{ keys: ["?"], label: "Show this help" }];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function Section({ title, items }: { title: string; items: Shortcut[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between rounded-md px-2 py-1 text-sm"
          >
            <span>{s.label}</span>
            <span className="flex gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KeyboardShortcutsHelp() {
  const { helpOpen, setHelpOpen } = useShortcutsHelp();
  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
            <span>Open command palette</span>
            <span className="flex gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
          <Section title="Navigation" items={NAVIGATION} />
          <Section title="Create" items={CREATE} />
          <Section title="Other" items={OTHER} />
          <p className="text-xs text-muted-foreground">
            Tip: Press the first letter, release, then press the second within a second.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
