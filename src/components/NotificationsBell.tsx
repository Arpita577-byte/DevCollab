import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter(n => !n.read).length;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setItems((data as Notif[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={markAllRead}><Check className="h-3 w-3 mr-1" />Mark read</Button>}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 && <p className="text-xs text-muted-foreground p-6 text-center">No notifications yet.</p>}
          {items.map(n => (
            <div key={n.id} className={`p-3 border-b border-border/30 text-sm ${!n.read ? "bg-primary/5" : ""}`}>
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
