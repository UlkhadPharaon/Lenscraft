import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, supabaseConfigError } from '../../lib/supabase';
export type SubscriptionTier = 'free' | 'pro' | 'studio';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
  generationsCount: number;
  lastGenerationDate: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: AuthProfile | null;
  session: Session | null;
  /** True until the initial session has been resolved. */
  initializing: boolean;
  /** 'supabase' when real auth is configured, 'local' for the offline demo account. */
  mode: 'supabase' | 'local';
  configError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  /** Only meaningful in local mode: creates a device-local account without Supabase. */
  signInAsLocalGuest: () => Promise<void>;
  /** Changes the plan (Stripe checkout when billing is live, else local demo). */
  setSubscriptionTier: (tier: SubscriptionTier) => Promise<{ checkout: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_USER_KEY = 'lenscraft_local_user';
const LOCAL_PLAN_KEY = 'lenscraft_plan';

function readLocalPlan(): SubscriptionTier | null {
  try {
    const raw = localStorage.getItem(LOCAL_PLAN_KEY);
    return raw === 'free' || raw === 'pro' || raw === 'studio' ? (raw as SubscriptionTier) : null;
  } catch {
    return null;
  }
}

function readLocalUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function createLocalUser(): AuthUser {
  const id = `local-${crypto.randomUUID()}`;
  const user: AuthUser = {
    id,
    email: 'invite@lenscraft.local',
    fullName: 'Créateur local',
    avatarUrl: null,
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  return user;
}

function toAuthUser(supabaseUser: SupabaseUser): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || 'utilisateur@lenscraft.app',
    fullName: (supabaseUser.user_metadata?.full_name as string) || (supabaseUser.user_metadata?.name as string) || null,
    avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) || (supabaseUser.user_metadata?.picture as string) || null,
  };
}

function localProfile(local: AuthUser): AuthProfile {
  const plan = readLocalPlan() || 'free';
  return {
    id: local.id,
    email: local.email,
    fullName: local.fullName,
    avatarUrl: local.avatarUrl,
    subscriptionTier: plan,
    generationsCount: 0,
    lastGenerationDate: null,
  };
}

function toProfile(supabaseUser: SupabaseUser, row: any): AuthProfile {
  const authUser = toAuthUser(supabaseUser);
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || row?.email || 'utilisateur@lenscraft.app',
    fullName: row?.full_name ?? authUser.fullName,
    avatarUrl: row?.avatar_url ?? authUser.avatarUrl,
    subscriptionTier: (row?.subscription_tier as SubscriptionTier) || 'free',
    generationsCount: Number(row?.generations_count || 0),
    lastGenerationDate: row?.last_generation_date ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const mode: 'supabase' | 'local' = isSupabaseConfigured ? 'supabase' : 'local';

  const loadProfile = useCallback(async (sb: SupabaseClient, supabaseUser: SupabaseUser) => {
    const { data } = await sb
      .from('profiles')
      .select('email, full_name, avatar_url, subscription_tier, generations_count, last_generation_date')
      .eq('id', supabaseUser.id)
      .maybeSingle();
    setProfile(toProfile(supabaseUser, data));
  }, []);

  // Initial session resolution.
  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      const sb = await getSupabaseClient();
      if (!active) return;

      if (!sb) {
        const local = readLocalUser();
        if (local) {
          setUser(local);
          setProfile(localProfile(local));
        }
        setInitializing(false);
        return;
      }

      setClient(sb);

      const { data } = await sb.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ? toAuthUser(data.session.user) : null);
      if (data.session?.user) void loadProfile(sb, data.session.user);
      setInitializing(false);

      const listener = sb.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setUser(nextSession?.user ? toAuthUser(nextSession.user) : null);
        if (nextSession?.user) {
          void loadProfile(sb, nextSession.user);
        } else {
          setProfile(null);
        }
        setInitializing(false);
      });
      subscription = listener.data.subscription;
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const requireSupabase = useCallback((): SupabaseClient => {
    if (!client) {
      throw new Error('Supabase n\'est pas configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer les comptes.');
    }
    return client;
  }, [client]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) throw new Error(error.message);
  }, [requireSupabase]);

  const signInWithGithub = useCallback(async () => {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) throw new Error(error.message);
  }, [requireSupabase]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, [requireSupabase]);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
    const { error } = await requireSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) throw new Error(error.message);
  }, [requireSupabase]);

  /** Local mode: creates/restores a device-local account so the app stays usable. */
  const signInAsLocalGuest = useCallback(async () => {
    const local = readLocalUser() || createLocalUser();
    setUser(local);
    setProfile(localProfile(local));
  }, []);

  const signOut = useCallback(async () => {
    if (client) await client.auth.signOut();
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem(LOCAL_PLAN_KEY);
    setUser(null);
    setProfile(null);
    setSession(null);
  }, [client]);

  /**
   * Changes the current plan.
   * - Stripe checkout for the paid tiers when billing is live (server answers 409
   *   with `checkout: true`, the caller then redirects to Stripe).
   * - Otherwise an immediate local/demo upgrade so the feature is testable
   *   without any credentials.
   */
  const setSubscriptionTier = useCallback(async (tier: SubscriptionTier): Promise<{ checkout: boolean }> => {
    const supabase = await getSupabaseClient();

    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tier }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 409 && payload?.checkout) {
        return { checkout: true };
      }
      if (!response.ok) throw new Error(payload?.error || 'Changement de plan refusé.');

      if (session?.user) await loadProfile(supabase, session.user);
      return { checkout: false };
    }

    // Local mode: persist the choice on the device.
    if (tier === 'free') localStorage.removeItem(LOCAL_PLAN_KEY);
    else localStorage.setItem(LOCAL_PLAN_KEY, tier);

    setProfile(prev => (prev ? { ...prev, subscriptionTier: tier } : prev));
    return { checkout: false };
  }, [client, session, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!client || !session?.user) return;
    await loadProfile(client, session.user);
  }, [client, session, loadProfile]);

  const getAccessToken = useCallback(async () => {
    const sb = await getSupabaseClient();
    if (!sb) return 'local-mode';
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    session,
    initializing,
    mode,
    configError: supabaseConfigError,
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
    signInAsLocalGuest,
    setSubscriptionTier,
    signOut,
    refreshProfile,
    getAccessToken,
  }), [
    user, profile, session, initializing, mode,
    signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail, signInAsLocalGuest,
    setSubscriptionTier, signOut, refreshProfile, getAccessToken,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
