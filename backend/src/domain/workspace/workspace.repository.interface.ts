import { Workspace } from './workspace.entity';

export const WORKSPACE_REPOSITORY = 'WORKSPACE_REPOSITORY';

export interface IWorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByOwnerId(ownerId: string): Promise<Workspace[]>;
  findByMemberId(userId: string): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  update(workspace: Workspace): Promise<void>;
  delete(id: string): Promise<void>;
}
