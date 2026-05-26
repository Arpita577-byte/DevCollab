import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Send, Calendar, User } from "lucide-react";

type Task = { id: string; title: string; description: string | null; priority: string; status: string; assignee_id: string | null; due_date: string | null; project_id: string };
type Comment = { id: string; body: string; created_at: string; author_id: string };
type Member = { user_id: string; profile: { full_name: string | null; email: string | null; avatar_url: string | null } };

export function TaskDetailDialog({ task, workspaceId, open, onOpenChange, onChange }: {
  task: Task | null; workspaceId: string; open: boolean; onOpenChange: (o: boolean) => void; onChange: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [body, setBody] = useState("");
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (!task || !open) return;
    (async () => {
      const { data: cs } = await supabase.from("task_comments").select("*").eq("task_id", task.id).order("created_at");
      setComments((cs as Comment[]) ?? []);
      const { data: ms } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId);
      const ids = (ms ?? []).map((m: { user_id: string }) => m.user_id);
      const { data: ps } = await supabase.from("profiles").select("id,full_name,email,avatar_url").in("id", ids);
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      const memberList: Member[] = [];
      (ps ?? []).forEach((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }) => {
        map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        memberList.push({ user_id: p.id, profile: p });
      });
      setProfiles(map); setMembers(memberList);
    })();
    const ch = supabase.channel(`comments:${task.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${task.id}` }, (p) => {
        setComments(prev => [...prev, p.new as Comment]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [task, open, workspaceId]);

  if (!task) return null;

  const send = async () => {
    if (!body.trim() || !user) return;
    const mentions = members.filter(m => body.includes(`@${m.profile.full_name?.split(" ")[0] ?? m.profile.email?.split("@")[0]}`)).map(m => m.user_id);
    await supabase.from("task_comments").insert({ task_id: task.id, author_id: user.id, body, mentions });
    for (const mid of mentions) {
      if (mid === user.id) continue;
      await supabase.from("notifications").insert({
        user_id: mid, actor_id: user.id, type: "mention", title: `Mentioned in "${task.title}"`, body, link: `/app`, workspace_id: workspaceId,
      });
    }
    setBody("");
  };

  const updateField = async (patch: Record<string, unknown>) => {
    await supabase.from("tasks").update({ ...patch, updated_at: new Date().toISOString() } as never).eq("id", task.id);
    if (patch.assignee_id && patch.assignee_id !== user?.id) {
      await supabase.from("notifications").insert({
        user_id: patch.assignee_id, actor_id: user?.id, type: "assignment", title: `Assigned to "${task.title}"`, link: "/app", workspace_id: workspaceId,
      });
    }
    onChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={task.priority} onValueChange={v => updateField({ priority: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{["P0","P1","P2"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={task.assignee_id ?? ""} onValueChange={v => updateField({ assignee_id: v || null })}>
              <SelectTrigger className="w-44"><User className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                {members.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.profile.full_name ?? m.profile.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <input type="date" value={task.due_date ?? ""} onChange={e => updateField({ due_date: e.target.value || null })}
                className="bg-transparent border border-border/50 rounded-md px-2 py-1 text-sm" />
            </div>
          </div>
          <Textarea defaultValue={task.description ?? ""} onBlur={e => updateField({ description: e.target.value })}
            placeholder="Description..." className="min-h-[80px]" />
          <div>
            <h4 className="text-sm font-semibold mb-2">Comments</h4>
            <div className="space-y-2 max-h-64 overflow-auto mb-3">
              {comments.map(c => {
                const p = profiles[c.author_id];
                return (
                  <div key={c.id} className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs shrink-0">
                      {(p?.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 items-baseline">
                        <span className="text-xs font-medium">{p?.full_name ?? "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>}
            </div>
            <div className="relative">
              <Textarea value={body} onChange={e => { setBody(e.target.value); setShowMentions(e.target.value.endsWith("@")); }}
                placeholder="Add a comment... Use @name to mention" className="pr-12" />
              <Button size="icon" onClick={send} className="absolute bottom-2 right-2 h-8 w-8 bg-gradient-primary text-primary-foreground"><Send className="h-3.5 w-3.5" /></Button>
              {showMentions && (
                <div className="absolute bottom-full mb-1 left-0 bg-popover border border-border rounded-md shadow-lg p-1 z-50">
                  {members.slice(0, 5).map(m => {
                    const name = m.profile.full_name?.split(" ")[0] ?? m.profile.email?.split("@")[0] ?? "user";
                    return (
                      <button key={m.user_id} onClick={() => { setBody(body + name + " "); setShowMentions(false); }}
                        className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded">@{name}</button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
