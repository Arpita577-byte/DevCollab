import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { aiProjectAction } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { NotificationsBell } from "@/components/NotificationsBell";
import { WikiPanel } from "@/components/WikiPanel";
import { MembersPanel } from "@/components/MembersPanel";
import { ActivityFeed, logActivity } from "@/components/ActivityFeed";
import { CalendarView } from "@/components/CalendarView";
import { PresenceBadge } from "@/components/PresenceBadge";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { toast } from "sonner";
import {
  Plus, Loader2, LogOut, KanbanSquare, Code2, Sparkles, Copy, Trash2, FolderKanban,
  BookOpen, Users, Activity as ActivityIcon, CalendarDays, User,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "DevCollab — Workspace" }] }),
  component: AppPage,
});

type Workspace = { id: string; name: string; slug: string };
type Project = { id: string; name: string; description: string | null; color: string | null };
type Task = {
  id: string; title: string; description: string | null;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "P0" | "P1" | "P2"; project_id: string; position: number;
};
type Snippet = { id: string; title: string; language: string; code: string; description: string | null; tags: string[] | null };

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

function AppPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("workspaces").select("*").order("created_at");
      setWorkspaces(data ?? []);
      setActiveWs((data ?? [])[0] ?? null);
      setLoadingData(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!activeWs) { setProjects([]); setActiveProject(null); return; }
    (async () => {
      const { data } = await supabase.from("projects").select("*").eq("workspace_id", activeWs.id).order("created_at");
      setProjects(data ?? []);
      setActiveProject((data ?? [])[0] ?? null);
    })();
  }, [activeWs]);

  if (loading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (workspaces.length === 0) {
    return <CreateWorkspaceScreen onCreated={(w) => { setWorkspaces([w]); setActiveWs(w); }} />;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-border/50 glass flex flex-col">
        <div className="p-4 border-b border-border/50"><Logo /></div>
        <div className="p-4 border-b border-border/50">
          <Label className="text-xs text-muted-foreground">Workspace</Label>
          <Select value={activeWs?.id} onValueChange={(v) => setActiveWs(workspaces.find(w => w.id === v) ?? null)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
          <CreateWorkspaceDialog onCreated={(w) => { setWorkspaces([...workspaces, w]); setActiveWs(w); }} />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground">Projects</Label>
            {activeWs && <CreateProjectDialog workspaceId={activeWs.id} onCreated={(p) => { setProjects([...projects, p]); setActiveProject(p); }} />}
          </div>
          <div className="space-y-1">
            {projects.map(p => (
              <button key={p.id} onClick={() => setActiveProject(p)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors ${activeProject?.id === p.id ? "bg-primary/15 text-foreground" : "hover:bg-muted text-muted-foreground"}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: p.color || "#6366f1" }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {projects.length === 0 && <p className="text-xs text-muted-foreground px-3">No projects yet.</p>}
          </div>
        </div>
        <div className="p-3 border-t border-border/50 flex items-center gap-1 text-sm">
          <span className="truncate text-muted-foreground flex-1 text-xs">{user?.email}</span>
          {activeWs && <UpgradeDialog workspaceId={activeWs.id} />}
          <NotificationsBell />
          <Button size="icon" variant="ghost" asChild><Link to="/profile"><User className="h-4 w-4" /></Link></Button>
          <Button size="icon" variant="ghost" onClick={() => { signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" /></Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {activeProject && activeWs ? <ProjectView project={activeProject} workspaceId={activeWs.id} /> : activeWs ? (
          <div className="p-6"><MembersPanel workspaceId={activeWs.id} /></div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center"><FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-40" /><p>Create a project to get started.</p></div>
          </div>
        )}
      </main>
    </div>
  );
}

function CreateWorkspaceScreen({ onCreated }: { onCreated: (w: Workspace) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full glass rounded-2xl p-8 shadow-elegant text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Welcome to DevCollab</h1>
        <p className="text-muted-foreground mb-6">Create your first workspace to start collaborating.</p>
        <CreateWorkspaceDialog onCreated={onCreated} trigger={
          <Button className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Create workspace</Button>
        } />
      </div>
    </div>
  );
}

function CreateWorkspaceDialog({ onCreated, trigger }: { onCreated: (w: Workspace) => void; trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("workspaces").insert({ name, slug, owner_id: user.id }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    onCreated(data as Workspace);
    setOpen(false); setName("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="ghost" size="sm" className="mt-2 w-full justify-start"><Plus className="mr-2 h-3.5 w-3.5" /> New workspace</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create workspace</DialogTitle></DialogHeader>
        <div className="space-y-3"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Devs" /></div>
        <DialogFooter><Button onClick={submit} disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectDialog({ workspaceId, onCreated }: { workspaceId: string; onCreated: (p: Project) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const submit = async () => {
    if (!name.trim()) return;
    const colors = ["#6366f1", "#06b6d4", "#a855f7", "#ec4899", "#10b981"];
    const { data, error } = await supabase.from("projects").insert({
      workspace_id: workspaceId, name, description: desc,
      color: colors[Math.floor(Math.random() * colors.length)], created_by: user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    onCreated(data as Project); setOpen(false); setName(""); setDesc("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectView({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const { user } = useAuth();
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="h-3 w-3 rounded-full" style={{ background: project.color || "#6366f1" }} />
        <h1 className="font-display text-2xl font-bold flex-1">{project.name}</h1>
        <PresenceBadge channelKey={`project:${project.id}`} displayName={user?.email?.split("@")[0] ?? "Someone"} />
      </div>
      <Tabs defaultValue="board">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="board"><KanbanSquare className="h-4 w-4 mr-2" />Board</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-2" />Calendar</TabsTrigger>
          <TabsTrigger value="wiki"><BookOpen className="h-4 w-4 mr-2" />Wiki</TabsTrigger>
          <TabsTrigger value="snippets"><Code2 className="h-4 w-4 mr-2" />Snippets</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-2" />AI</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="activity"><ActivityIcon className="h-4 w-4 mr-2" />Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4"><KanbanBoard project={project} workspaceId={workspaceId} /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><CalendarTab projectId={project.id} /></TabsContent>
        <TabsContent value="wiki" className="mt-4"><WikiPanel projectId={project.id} /></TabsContent>
        <TabsContent value="snippets" className="mt-4"><SnippetsPanel project={project} /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AiPanel project={project} /></TabsContent>
        <TabsContent value="members" className="mt-4"><MembersPanel workspaceId={workspaceId} /></TabsContent>
        <TabsContent value="activity" className="mt-4"><ActivityFeed workspaceId={workspaceId} projectFilter={project.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CalendarTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tasks").select("*").eq("project_id", projectId);
      setTasks((data as Task[]) ?? []);
    })();
  }, [projectId]);
  return <CalendarView tasks={tasks} />;
}

function KanbanBoard({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drag, setDrag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").eq("project_id", project.id).order("position");
    setTasks((data as Task[]) ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`tasks:${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${project.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [project.id]);

  const moveTask = async (id: string, status: Task["status"]) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {COLUMNS.map(col => (
        <div key={col.id}
          onDragOver={e => e.preventDefault()}
          onDrop={() => { if (drag) { moveTask(drag, col.id); setDrag(null); } }}
          className="glass rounded-xl p-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</h3>
            <span className="text-xs text-muted-foreground">{tasks.filter(t => t.status === col.id).length}</span>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status === col.id).map(t => (
              <div key={t.id} draggable onDragStart={() => setDrag(t.id)}
                className="rounded-lg bg-surface-elevated border border-border/50 p-3 cursor-grab hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium leading-snug">{t.title}</p>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${t.priority === "P0" ? "border-destructive/50 text-destructive" : t.priority === "P1" ? "border-warning/50 text-warning" : ""}`}>{t.priority}</Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
              </div>
            ))}
            {col.id === "todo" && <NewTaskInline projectId={project.id} onCreated={load} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewTaskInline({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const submit = async () => {
    if (!title.trim()) return;
    await supabase.from("tasks").insert({ project_id: projectId, title, created_by: user?.id });
    setTitle(""); onCreated();
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="+ Add task" className="bg-transparent border-dashed text-sm" />
    </form>
  );
}

function SnippetsPanel({ project }: { project: Project }) {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", language: "javascript", code: "", description: "" });

  const load = async () => {
    const { data } = await supabase.from("snippets").select("*").eq("project_id", project.id).order("created_at", { ascending: false });
    setSnippets((data as Snippet[]) ?? []);
  };
  useEffect(() => { load(); }, [project.id]);

  const create = async () => {
    if (!form.title || !form.code) return;
    await supabase.from("snippets").insert({ ...form, project_id: project.id, created_by: user?.id });
    setOpen(false); setForm({ title: "", language: "javascript", code: "", description: "" }); load();
  };
  const del = async (id: string) => { await supabase.from("snippets").delete().eq("id", id); load(); };
  const copy = (code: string) => { navigator.clipboard.writeText(code); toast.success("Copied"); };

  const filtered = snippets.filter(s => !q || s.title.toLowerCase().includes(q.toLowerCase()) || s.tags?.some(t => t.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search snippets..." className="max-w-sm" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />New snippet</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New snippet</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["javascript","typescript","python","java","cpp","go","rust","sql"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Code</Label><Textarea value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="font-mono text-xs min-h-[200px]" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <Badge variant="outline" className="text-[10px] mt-1">{s.language}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => copy(s.code)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {s.description && <p className="text-xs text-muted-foreground mb-2">{s.description}</p>}
            <pre className="text-xs bg-background/60 rounded-md p-3 overflow-x-auto max-h-48"><code>{s.code}</code></pre>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-12">No snippets yet.</p>}
      </div>
    </div>
  );
}

function AiPanel({ project }: { project: Project }) {
  const run = useServerFn(aiProjectAction);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [feature, setFeature] = useState("");
  const [code, setCode] = useState("");

  const exec = async (action: "summarize" | "blockers" | "standup" | "breakdown" | "review", input?: string) => {
    setBusy(true); setOutput("");
    try {
      const r = await run({ data: { projectId: project.id, action, input } });
      setOutput(r.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />Project insights</h3>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" onClick={() => exec("summarize")} disabled={busy}>Summarize project</Button>
            <Button variant="outline" onClick={() => exec("blockers")} disabled={busy}>What's blocking us?</Button>
            <Button variant="outline" onClick={() => exec("standup")} disabled={busy}>Generate standup</Button>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3">Feature → tasks</h3>
          <Textarea value={feature} onChange={e => setFeature(e.target.value)} placeholder="Describe a feature..." className="mb-2" />
          <Button onClick={() => exec("breakdown", feature)} disabled={busy || !feature} className="w-full bg-gradient-primary text-primary-foreground">Break down</Button>
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3">Code reviewer</h3>
          <Textarea value={code} onChange={e => setCode(e.target.value)} placeholder="Paste code..." className="mb-2 font-mono text-xs min-h-[120px]" />
          <Button onClick={() => exec("review", code)} disabled={busy || !code} className="w-full bg-gradient-primary text-primary-foreground">Review code</Button>
        </div>
      </div>
      <div className="glass rounded-xl p-4 min-h-[300px]">
        <h3 className="font-semibold mb-3">Output</h3>
        {busy ? <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</div>
          : output ? <pre className="whitespace-pre-wrap text-sm">{output}</pre>
          : <p className="text-sm text-muted-foreground">Run an action to see AI output here.</p>}
      </div>
    </div>
  );
}
