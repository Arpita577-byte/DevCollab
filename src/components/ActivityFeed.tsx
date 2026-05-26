import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";

type Item = { id: string; action: string; metadata: Record<string, unknown> | null; created_at: string; actor_id: string; project_id: string | null };

export function ActivityFeed({ workspaceId, projectFilter }: { workspaceId: string; projectFilter?: string | null }) {
  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("activities").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
    if (projectFilter) q = q.eq("project_id", projectFilter);
    const { data } = await q;
    setItems((data as Item[]) ?? []);
    const ids = [...new Set((data ?? []).map((d: Item) => d.actor_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      const m: Record<string, string> = {};
      (ps ?? []).forEach((p: { id: string; full_name: string | null }) => { m[p.id] = p.full_name ?? "Someone"; });
      setProfiles(m);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`activity:${workspaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities", filter: `workspace_id=eq.${workspaceId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [workspaceId, projectFilter]);

  return (
    <div className="space-y-2">
      <h2 className="font-semibold flex items-center gap-2 mb-3"><Activity className="h-4 w-4" />Activity</h2>
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>}
      {items.map(i => (
        <div key={i.id} className="glass rounded-lg p-3 text-sm">
          <span className="font-medium">{profiles[i.actor_id] ?? "Someone"}</span>{" "}
          <span className="text-muted-foreground">{i.action}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</p>
        </div>
      ))}
    </div>
  );
}

export async function logActivity(workspaceId: string, actorId: string, action: string, projectId?: string, metadata?: Record<string, unknown>) {
  await supabase.from("activities").insert({ workspace_id: workspaceId, actor_id: actorId, action, project_id: projectId ?? null, metadata: metadata ?? null });
}
