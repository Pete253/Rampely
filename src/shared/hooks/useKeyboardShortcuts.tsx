import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { isEditableTarget } from "@/shared/components/search/use-command-palette";
import {
  usePendingCreate,
  type CreateEntity,
} from "@/shared/contexts/PendingCreateContext";

interface ShortcutsHelpContextValue {
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
}

const Ctx = createContext<ShortcutsHelpContextValue | undefined>(undefined);

export function ShortcutsHelpProvider({ children }: { children: ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);
  return <Ctx.Provider value={{ helpOpen, setHelpOpen }}>{children}</Ctx.Provider>;
}

export function useShortcutsHelp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShortcutsHelp must be used inside ShortcutsHelpProvider");
  return ctx;
}

const LEADER_WINDOW_MS = 1000;

const NAV_MAP: Record<string, string> = {
  h: "/reports",
  c: "/companies",
  p: "/contacts",
  d: "/pipeline",
  l: "/calendar",
  t: "/tasks",
};

const CREATE_MAP: Record<string, CreateEntity> = {
  c: "company",
  p: "contact",
  d: "deal",
  t: "task",
  e: "event",
};

const CREATE_ROUTE: Record<CreateEntity, string> = {
  company: "/companies",
  contact: "/contacts",
  deal: "/pipeline",
  task: "/tasks",
  event: "/calendar",
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { setPendingCreate } = usePendingCreate();
  const { setHelpOpen } = useShortcutsHelp();
  const leaderRef = useRef<{ key: "g" | "n"; at: number } | null>(null);

  const clearLeader = useCallback(() => {
    leaderRef.current = null;
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();

      // ? for help
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        clearLeader();
        return;
      }

      const now = Date.now();
      const leader = leaderRef.current;
      const fresh = leader && now - leader.at <= LEADER_WINDOW_MS;

      if (fresh && leader) {
        if (leader.key === "g" && NAV_MAP[key]) {
          e.preventDefault();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigate({ to: NAV_MAP[key] as any });
          clearLeader();
          return;
        }
        if (leader.key === "n" && CREATE_MAP[key]) {
          e.preventDefault();
          const entity = CREATE_MAP[key];
          setPendingCreate(entity);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigate({ to: CREATE_ROUTE[entity] as any });
          clearLeader();
          return;
        }
        clearLeader();
      }

      if (key === "g" || key === "n") {
        leaderRef.current = { key, at: now };
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, setPendingCreate, setHelpOpen, clearLeader]);
}
