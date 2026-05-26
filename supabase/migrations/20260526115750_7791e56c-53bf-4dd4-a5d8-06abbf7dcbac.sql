
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  github_url TEXT,
  skills TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Security definer to check membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(_workspace_id UUID, _user_id UUID)
RETURNS public.workspace_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id LIMIT 1;
$$;

-- Auto-add owner as member on workspace creation
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_workspace_created AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- Workspace policies
CREATE POLICY "workspace_select_member" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "workspace_insert_self" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "workspace_update_owner" ON public.workspaces FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "workspace_delete_owner" ON public.workspaces FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Member policies
CREATE POLICY "members_select" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members_insert_admin" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "members_update_admin" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "members_delete_admin" ON public.workspace_members FOR DELETE TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner','admin','member'));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner','admin','member'));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner','admin'));

-- Tasks
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');
CREATE TYPE public.task_priority AS ENUM ('P0', 'P1', 'P2');

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'P2',
  assignee_id UUID REFERENCES auth.users(id),
  due_date DATE,
  labels TEXT[],
  position INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.projects p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = _project_id AND wm.user_id = _user_id
  );
$$;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));

-- Snippets
CREATE TABLE public.snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  code TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snippets_select" ON public.snippets FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "snippets_insert" ON public.snippets FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "snippets_update" ON public.snippets FOR UPDATE TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "snippets_delete" ON public.snippets FOR DELETE TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));

-- Activity feed
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND actor_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
