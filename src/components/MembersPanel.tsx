import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Link2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Member = { id: string; user_id: string; role: string; profile: { full_name: string | null; email: string | null; avatar_url: string | null } | null };
type Invite = { id: string; email: string; role: string; token: string; expires_at: string };

export function MembersPanel({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const load = async () => {
    const { data: ms } = await supabase.from("workspace_members").select("id,user_id,role").eq("workspace_id", workspaceId);
    const ids = (ms ?? []).map((m: { user_id: string }) => m.user_id);
    const { data: ps } = ids.length ? await supabase.from("profiles").select("id,full_name,email,avatar_url").in("id", ids) : { data: [] };
    const pmap: Record<string, { full_name: string | null; email: string | null; avatar_url: string | null }> = {};
    (ps ?? []).forEach((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }) => { pmap[p.id] = p; });
    setMembers((ms ?? []).map((m: { id: string; user_id: string; role: string }) => ({ ...m, profile: pmap[m.user_id] ?? null })));
    const { data: invs } = await supabase.from("workspace_invites").select("*").eq("workspace_id", workspaceId).is("accepted_at", null);
    setInvites((invs as Invite[]) ?? []);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const invite = async () => {
    if (!email) return;
    const { data, error } = await supabase.from("workspace_invites").insert({
      workspace_id: workspaceId, email, role: role as "member" | "admin" | "viewer", invited_by: user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    const link = `${window.location.origin}/invite/${(data as Invite).token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
    setEmail(""); setOpen(false); load();
  };

  const copyInvite = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    toast.success("Copied");
  };

  const revoke = async (id: string) => { await supabase.from("workspace_invites").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Members ({members.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-gradient-primary text-primary-foreground"><Link2 className="h-3.5 w-3.5 mr-1" />Invite</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">A shareable invite link will be copied to your clipboard.</p>
            </div>
            <DialogFooter><Button onClick={invite} className="bg-gradient-primary text-primary-foreground">Create link</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-2">
        {members.map(m => (
          <div key={m.id} className="glass rounded-lg p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
              {(m.profile?.full_name ?? m.profile?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{m.profile?.full_name ?? m.profile?.email ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
          </div>
        ))}
      </div>
      {invites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Pending invites</h3>
          <div className="grid gap-2">
            {invites.map(i => (
              <div key={i.id} className="glass rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm flex-1">{i.email}</span>
                <Badge variant="outline" className="text-[10px]">{i.role}</Badge>
                <Button size="icon" variant="ghost" onClick={() => copyInvite(i.token)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => revoke(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
