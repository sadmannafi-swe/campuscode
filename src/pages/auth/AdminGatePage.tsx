import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, ShieldCheck, ShieldX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/misc";
import { supabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { GoogleButton } from "./GoogleButton";

const CLAIM_ERRORS: Record<string, string> = {
  admin_requires_verified_google: "Administrator setup needs a Google account with a verified Gmail address. Sign out and continue with Google.",
  admin_already_claimed: "The administrator has already been set up. This account cannot become an administrator.",
  account_suspended: "This account is suspended.",
};

/**
 * /ccadmingo — administrator entry point.
 *  • Before setup: the first verified Google account that completes this flow claims the single admin slot
 *    (claim_initial_admin(), atomic in the database).
 *  • After setup: sign-in only. Access is granted solely by is_admin() on the server; any other account is denied.
 * Nothing here compares e-mails or trusts the browser: the UI just reflects what the database says.
 */
export default function AdminGatePage() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const state = useQuery({
    queryKey: ["admin-setup-state"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_setup_state");
      if (error) throw error;
      return data as { claimed: boolean };
    },
  });

  if (loading || state.isLoading) return <PageLoader />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  const claimed = state.data?.claimed ?? true;   // fail closed: if unknown, never offer setup

  const claim = async () => {
    setClaiming(true);
    try {
      const { error } = await supabase.rpc("claim_initial_admin");
      if (error) {
        const key = Object.keys(CLAIM_ERRORS).find((k) => error.message.startsWith(k));
        toast.error(key ? CLAIM_ERRORS[key] : "Administrator setup failed. Please try again.");
        await qc.invalidateQueries({ queryKey: ["admin-setup-state"] });
        return;
      }
      await qc.invalidateQueries({ queryKey: ["is-admin", user!.id] });
      await qc.invalidateQueries({ queryKey: ["admin-setup-state"] });
      toast.success("You are now the CampusCode administrator.");
      nav("/admin", { replace: true });
    } finally {
      setClaiming(false);
    }
  };
  const leave = async () => { await signOut(); nav("/ccadmingo", { replace: true }); };

  if (!user) {
    return (
      <AuthLayout title={claimed ? "Administrator sign in" : "Administrator setup"}
        subtitle={claimed
          ? "Sign in with the administrator's Google account."
          : "No administrator exists yet. The first verified Google account to complete this setup becomes the only CampusCode administrator."}>
        <div className="space-y-4" data-testid="admin-gate" data-state={claimed ? "login" : "setup"}>
          <GoogleButton next="/ccadmingo" />
          <p className="text-xs text-slate">Student accounts cannot sign in here. Administrator access is checked on the server.</p>
        </div>
      </AuthLayout>
    );
  }

  if (!claimed) {
    return (
      <AuthLayout title="Administrator setup" subtitle="Claim the one-time administrator slot for this account.">
        <div className="space-y-4" data-testid="admin-gate" data-state="claim">
          <p className="rounded border border-line bg-paper px-4 py-3 text-sm">Signed in as <span className="font-semibold">{user.email}</span>.
            This account will become the only administrator. After this, administrator setup closes permanently.</p>
          <Button size="lg" variant="ink" className="w-full" loading={claiming} onClick={claim}><ShieldCheck /> Claim administrator access</Button>
          <Button variant="ghost" className="w-full" onClick={leave}><LogOut /> Use a different account</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Access denied" subtitle="This account is not the CampusCode administrator.">
      <div className="space-y-4" data-testid="admin-gate" data-state="denied">
        <p className="flex items-start gap-2 rounded border border-error/30 bg-error/5 px-4 py-3 text-sm">
          <ShieldX className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />
          {user.email} does not have administrator access. Your student account is unaffected.
        </p>
        <Button variant="outline" className="w-full" onClick={leave}><LogOut /> Sign out</Button>
        <Button asChild variant="ghost" className="w-full"><a href="/">Back to CampusCode</a></Button>
      </div>
    </AuthLayout>
  );
}
