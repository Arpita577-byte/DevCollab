import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — DevCollab" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", bio: "", github_url: "", avatar_url: "", skills: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setForm({
        full_name: data.full_name ?? "", bio: data.bio ?? "", github_url: data.github_url ?? "",
        avatar_url: data.avatar_url ?? "", skills: (data.skills ?? []).join(", "),
      });
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, bio: form.bio, github_url: form.github_url, avatar_url: form.avatar_url,
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
    }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen px-6 py-8 max-w-2xl mx-auto">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="font-display text-2xl font-bold mb-6">Your profile</h1>
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl overflow-hidden">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
              : (form.full_name || user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div><Label>Full name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Avatar URL</Label><Input value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." /></div>
        <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
        <div><Label>GitHub URL</Label><Input value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/you" /></div>
        <div><Label>Skills (comma separated)</Label><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript, Postgres" /></div>
        <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
      </div>
    </div>
  );
}
