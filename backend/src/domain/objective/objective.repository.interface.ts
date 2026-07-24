import { Objective } from './objective.entity';

export const OBJECTIVE_REPOSITORY = 'OBJECTIVE_REPOSITORY';

export interface IObjectiveRepository {
  findById(id: string): Promise<Objective | null>;
  findByProjectId(projectId: string): Promise<Objective[]>;
  findByStatus(status: string): Promise<Objective[]>;
  save(objective: Objective): Promise<void>;
  update(objective: Objective): Promise<void>;
  delete(id: string): Promise<void>;
}
