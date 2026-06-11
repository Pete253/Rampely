import { createContext, useContext, useState, type ReactNode } from "react";

export type CreateEntity = "company" | "contact" | "deal" | "task" | "event";

interface PendingCreateContextValue {
  pendingCreate: CreateEntity | null;
  setPendingCreate: (v: CreateEntity | null) => void;
}

const Ctx = createContext<PendingCreateContextValue | undefined>(undefined);

export function PendingCreateProvider({ children }: { children: ReactNode }) {
  const [pendingCreate, setPendingCreate] = useState<CreateEntity | null>(null);
  return (
    <Ctx.Provider value={{ pendingCreate, setPendingCreate }}>{children}</Ctx.Provider>
  );
}

export function usePendingCreate() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePendingCreate must be used inside PendingCreateProvider");
  return ctx;
}
