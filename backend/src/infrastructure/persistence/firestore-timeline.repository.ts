import { Injectable } from '@nestjs/common';
import { ITimelineRepository } from '../../domain/timeline/timeline.repository.interface';
import { TimelineEvent, TimelineEventType, ITimelineEvent } from '../../domain/timeline/timeline.entity';
import { FirestoreRepository } from './firestore-repository';
import * as firebase from 'firebase-admin';

@Injectable()
export class FirestoreTimelineRepository extends FirestoreRepository<TimelineEvent> implements ITimelineRepository {
  protected collectionName = 'timeline';

  async findByProjectId(projectId: string): Promise<TimelineEvent[]> {
    return this.findByField('projectId', projectId);
  }

  async findByProjectIdAndType(projectId: string, type: TimelineEventType): Promise<TimelineEvent[]> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .where('type', '==', type)
      .orderBy('occurredAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimelineEvent));
  }

  async findByProjectIdPaginated(projectId: string, limit: number, offset: number): Promise<TimelineEvent[]> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .orderBy('occurredAt', 'desc')
      .offset(offset)
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimelineEvent));
  }
}
