import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { VideoTreatment } from './types';
import { getSupabaseClient } from './lib/supabase';
import { useAuth } from './components/auth/AuthProvider';
import { setTokenProvider, setCredentialsProvider } from './utils/api';

export type AIModel = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'qwen/qwen3.8-omni-flash' | 'qwen/qwen3.7-plus' | 'qwen/qwen3.7-max' | (string & {});

/** BYOK (bring your own key) selection, persisted in the browser only. */
export interface AiCredentials {
  provider: string;
  apiKey: string;
  model: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AppContextType {
  treatment: VideoTreatment | null;
  setTreatment: (treatment: VideoTreatment | null) => void;
  projects: VideoTreatment[];
  saveProject: (project: VideoTreatment) => void;
  deleteProject: (id: string) => void;
  loadProject: (id: string) => void;
  /** Creates, saves and activates an empty (manually editable) dossier. */
  createBlankProject: () => VideoTreatment;
  /** Bring-your-own-key credentials in use, if any. */
  aiCredentials: AiCredentials | null;
  /** Saves or clears the BYOK credentials and applies the chosen model. */
  setAiCredentials: (credentials: AiCredentials | null) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  /** True until projects have been loaded (cache + cloud). */
  projectsLoading: boolean;
  syncStatus: SyncStatus;
  refreshProjects: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PROJECTS_KEY = 'lenscraft_projects';
const MODEL_KEY = 'lenscraft_model';
const AI_PROVIDER_KEY = 'lenscraft_ai_provider';
const AI_KEY_KEY = 'lenscraft_ai_key';
const AI_MODEL_KEY = 'lenscraft_ai_model';
const ACTIVE_KEY_PREFIX = 'lenscraft_active_';

/** Rough ceiling before we warn the user that localStorage is filling up. */
const CACHE_SIZE_WARNING = 4_000_000;

function activeKey(userId: string | null | undefined): string {
  return `${ACTIVE_KEY_PREFIX}${userId || 'anon'}`;
}

function readCache(): VideoTreatment[] {
  try {
    const saved = localStorage.getItem(PROJECTS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as VideoTreatment[]) : [];
  } catch (e) {
    console.error('Failed to load cached projects', e);
    return [];
  }
}

function writeCache(projects: VideoTreatment[]): boolean {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch (e) {
    // Most likely QuotaExceededError — keep the app usable, just warn loudly.
    console.error('Failed to persist projects locally', e);
    return false;
  }
}

function readActiveTreatment(userId: string | null | undefined): VideoTreatment | null {
  try {
    const raw = localStorage.getItem(activeKey(userId));
    return raw ? (JSON.parse(raw) as VideoTreatment) : null;
  } catch {
    return null;
  }
}

function writeActiveTreatment(userId: string | null | undefined, treatment: VideoTreatment | null) {
  try {
    const key = activeKey(userId);
    if (treatment) localStorage.setItem(key, JSON.stringify(treatment));
    else localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to persist the active project locally', e);
  }
}

/** An empty, fully editable dossier — lets the user work without any AI call. */
export function createBlankTreatment(): VideoTreatment {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    analysis: { title: '', description: '', theme: '', rhythm: '', vibe: '' },
    script: '',
    scenes: [],
    shotList: [],
    schedule: [],
    production: {
      prepDays: 0,
      shootDays: 0,
      postProdDays: 0,
      locationScouting: '',
      rehearsals: '',
      otherPrep: '',
    },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, getAccessToken } = useAuth();

  const [treatment, setTreatment] = useState<VideoTreatment | null>(null);
  const [projects, setProjects] = useState<VideoTreatment[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3.5-flash');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Register the auth + BYOK providers used by src/utils/api.ts.
  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  // ------------------------------------------------------ BYOK (own API key)
  const [aiCredentials, setAiCredentialsState] = useState<AiCredentials | null>(null);

  // Register the auth + BYOK providers used by src/utils/api.ts.
  useEffect(() => {
    setTokenProvider(getAccessToken);
    setCredentialsProvider(() =>
      aiCredentials?.apiKey ? { provider: aiCredentials.provider, apiKey: aiCredentials.apiKey } : null,
    );
  }, [getAccessToken, aiCredentials]);

  useEffect(() => {
    const storedProvider = localStorage.getItem(AI_PROVIDER_KEY);
    const storedKey = localStorage.getItem(AI_KEY_KEY);
    const storedModel = localStorage.getItem(AI_MODEL_KEY);
    if (storedProvider && storedKey) {
      setAiCredentialsState({ provider: storedProvider, apiKey: storedKey, model: storedModel || '' });
      if (storedModel) setSelectedModel(storedModel as AIModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAiCredentials = useCallback((credentials: AiCredentials | null) => {
    if (credentials?.apiKey) {
      localStorage.setItem(AI_PROVIDER_KEY, credentials.provider);
      localStorage.setItem(AI_KEY_KEY, credentials.apiKey);
      if (credentials.model) {
        localStorage.setItem(AI_MODEL_KEY, credentials.model);
        setSelectedModel(credentials.model as AIModel);
      }
      setAiCredentialsState(credentials);
    } else {
      localStorage.removeItem(AI_PROVIDER_KEY);
      localStorage.removeItem(AI_KEY_KEY);
      localStorage.removeItem(AI_MODEL_KEY);
      setAiCredentialsState(null);
    }
  }, []);


  useEffect(() => {
    setCredentialsProvider(() =>
      aiCredentials?.apiKey ? { provider: aiCredentials.provider, apiKey: aiCredentials.apiKey } : null,
    );
  }, [aiCredentials]);

  // ------------------------------------------------------------ model preference
  useEffect(() => {
    const savedModel = localStorage.getItem(MODEL_KEY) as string | null;
    if (savedModel) {
      setSelectedModel(savedModel as AIModel);
    } else {
      setSelectedModel('gemini-3.5-flash');
    }
  }, []);

  const handleSetModel = useCallback((model: AIModel) => {
    setSelectedModel(model);
    localStorage.setItem(MODEL_KEY, model);
  }, []);

  // -------------------------------------------------------------- project loading
  const fetchRemoteProjects = useCallback(async (
    sb: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
    userId: string,
  ): Promise<VideoTreatment[]> => {
    const { data, error } = await sb
      .from('treatments')
      .select('id, data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase fetch failed', error);
      throw new Error(error.message);
    }

    return (data || []).map((row: any) => ({
      ...(row.data as VideoTreatment),
      id: row.id,
      createdAt: row.data?.createdAt ?? new Date(row.created_at).getTime(),
    }));
  }, []);

  const refreshProjects = useCallback(async () => {
    // 1. Instant offline cache.
    const cached = readCache();
    setProjects(cached);
    if (JSON.stringify(cached).length > CACHE_SIZE_WARNING) {
      console.warn('Local project cache is getting large (>4 MB). Cloud sync is recommended.');
    }

    if (!user) {
      setProjectsLoading(false);
      // Restore the last open project so a page refresh doesn't lose it.
      const active = readActiveTreatment(user?.id);
      if (active) setTreatment(active);
      return;
    }

    // 2. Cloud refresh (merge: cloud wins for rows that also exist locally).
    setSyncStatus('syncing');
    try {
      const sb = await getSupabaseClient();
      if (sb) {
        const remote = await fetchRemoteProjects(sb, user.id);
        setProjects(remote);
        writeCache(remote);
      }
      setSyncStatus('synced');
    } catch (e: any) {
      setSyncStatus('error');
      console.warn('Cloud sync failed, keeping offline cache', e?.message || e);
    } finally {
      setProjectsLoading(false);
      // Local-first: keep the last open project alive across refreshes.
      const active = readActiveTreatment(user?.id);
      if (active) setTreatment(active);
    }
  }, [user, fetchRemoteProjects, setTreatment]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  // Clear the active treatment only when the signed-in identity actually
  // CHANGES (a ref keeps the initial restore intact).
  const previousUserId = React.useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (previousUserId.current !== undefined && previousUserId.current !== user?.id) {
      setTreatment(null);
    }
    previousUserId.current = user?.id;
  }, [user?.id, setTreatment]);

  // ------------------------------------------------------------------ mutations
  const saveProject = useCallback((project: VideoTreatment) => {
    setProjects(prev => {
      const exists = prev.some(p => p.id === project.id);
      const next = exists ? prev.map(p => (p.id === project.id ? project : p)) : [project, ...prev];
      writeCache(next);
      return next;
    });

    setTreatment(current => (current && current.id === project.id ? project : current));
    writeActiveTreatment(user?.id, project);

    // Optimistic cloud sync (fire and forget; failures keep the offline cache).
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb || !user || !project.id) return;
      setSyncStatus('syncing');
      const { error } = await sb.from('treatments').upsert(
        {
          id: project.id,
          user_id: user.id,
          data: project,
          version: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (error) {
        console.error('Supabase upsert failed', error);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }
    })();
  }, [user]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      writeCache(next);
      return next;
    });
    setTreatment(current => {
      if (current && current.id === id) {
        writeActiveTreatment(user?.id, null);
        return null;
      }
      return current;
    });

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb || !user) return;
      const { error } = await sb.from('treatments').delete().eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error('Supabase delete failed', error);
        setSyncStatus('error');
      }
    })();
  }, [user]);

  const loadProject = useCallback((id: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === id);
      if (project) {
        setTreatment(project);
        writeActiveTreatment(user?.id, project);
      }
      return prev;
    });
  }, [user]);

  const handleSetTreatment = useCallback((newTreatment: VideoTreatment | null) => {
    setTreatment(newTreatment);
    if (newTreatment && newTreatment.id) {
      saveProject(newTreatment);
    } else if (!newTreatment) {
      writeActiveTreatment(user?.id, null);
    }
  }, [saveProject, user]);

  /** Creates a locally-saved empty dossier so the app is usable without the AI. */
  const createBlankProject = useCallback(() => {
    const project = createBlankTreatment();
    // handleSetTreatment also persists it (projects list, cloud, active slot).
    handleSetTreatment(project);
    writeActiveTreatment(user?.id, project);
    return project;
  }, [handleSetTreatment, user]);

  const value = useMemo<AppContextType>(() => ({
    treatment,
    setTreatment: handleSetTreatment,
    projects,
    saveProject,
    deleteProject,
    loadProject,
    createBlankProject,
    aiCredentials,
    setAiCredentials,
    selectedModel,
    setSelectedModel: handleSetModel,
    projectsLoading,
    syncStatus,
    refreshProjects,
  }), [
    treatment, handleSetTreatment, projects, saveProject, deleteProject, loadProject,
    createBlankProject, aiCredentials, setAiCredentials, selectedModel, handleSetModel,
    projectsLoading, syncStatus, refreshProjects,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppProvider');
  }
  return context;
}
