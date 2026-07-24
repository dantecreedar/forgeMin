import { KnowledgeEntry } from './knowledge.entity';

export const KNOWLEDGE_REPOSITORY = 'KNOWLEDGE_REPOSITORY';

export interface IKnowledgeRepository {
  findById(id: string): Promise<KnowledgeEntry | null>;
  findByProjectId(projectId: string): Promise<KnowledgeEntry[]>;
  search(projectId: string, query: string): Promise<KnowledgeEntry[]>;
  save(entry: KnowledgeEntry): Promise<void>;
  update(entry: KnowledgeEntry): Promise<void>;
  delete(id: string): Promise<void>;
}
