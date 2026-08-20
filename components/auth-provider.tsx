"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const refreshSession = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
  }, [supabase.auth]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Client-side route protection
  useEffect(() => {
    if (loading) return;

    const authRoutes = ["/signin", "/signup", "/otpverification", "/forgotpassword", "/newpassword"];
    const isAuthRoute = authRoutes.some((r) => pathname === r || pathname.startsWith(r + "?"));

    // If authenticated user is on an auth page, redirect to their UUID homepage
    if (user && isAuthRoute) {
      router.replace(`/${user.id}`);
    }
  }, [user, loading, pathname, router]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      router.replace("/");
    } catch {
      // Silently handle — session cleared regardless
      setUser(null);
      setSession(null);
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, router]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  // Return safe defaults when used outside AuthProvider (e.g., not-found page, share pages)
  if (context === undefined) {
    return {
      user: null,
      session: null,
      loading: false,
      signOut: async () => {},
      refreshSession: async () => {},
    };
  }
  return context;
}
