export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  roles: Record<string, string[]>;
  isActive: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  repositoryIds: string[];
  objectiveIds: string[];
  isArchived: boolean;
  createdAt: string;
}

export interface Objective {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: ObjectiveStatus;
  progress: number;
  summary?: string;
  risks?: string[];
  blockers?: string[];
  nextSteps?: string[];
  tags: string[];
  createdAt: string;
}

export enum ObjectiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  VALIDATED = 'validated',
  RELEASED = 'released',
  BLOCKED = 'blocked',
}

export interface Repository {
  id: string;
  projectId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive: boolean;
  lastSyncAt?: string;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: string;
  title: string;
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface Report {
  id: string;
  projectId: string;
  type: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  createdAt: string;
}

export interface ReportSection {
  title: string;
  content: string;
}
