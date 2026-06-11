import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Company, Contact } from "@/shared/lib/types";

export type CompanyInput = {
  name: string;
  cvr?: string | null;
  website?: string | null;
  industry?: string | null;
  employees?: number | null;
  address?: string | null;
};

export function useCompanies() {
  const { workspace } = useWorkspace();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    const [{ data: comp, error: e1 }, { data: cts, error: e2 }] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contacts")
        .select("id, company_id")
        .eq("workspace_id", workspace.id),
    ]);
    if (e1 || e2) {
      setError(e1?.message ?? e2?.message ?? "Failed to load companies");
      setLoading(false);
      return;
    }
    const counts: Record<string, number> = {};
    for (const c of (cts ?? []) as Pick<Contact, "id" | "company_id">[]) {
      if (c.company_id) counts[c.company_id] = (counts[c.company_id] ?? 0) + 1;
    }
    setCompanies(comp ?? []);
    setContactCounts(counts);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CompanyInput) => {
      if (!workspace) throw new Error("No active workspace");
      const { data, error } = await supabase
        .from("companies")
        .insert({ ...input, workspace_id: workspace.id })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data as Company;
    },
    [workspace, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CompanyInput>) => {
      if (!workspace) throw new Error("No active workspace");
      const { error } = await supabase
        .from("companies")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      await refresh();
    },
    [workspace, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!workspace) throw new Error("No active workspace");
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      await refresh();
    },
    [workspace, refresh],
  );

  return { companies, contactCounts, loading, error, refresh, create, update, remove };
}

export function useCompany(id: string | undefined) {
  const { workspace } = useWorkspace();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace || !id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("id", id)
      .maybeSingle();
    if (error) setError(error.message);
    setCompany(data ?? null);
    setLoading(false);
  }, [workspace, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<CompanyInput>) => {
      if (!workspace || !id) return;
      const { data, error } = await supabase
        .from("companies")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select()
        .single();
      if (error) throw error;
      setCompany(data as Company);
    },
    [workspace, id],
  );

  const remove = useCallback(async () => {
    if (!workspace || !id) return;
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace.id);
    if (error) throw error;
  }, [workspace, id]);

  return { company, loading, error, refresh, update, remove };
}
