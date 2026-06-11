import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Deal, PipelineStage, Pipeline, Company } from "@/shared/lib/types";

export interface DealOwner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface DealContactRow {
  id: string;
  contact_id: string;
  is_primary: boolean;
  role: string | null;
  contact: {
    id: string;
    first_name: string;
    last_name: string | null;
    title: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface DealDetailData extends Deal {
  stage: PipelineStage | null;
  pipeline: Pipeline | null;
  company: Company | null;
  owner: DealOwner | null;
  contacts: DealContactRow[];
}

export function useDeal(dealId: string | undefined) {
  const { workspace } = useWorkspace();
  const [deal, setDeal] = useState<DealDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchDeal = useCallback(async () => {
    if (!dealId) return;
    // Guard: invalid UUID format → immediate not-found
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(dealId)) {
      setDeal(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!workspace) return;
    setLoading(true);
    setNotFound(false);

    const { data, error } = await supabase
      .from("deals")
      .select(
        "*, stage:pipeline_stages(*), pipeline:pipelines(*), company:companies(*)",
      )
      .eq("id", dealId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error || !data) {
      setDeal(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Fetch owner profile
    let owner: DealOwner | null = null;
    if (data.owner_id) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", data.owner_id)
        .maybeSingle();
      owner = p ?? null;
    }

    // Fetch deal_contacts
    const { data: dc } = await supabase
      .from("deal_contacts" as never)
      .select(
        "id, contact_id, is_primary, role, contact:contacts(id, first_name, last_name, title, email)",
      )
      .eq("deal_id", dealId)
      .order("is_primary", { ascending: false });

    setDeal({
      ...(data as unknown as Deal),
      stage: (data as { stage: PipelineStage | null }).stage ?? null,
      pipeline: (data as { pipeline: Pipeline | null }).pipeline ?? null,
      company: (data as { company: Company | null }).company ?? null,
      owner,
      contacts: (dc as unknown as DealContactRow[]) ?? [],
    });
    setLoading(false);
  }, [workspace, dealId]);

  useEffect(() => {
    void fetchDeal();
  }, [fetchDeal]);

  const update = useCallback(
    async (patch: Partial<Deal>) => {
      if (!workspace || !dealId) throw new Error("Not ready");
      const { error } = await supabase
        .from("deals")
        .update(patch)
        .eq("id", dealId)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      await fetchDeal();
    },
    [workspace, dealId, fetchDeal],
  );

  const remove = useCallback(async () => {
    if (!workspace || !dealId) throw new Error("Not ready");
    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId)
      .eq("workspace_id", workspace.id);
    if (error) throw error;
  }, [workspace, dealId]);

  const addContact = useCallback(
    async (contactId: string, opts?: { is_primary?: boolean; role?: string | null }) => {
      if (!dealId) throw new Error("No deal");
      const isPrimary = opts?.is_primary ?? false;
      if (isPrimary) {
        await supabase
          .from("deal_contacts" as never)
          .update({ is_primary: false } as never)
          .eq("deal_id", dealId);
      }
      const { error } = await supabase.from("deal_contacts" as never).insert({
        deal_id: dealId,
        contact_id: contactId,
        is_primary: isPrimary,
        role: opts?.role ?? null,
      } as never);
      if (error) throw error;
      // If primary, sync deals.contact_id
      if (isPrimary && workspace) {
        await supabase
          .from("deals")
          .update({ contact_id: contactId })
          .eq("id", dealId)
          .eq("workspace_id", workspace.id);
      } else if (workspace && deal?.contacts.length === 0) {
        // First contact added — make it the primary pointer too
        await supabase
          .from("deals")
          .update({ contact_id: contactId })
          .eq("id", dealId)
          .eq("workspace_id", workspace.id);
        await supabase
          .from("deal_contacts" as never)
          .update({ is_primary: true } as never)
          .eq("deal_id", dealId)
          .eq("contact_id", contactId);
      }
      await fetchDeal();
    },
    [dealId, workspace, deal, fetchDeal],
  );

  const removeContact = useCallback(
    async (contactId: string) => {
      if (!dealId) throw new Error("No deal");
      const wasPrimary = deal?.contacts.find((c) => c.contact_id === contactId)?.is_primary;
      const { error } = await supabase
        .from("deal_contacts" as never)
        .delete()
        .eq("deal_id", dealId)
        .eq("contact_id", contactId);
      if (error) throw error;
      // If we removed the primary, promote another or null deals.contact_id
      if (wasPrimary && workspace) {
        const remaining = deal?.contacts.filter((c) => c.contact_id !== contactId) ?? [];
        const next = remaining[0];
        if (next) {
          await supabase
            .from("deal_contacts" as never)
            .update({ is_primary: true } as never)
            .eq("deal_id", dealId)
            .eq("contact_id", next.contact_id);
          await supabase
            .from("deals")
            .update({ contact_id: next.contact_id })
            .eq("id", dealId)
            .eq("workspace_id", workspace.id);
        } else {
          await supabase
            .from("deals")
            .update({ contact_id: null })
            .eq("id", dealId)
            .eq("workspace_id", workspace.id);
        }
      }
      await fetchDeal();
    },
    [dealId, workspace, deal, fetchDeal],
  );

  const setPrimaryContact = useCallback(
    async (contactId: string) => {
      if (!dealId || !workspace) throw new Error("Not ready");
      await supabase
        .from("deal_contacts" as never)
        .update({ is_primary: false } as never)
        .eq("deal_id", dealId);
      const { error } = await supabase
        .from("deal_contacts" as never)
        .update({ is_primary: true } as never)
        .eq("deal_id", dealId)
        .eq("contact_id", contactId);
      if (error) throw error;
      await supabase
        .from("deals")
        .update({ contact_id: contactId })
        .eq("id", dealId)
        .eq("workspace_id", workspace.id);
      await fetchDeal();
    },
    [dealId, workspace, fetchDeal],
  );

  return {
    deal,
    loading,
    notFound,
    refresh: fetchDeal,
    update,
    remove,
    addContact,
    removeContact,
    setPrimaryContact,
  };
}
