import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invite — DevCollab" }] }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = useParams({ from: "/invite/$token" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: `/invite/${token}` } as never });
  }, [user, loading, navigate, token]);

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("accept_workspace_invite", { _token: token });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Joined workspace!");
    navigate({ to: "/app" });
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full glass rounded-2xl p-8 text-center shadow-elegant">
        <h1 className="font-display text-2xl font-bold mb-2">You're invited!</h1>
        <p className="text-muted-foreground mb-6">Join this workspace to start collaborating.</p>
        <Button onClick={accept} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Accept invite
        </Button>
      </div>
    </div>
  );
}
