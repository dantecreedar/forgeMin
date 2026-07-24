import { DocumentAttachment } from './document.entity';

export const DOCUMENT_REPOSITORY = 'DOCUMENT_REPOSITORY';

export interface IDocumentRepository {
  findById(id: string): Promise<DocumentAttachment | null>;
  findByProjectId(projectId: string): Promise<DocumentAttachment[]>;
  save(doc: DocumentAttachment): Promise<void>;
  delete(id: string): Promise<void>;
}
