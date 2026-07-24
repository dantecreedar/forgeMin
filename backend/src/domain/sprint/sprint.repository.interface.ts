import { Sprint } from './sprint.entity';

export const SPRINT_REPOSITORY = 'SPRINT_REPOSITORY';

export interface ISprintRepository {
  findById(id: string): Promise<Sprint | null>;
  findByProjectId(projectId: string): Promise<Sprint[]>;
  findActiveByProjectId(projectId: string): Promise<Sprint | null>;
  save(sprint: Sprint): Promise<void>;
  update(sprint: Sprint): Promise<void>;
  delete(id: string): Promise<void>;
}
