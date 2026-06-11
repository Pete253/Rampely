import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
}

const Ctx = createContext<CommandPaletteContextValue | undefined>(undefined);

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const setOpenSafe = useCallback((v: boolean) => setOpen(v), []);
  const setQuerySafe = useCallback((v: string) => setQuery(v), []);

  return (
    <Ctx.Provider value={{ open, setOpen: setOpenSafe, query, setQuery: setQuerySafe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return ctx;
}
