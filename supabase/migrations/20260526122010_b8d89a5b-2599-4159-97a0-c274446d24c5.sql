
CREATE TABLE public.wiki_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  parent_id UUID REFERENCES public.wiki_pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_select" ON public.wiki_pages FOR SELECT TO authenticated USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "wiki_insert" ON public.wiki_pages FOR INSERT TO authenticated WITH CHECK (is_project_member(project_id, auth.uid()));
CREATE POLICY "wiki_update" ON public.wiki_pages FOR UPDATE TO authenticated USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "wiki_delete" ON public.wiki_pages FOR DELETE TO authenticated USING (is_project_member(project_id, auth.uid()));

CREATE TABLE public.wiki_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  edited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wiki_page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_ver_select" ON public.wiki_page_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wiki_pages p WHERE p.id = page_id AND is_project_member(p.project_id, auth.uid())));
CREATE POLICY "wiki_ver_insert" ON public.wiki_page_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wiki_pages p WHERE p.id = page_id AND is_project_member(p.project_id, auth.uid())));

CREATE OR REPLACE FUNCTION public.snapshot_wiki_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.content IS DISTINCT FROM NEW.content) OR (OLD.title IS DISTINCT FROM NEW.title) THEN
    INSERT INTO public.wiki_page_versions (page_id, title, content, edited_by)
    VALUES (OLD.id, OLD.title, OLD.content, NEW.updated_by);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wiki_version BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_wiki_version();

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.task_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id, auth.uid())));
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id, auth.uid())));
CREATE POLICY "comments_update_own" ON public.task_comments FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "comments_delete_own" ON public.task_comments FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  workspace_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by UUID,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites_select_admin" ON public.workspace_invites FOR SELECT TO authenticated
  USING (get_workspace_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "invites_insert_admin" ON public.workspace_invites FOR INSERT TO authenticated
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "invites_delete_admin" ON public.workspace_invites FOR DELETE TO authenticated
  USING (get_workspace_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id);

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.workspace_invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.workspace_invites
    WHERE token = _token AND accepted_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invite'; END IF;
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, auth.uid(), inv.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  UPDATE public.workspace_invites SET accepted_at = now() WHERE id = inv.id;
  RETURN inv.workspace_id;
END $$;

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "subs_upsert_owner" ON public.subscriptions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wiki_pages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
