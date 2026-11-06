import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { VideoTreatment } from './types';

export type AIModel = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview';

interface AppContextType {
  treatment: VideoTreatment | null;
  setTreatment: (treatment: VideoTreatment | null) => void;
  projects: VideoTreatment[];
  saveProject: (project: VideoTreatment) => void;
  deleteProject: (id: string) => void;
  loadProject: (id: string) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [treatment, setTreatment] = useState<VideoTreatment | null>(null);
  const [projects, setProjects] = useState<VideoTreatment[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3.5-flash');

  useEffect(() => {
    const saved = localStorage.getItem('lenscraft_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
    const savedModel = localStorage.getItem('lenscraft_model') as string;
    if (savedModel === 'gemini-3.5-flash' || savedModel === 'gemini-3.1-pro-preview') {
      setSelectedModel(savedModel as AIModel);
    } else if (savedModel === 'gemini-3.1-pro') {
      setSelectedModel('gemini-3.1-pro-preview');
      localStorage.setItem('lenscraft_model', 'gemini-3.1-pro-preview');
    } else {
      setSelectedModel('gemini-3.5-flash');
    }
  }, []);

  const handleSetModel = useCallback((model: AIModel) => {
    setSelectedModel(model);
    localStorage.setItem('lenscraft_model', model);
  }, []);

  const saveProject = useCallback((project: VideoTreatment) => {
    setProjects(prev => {
      let newProjects;
      const exists = prev.some(p => p.id === project.id);
      if (exists) {
        newProjects = prev.map(p => p.id === project.id ? project : p);
      } else {
        newProjects = [project, ...prev];
      }
      localStorage.setItem('lenscraft_projects', JSON.stringify(newProjects));
      return newProjects;
    });

    // Also update current active treatment if it matches
    setTreatment(current => (current && current.id === project.id) ? project : current);
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const newProjects = prev.filter(p => p.id !== id);
      localStorage.setItem('lenscraft_projects', JSON.stringify(newProjects));
      return newProjects;
    });
    setTreatment(current => (current && current.id === id) ? null : current);
  }, []);

  const loadProject = useCallback((id: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === id);
      if (project) {
        setTreatment(project);
      }
      return prev;
    });
  }, []);

  const handleSetTreatment = useCallback((newTreatment: VideoTreatment | null) => {
    setTreatment(newTreatment);
    if (newTreatment && newTreatment.id) {
      saveProject(newTreatment);
    }
  }, [saveProject]);

  return (
    <AppContext.Provider value={{ 
      treatment, 
      setTreatment: handleSetTreatment,
      projects,
      saveProject,
      deleteProject,
      loadProject,
      selectedModel,
      setSelectedModel: handleSetModel
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppProvider');
  }
  return context;
}
