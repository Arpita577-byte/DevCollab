import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export function UpgradeDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("free");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("subscriptions").select("tier").eq("workspace_id", workspaceId).maybeSingle();
      setTier((data?.tier as string) ?? "free");
    })();
  }, [workspaceId, open]);

  const checkout = async () => {
    setBusy(true);
    // Sandbox checkout: simulate processing then upgrade
    await new Promise(r => setTimeout(r, 1200));
    const { error } = await supabase.from("subscriptions").upsert({
      workspace_id: workspaceId, tier: "pro", status: "active",
      stripe_customer_id: "cus_sandbox_" + Math.random().toString(36).slice(2, 10),
      stripe_subscription_id: "sub_sandbox_" + Math.random().toString(36).slice(2, 10),
      current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    }, { onConflict: "workspace_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to Pro! 🚀");
    setTier("pro"); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={tier === "pro" ? "outline" : "default"} className={tier === "pro" ? "" : "bg-gradient-primary text-primary-foreground"}>
          <Sparkles className="h-3.5 w-3.5 mr-1" />{tier === "pro" ? "Pro" : "Upgrade"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{tier === "pro" ? "You're on Pro" : "Upgrade to Pro"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="text-3xl font-bold">$12<span className="text-base font-normal text-muted-foreground">/mo</span></div>
          <ul className="space-y-2 text-sm">
            {["Unlimited workspaces","Unlimited projects","Unlimited members","All AI features","Priority support"].map(f => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />{f}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Sandbox checkout — no real charges.</p>
        </div>
        <DialogFooter>
          {tier === "pro"
            ? <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            : <Button onClick={checkout} disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy ? "Processing..." : "Pay $12"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
