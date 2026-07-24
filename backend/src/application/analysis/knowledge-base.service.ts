import { Injectable, Inject } from '@nestjs/common';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { IKnowledgeRepository, KNOWLEDGE_REPOSITORY } from '../../domain/knowledge/knowledge.repository.interface';
import { KnowledgeEntry } from '../../domain/knowledge/knowledge.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly geminiService: GeminiService,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledgeRepository: IKnowledgeRepository,
  ) {}

  async query(projectId: string, question: string, context: unknown[]): Promise<{ answer: string; sources: string[] }> {
    const existing = await this.knowledgeRepository.search(projectId, question);
    if (existing.length > 0) {
      return { answer: existing[0].answer, sources: [existing[0].sourceId] };
    }

    const result = await this.geminiService.queryKnowledge(question, context);

    const entry = new KnowledgeEntry(
      uuidv4(), projectId, question, result.answer,
      'ai_query', '', 1.0, [],
      new Date(), new Date(),
    );
    await this.knowledgeRepository.save(entry);

    return { answer: result.answer, sources: result.relevantSources };
  }

  async indexEntry(projectId: string, question: string, answer: string, sourceType: string, sourceId: string, tags: string[]): Promise<KnowledgeEntry> {
    const entry = new KnowledgeEntry(
      uuidv4(), projectId, question, answer,
      sourceType, sourceId, 1.0, tags,
      new Date(), new Date(),
    );
    await this.knowledgeRepository.save(entry);
    return entry;
  }
}
