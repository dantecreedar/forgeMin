import { Injectable } from '@nestjs/common';
import { IObjectiveRepository } from '../../domain/objective/objective.repository.interface';
import { Objective, IObjective } from '../../domain/objective/objective.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreObjectiveRepository extends FirestoreRepository<Objective> implements IObjectiveRepository {
  protected collectionName = 'objectives';

  protected override toEntity(docData: any): Objective {
    if (!docData) return docData;
    const parseDate = (d: any) => (d?.toDate ? d.toDate() : d ? new Date(d) : new Date());
    return new Objective(
      docData.id,
      docData.projectId,
      docData.title,
      docData.description,
      docData.status || 'pending',
      docData.progress ?? 0,
      docData.summary,
      docData.risks || [],
      docData.blockers || [],
      docData.nextSteps || [],
      docData.tags || [],
      parseDate(docData.createdAt),
      parseDate(docData.updatedAt),
    );
  }

  async findByProjectId(projectId: string): Promise<Objective[]> {
    return this.findByField('projectId', projectId);
  }

  async findByStatus(status: string): Promise<Objective[]> {
    return this.findByField('status', status);
  }
}
