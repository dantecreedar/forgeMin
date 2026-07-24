import { Injectable } from '@nestjs/common';
import { ISprintRepository } from '../../domain/sprint/sprint.repository.interface';
import { Sprint, ISprint } from '../../domain/sprint/sprint.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreSprintRepository extends FirestoreRepository<Sprint> implements ISprintRepository {
  protected collectionName = 'sprints';

  async findByProjectId(projectId: string): Promise<Sprint[]> {
    return this.findByField('projectId', projectId);
  }

  async findActiveByProjectId(projectId: string): Promise<Sprint | null> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Sprint;
  }
}
