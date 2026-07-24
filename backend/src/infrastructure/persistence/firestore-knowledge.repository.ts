import { Injectable } from '@nestjs/common';
import { IKnowledgeRepository } from '../../domain/knowledge/knowledge.repository.interface';
import { KnowledgeEntry, IKnowledgeEntry } from '../../domain/knowledge/knowledge.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreKnowledgeRepository extends FirestoreRepository<KnowledgeEntry> implements IKnowledgeRepository {
  protected collectionName = 'knowledgeBase';

  async findByProjectId(projectId: string): Promise<KnowledgeEntry[]> {
    return this.findByField('projectId', projectId);
  }

  async search(projectId: string, query: string): Promise<KnowledgeEntry[]> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .where('question', '>=', query)
      .where('question', '<=', query + '\uf8ff')
      .limit(10)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as KnowledgeEntry));
  }
}
