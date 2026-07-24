import { Injectable } from '@nestjs/common';
import { IDocumentRepository } from '../../domain/document/document.repository.interface';
import { DocumentAttachment } from '../../domain/document/document.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreDocumentRepository extends FirestoreRepository<DocumentAttachment> implements IDocumentRepository {
  protected collectionName = 'documents';

  async findByProjectId(projectId: string): Promise<DocumentAttachment[]> {
    return this.findByField('projectId', projectId);
  }
}
