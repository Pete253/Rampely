import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Company, Contact } from "@/shared/lib/types";

export type ContactInput = {
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  company_id?: string | null;
};

export type ContactWithCompany = Contact & { company: Pick<Company, "id" | "name"> | null };

export function useContacts(opts?: { companyId?: string }) {
  const { workspace } = useWorkspace();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    let q = supabase
      .from("contacts")
      .select("*, company:companies(id, name)")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    if (opts?.companyId) q = q.eq("company_id", opts.companyId);
    const { data, error } = await q;
    if (error) setError(error.message);
    setContacts((data ?? []) as ContactWithCompany[]);
    setLoading(false);
  }, [workspace, opts?.companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: ContactInput) => {
      if (!workspace) throw new Error("No active workspace");
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...input, workspace_id: workspace.id })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data as Contact;
    },
    [workspace, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<ContactInput>) => {
      if (!workspace) throw new Error("No active workspace");
      const { error } = await supabase
        .from("contacts")
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
        .from("contacts")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      await refresh();
    },
    [workspace, refresh],
  );

  return { contacts, loading, error, refresh, create, update, remove };
}

export function useContact(id: string | undefined) {
  const { workspace } = useWorkspace();
  const [contact, setContact] = useState<ContactWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace || !id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*, company:companies(id, name)")
      .eq("workspace_id", workspace.id)
      .eq("id", id)
      .maybeSingle();
    if (error) setError(error.message);
    setContact((data as ContactWithCompany) ?? null);
    setLoading(false);
  }, [workspace, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<ContactInput>) => {
      if (!workspace || !id) return;
      const { data, error } = await supabase
        .from("contacts")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select("*, company:companies(id, name)")
        .single();
      if (error) throw error;
      setContact(data as ContactWithCompany);
    },
    [workspace, id],
  );

  const remove = useCallback(async () => {
    if (!workspace || !id) return;
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace.id);
    if (error) throw error;
  }, [workspace, id]);

  return { contact, loading, error, refresh, update, remove };
}
