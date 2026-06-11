DELETE FROM public.deal_contacts dc WHERE NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.id = dc.deal_id);
DELETE FROM public.deal_contacts dc WHERE NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = dc.contact_id);
DELETE FROM public.deal_stage_history h WHERE NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.id = h.deal_id);
DELETE FROM public.deal_stage_history h WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages s WHERE s.id = h.stage_id);

DELETE FROM public.deal_contacts a USING public.deal_contacts b
WHERE a.ctid < b.ctid AND a.deal_id = b.deal_id AND a.contact_id = b.contact_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_contacts_deal_id_fkey') THEN
    ALTER TABLE public.deal_contacts ADD CONSTRAINT deal_contacts_deal_id_fkey
      FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_contacts_contact_id_fkey') THEN
    ALTER TABLE public.deal_contacts ADD CONSTRAINT deal_contacts_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_contacts_deal_contact_unique') THEN
    ALTER TABLE public.deal_contacts ADD CONSTRAINT deal_contacts_deal_contact_unique
      UNIQUE (deal_id, contact_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_stage_history_deal_id_fkey') THEN
    ALTER TABLE public.deal_stage_history ADD CONSTRAINT deal_stage_history_deal_id_fkey
      FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_stage_history_stage_id_fkey') THEN
    ALTER TABLE public.deal_stage_history ADD CONSTRAINT deal_stage_history_stage_id_fkey
      FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_pipeline_id_fkey') THEN
    ALTER TABLE public.deals ADD CONSTRAINT deals_pipeline_id_fkey
      FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_company_id_fkey') THEN
    ALTER TABLE public.deals ADD CONSTRAINT deals_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_contact_id_fkey') THEN
    ALTER TABLE public.deals ADD CONSTRAINT deals_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;
END $$;