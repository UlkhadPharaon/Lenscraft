import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type PocketBase from 'pocketbase';
import { getPocketBaseClient, isPocketBaseConfigured, pocketbaseConfigError } from '../../lib/pocketbase';
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

interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: AuthProfile | null;
  session: AuthSession | null;
  /** True until the initial session has been resolved. */
  initializing: boolean;
  /** 'pocketbase' when real auth is configured, 'local' for the offline demo account. */
  mode: 'pocketbase' | 'local';
  configError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  /** Only meaningful in local mode: creates a device-local account without PocketBase. */
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

/** Normalises a PocketBase auth record into the app's AuthUser shape. */
function toAuthUser(record: { id: string; email?: string | null; name?: string | null; avatar?: string | null }): AuthUser {
  return {
    id: record.id,
    email: record.email || 'utilisateur@lenscraft.app',
    fullName: typeof record.name === 'string' && record.name ? record.name : null,
    avatarUrl: typeof record.avatar === 'string' && record.avatar ? record.avatar : null,
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

function toProfile(authUser: AuthUser, row: any): AuthProfile {
  return {
    id: authUser.id,
    email: authUser.email || (typeof row?.email === 'string' ? row.email : 'utilisateur@lenscraft.app'),
    fullName: row?.full_name ?? authUser.fullName,
    avatarUrl: row?.avatar_url ?? authUser.avatarUrl,
    subscriptionTier: (row?.subscription_tier as SubscriptionTier) || 'free',
    generationsCount: Number(row?.generations_count || 0),
    lastGenerationDate: row?.last_generation_date ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PocketBase | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const mode: 'pocketbase' | 'local' = isPocketBaseConfigured ? 'pocketbase' : 'local';

  const loadProfile = useCallback(async (pb: PocketBase, authUser: AuthUser) => {
    let row: Record<string, unknown> | null = null;
    try {
      row = (await pb.collection('profiles').getOne(authUser.id)) as unknown as Record<string, unknown>;
    } catch (error) {
      // 404 = no profile row yet. PocketBase has no auth trigger: the server
      // provisions the profile on the first generation; until then the UI
      // falls back to the free tier.
      const status = (error as { status?: number })?.status;
      if (status !== 404) console.error('Chargement du profil impossible :', error);
    }
    setProfile(toProfile(authUser, row));
  }, []);

  // Initial session resolution.
  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      const pb = await getPocketBaseClient();
      if (!active) return;

      if (!pb) {
        const local = readLocalUser();
        if (local) {
          setUser(local);
          setProfile(localProfile(local));
        }
        setInitializing(false);
        return;
      }

      setClient(pb);

      // PocketBase persists the session in localStorage: a valid stored token
      // restores the session without a round-trip, and is rotated once
      // (equivalent of PocketBase's autoRefreshToken).
      const stored = pb.authStore.record;
      if (pb.authStore.isValid && stored) {
        const authUser = toAuthUser(stored);
        setUser(authUser);
        setSession({ user: authUser, accessToken: pb.authStore.token });
        void loadProfile(pb, authUser);
        pb.collection('users')
          .authRefresh()
          .catch(error => {
            console.error('Rafraîchissement de la session impossible :', error);
            pb.authStore.clear();
          });
      } else {
        pb.authStore.clear();
      }
      setInitializing(false);

      const unsubscribe = pb.authStore.onChange((token, record) => {
        if (!active) return;
        const nextUser = record ? toAuthUser(record) : null;
        setUser(nextUser);
        setSession(nextUser ? { user: nextUser, accessToken: token } : null);
        if (nextUser) {
          void loadProfile(pb, nextUser);
        } else {
          setProfile(null);
        }
        setInitializing(false);
      });
      subscription = { unsubscribe };
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const requirePocketBase = useCallback((): PocketBase => {
    if (!client) {
      throw new Error('PocketBase n\'est pas configuré. Ajoutez VITE_POCKETBASE_URL pour activer les comptes.');
    }
    return client;
  }, [client]);

  const signInWithGoogle = useCallback(async () => {
    // Requires an OAuth provider configured in the PocketBase dashboard
    // (Auth providers). Without it the server answers with an error page.
    try {
      await requirePocketBase().collection('users').authWithOAuth2({ provider: 'google' });
    } catch {
      throw new Error('Connexion Google indisponible sur ce serveur (OAuth non configuré dans PocketBase). Utilisez un email.');
    }
  }, [requirePocketBase]);

  const signInWithGithub = useCallback(async () => {
    try {
      await requirePocketBase().collection('users').authWithOAuth2({ provider: 'github' });
    } catch {
      throw new Error('Connexion GitHub indisponible sur ce serveur (OAuth non configuré dans PocketBase). Utilisez un email.');
    }
  }, [requirePocketBase]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await requirePocketBase().collection('users').authWithPassword(email, password);
  }, [requirePocketBase]);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
    const pb = requirePocketBase();
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name: fullName ?? '',
      emailVisibility: true,
    });
    // PocketBase does not sign the user in on create — authenticate right away.
    await pb.collection('users').authWithPassword(email, password);
  }, [requirePocketBase]);

  /** Local mode: creates/restores a device-local account so the app stays usable. */
  const signInAsLocalGuest = useCallback(async () => {
    const local = readLocalUser() || createLocalUser();
    setUser(local);
    setProfile(localProfile(local));
  }, []);

  const signOut = useCallback(async () => {
    client?.authStore.clear();
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
    const pb = await getPocketBaseClient();

    if (pb) {
      const token = pb.authStore.token;
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

      if (session?.user) await loadProfile(pb, session.user);
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
    const pb = await getPocketBaseClient();
    if (!pb) return 'local-mode';
    return pb.authStore.token;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    session,
    initializing,
    mode,
    configError: pocketbaseConfigError,
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
