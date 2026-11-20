import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Profile } from "@/types/db";
import { useI18n } from "@/i18n";

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const qc = useQueryClient();
  const { lang, setLang } = useI18n();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      if (error) throw error;
      return data as Profile;
    },
  });

  // Roles are evaluated by the database (is_admin()), never by anything the client asserts.
  const adminQuery = useQuery({
    queryKey: ["is-admin", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return Boolean(data);
    },
  });

  // Keep the interface language in sync with the stored preference.
  const preferred = profileQuery.data?.preferred_language;
  useEffect(() => {
    if (preferred && preferred !== lang) setLang(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferred]);

  const refreshProfile = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
  }, [qc, userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthValue>(() => ({
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    isAdmin: adminQuery.data ?? false,
    loading: !ready || (Boolean(userId) && (profileQuery.isLoading || adminQuery.isLoading)),
    refreshProfile,
    signOut,
  }), [session, profileQuery.data, profileQuery.isLoading, adminQuery.data, adminQuery.isLoading, ready, userId, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
