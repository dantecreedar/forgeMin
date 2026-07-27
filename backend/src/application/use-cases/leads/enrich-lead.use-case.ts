import { Injectable, Inject } from '@nestjs/common';
import { Lead, ILeadRepository } from '../../../domain/entities/lead.entity';
import { GeminiLeadEnrichmentService } from '../../../infrastructure/services/gemini-lead-enrichment.service';

@Injectable()
export class EnrichLeadUseCase {
  constructor(
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    private readonly geminiEnrichmentService: GeminiLeadEnrichmentService,
  ) {}

  async execute(leadId: string): Promise<Lead> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new Error(`Lead con ID ${leadId} no encontrado`);
    }

    const enrichment = await this.geminiEnrichmentService.analyzeLeadSynergy(lead);
    lead.aiScore = enrichment.score;
    lead.drafts = enrichment.drafts;
    lead.updatedAt = new Date();

    return await this.leadRepository.update(lead);
  }
}
