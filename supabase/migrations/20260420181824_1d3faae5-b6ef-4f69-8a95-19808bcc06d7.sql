ALTER TABLE public.workspaces
  ADD COLUMN country text NOT NULL DEFAULT 'DK',
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspaces.country IS 'ISO 3166-1 alpha-2 country code';