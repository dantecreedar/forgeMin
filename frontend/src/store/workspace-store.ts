import { create } from 'zustand';
import type { Workspace, Project } from '@/types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  currentProject: Project | null;
  workspaces: Workspace[];
  projects: Project[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setProjects: (projects: Project[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  currentProject: null,
  workspaces: [],
  projects: [],
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setProjects: (projects) => set({ projects }),
}));
