import { Injectable } from '@nestjs/common';
import { IObjectiveRepository } from '../../domain/objective/objective.repository.interface';
import { Objective, IObjective } from '../../domain/objective/objective.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreObjectiveRepository extends FirestoreRepository<Objective> implements IObjectiveRepository {
  protected collectionName = 'objectives';

  async findByProjectId(projectId: string): Promise<Objective[]> {
    return this.findByField('projectId', projectId);
  }

  async findByStatus(status: string): Promise<Objective[]> {
    return this.findByField('status', status);
  }
}
