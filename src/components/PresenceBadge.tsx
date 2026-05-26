import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function PresenceBadge({ channelKey, displayName }: { channelKey: string; displayName: string }) {
  const { user } = useAuth();
  const [others, setOthers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`presence:${channelKey}`, { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, { name: string }[]>;
      const names: string[] = [];
      Object.entries(state).forEach(([uid, metas]) => { if (uid !== user.id && metas[0]?.name) names.push(metas[0].name); });
      setOthers(names);
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ name: displayName });
    });
    return () => { supabase.removeChannel(ch); };
  }, [channelKey, user, displayName]);

  if (others.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <span>{others.slice(0, 3).join(", ")}{others.length > 3 ? ` +${others.length - 3}` : ""} viewing</span>
    </div>
  );
}
