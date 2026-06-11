
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.deal_status AS ENUM ('open', 'won', 'lost');
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task');

-- Profiles (mirrors auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace members
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cvr TEXT,
  website TEXT,
  industry TEXT,
  employees INTEGER,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_companies_workspace ON public.companies(workspace_id);

-- Contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_workspace ON public.contacts(workspace_id);

-- Pipelines
CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipelines_workspace ON public.pipelines(workspace_id);

-- Pipeline stages
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  probability INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_pipeline_stages_pipeline ON public.pipeline_stages(pipeline_id);

-- Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'DKK',
  expected_close_date DATE,
  status deal_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_workspace ON public.deals(workspace_id);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  subject TEXT,
  body TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_workspace ON public.activities(workspace_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer: workspace membership check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id UUID, _user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = _role
  );
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Members view workspace" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "Owners update workspace" ON public.workspaces FOR UPDATE TO authenticated USING (public.has_workspace_role(id, auth.uid(), 'owner'));
CREATE POLICY "Authenticated create workspace" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);

-- Workspace members policies
CREATE POLICY "Members view workspace members" ON public.workspace_members FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Owners manage members" ON public.workspace_members FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), 'owner')) WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

-- Generic workspace-scoped policies (companies, contacts, pipelines, deals, activities)
CREATE POLICY "Members access companies" ON public.companies FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members access contacts" ON public.contacts FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members access pipelines" ON public.pipelines FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members access deals" ON public.deals FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members access activities" ON public.activities FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- Pipeline stages: scoped via parent pipeline
CREATE POLICY "Members access pipeline stages" ON public.pipeline_stages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND public.is_workspace_member(p.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- Signup trigger: create profile + personal workspace + owner membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _full_name TEXT;
  _workspace_id UUID;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, _full_name);

  INSERT INTO public.workspaces (name)
  VALUES (_full_name || '''s Workspace')
  RETURNING id INTO _workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
