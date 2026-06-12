import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasAccess: boolean;
  accessLoading: boolean;
  isAdmin: boolean;
  refreshAccess: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshAccess = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setHasAccess(false);
      setAccessLoading(false);
      setIsAdmin(false);
      return;
    }
    setAccessLoading(true);
    const [{ data }, { data: roles }] = await Promise.all([
      supabase.from("entitlements").select("has_access").eq("user_id", u.user.id).maybeSingle(),
      (supabase as any).from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    setHasAccess(!!data?.has_access);
    setIsAdmin((roles ?? []).some((r: any) => r.role === "admin"));
    setAccessLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => { refreshAccess(); }, 0);
      } else {
        setHasAccess(false);
        setAccessLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) refreshAccess();
      else setAccessLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshAccess]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setHasAccess(false);
    setIsAdmin(false);
    queryClient.clear();
  };

  return (
    <Ctx.Provider value={{ user, session, loading, hasAccess, accessLoading, isAdmin, refreshAccess, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}