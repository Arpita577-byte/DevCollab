import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, History, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Page = { id: string; title: string; content: string; updated_at: string };
type Version = { id: string; title: string; content: string; created_at: string; edited_by: string | null };

export function WikiPanel({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [active, setActive] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("wiki_pages").select("*").eq("project_id", projectId).order("created_at");
    setPages((data as Page[]) ?? []);
    if (!active && data?.[0]) selectPage(data[0] as Page);
  };
  useEffect(() => { load(); }, [projectId]);

  const selectPage = (p: Page) => {
    setActive(p); setTitle(p.title); setContent(p.content);
  };

  const create = async () => {
    const { data } = await supabase.from("wiki_pages").insert({
      project_id: projectId, title: "Untitled", content: "# New page\n\nStart writing...", created_by: user?.id, updated_by: user?.id,
    }).select().single();
    if (data) { load(); selectPage(data as Page); }
  };

  const save = async () => {
    if (!active) return;
    const { error } = await supabase.from("wiki_pages").update({ title, content, updated_by: user?.id }).eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); load();
  };

  const del = async () => {
    if (!active) return;
    await supabase.from("wiki_pages").delete().eq("id", active.id);
    setActive(null); load();
  };

  const loadVersions = async () => {
    if (!active) return;
    const { data } = await supabase.from("wiki_page_versions").select("*").eq("page_id", active.id).order("created_at", { ascending: false });
    setVersions((data as Version[]) ?? []); setShowHistory(true);
  };

  const restore = (v: Version) => { setTitle(v.title); setContent(v.content); setShowHistory(false); toast.info("Restored — click Save to apply"); };

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4 min-h-[500px]">
      <div className="glass rounded-xl p-3">
        <Button onClick={create} size="sm" className="w-full mb-2 bg-gradient-primary text-primary-foreground"><Plus className="h-3.5 w-3.5 mr-1" />New page</Button>
        <div className="space-y-1">
          {pages.map(p => (
            <button key={p.id} onClick={() => selectPage(p)}
              className={`w-full text-left rounded-md px-2 py-1.5 text-sm flex items-center gap-2 ${active?.id === p.id ? "bg-primary/15" : "hover:bg-muted"}`}>
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{p.title}</span>
            </button>
          ))}
          {pages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No pages yet.</p>}
        </div>
      </div>
      <div className="glass rounded-xl p-4">
        {active ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-semibold border-0 px-0 focus-visible:ring-0" />
              <Button size="sm" variant="ghost" onClick={loadVersions}><History className="h-4 w-4 mr-1" />History</Button>
              <Button size="sm" variant="ghost" onClick={del}><Trash2 className="h-4 w-4" /></Button>
              <Button size="sm" onClick={save} className="bg-gradient-primary text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
            <Textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="# Heading&#10;&#10;Write markdown here. Use **bold**, *italic*, `code`, lists, etc."
              className="font-mono text-sm min-h-[480px] resize-none" />
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Version history</DialogTitle></DialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-auto">
                  {versions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No prior versions.</p>}
                  {versions.map(v => (
                    <div key={v.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{v.title}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                      </div>
                      <pre className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap mb-2">{v.content}</pre>
                      <Button size="sm" variant="outline" onClick={() => restore(v)}>Restore</Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : <p className="text-sm text-muted-foreground text-center py-12">Select or create a page.</p>}
      </div>
    </div>
  );
}
