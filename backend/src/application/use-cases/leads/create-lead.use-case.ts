import { Injectable, Inject } from '@nestjs/common';
import { Lead, ILeadRepository, LeadStatus } from '../../../domain/entities/lead.entity';
import { GeminiLeadEnrichmentService } from '../../../infrastructure/services/gemini-lead-enrichment.service';

export interface CreateLeadDto {
  name: string;
  email: string;
  company: string;
  role?: string;
  linkedinUrl?: string;
  companyDomain?: string;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    private readonly geminiEnrichmentService: GeminiLeadEnrichmentService,
  ) {}

  async execute(dto: CreateLeadDto): Promise<Lead> {
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newLead = new Lead(
      leadId,
      dto.name,
      dto.email,
      dto.company,
      dto.role,
      dto.linkedinUrl,
      LeadStatus.NEW,
      dto.companyDomain ? { domain: dto.companyDomain } : undefined,
    );

    // Enriquecer con IA de forma asíncrona / inmediata
    try {
      const enrichment = await this.geminiEnrichmentService.analyzeLeadSynergy(newLead);
      newLead.aiScore = enrichment.score;
      newLead.drafts = enrichment.drafts;
      newLead.status = LeadStatus.ENRICHED;
    } catch (err: any) {
      console.warn('Falló el enriquecimiento automático del lead con Gemini:', err?.message || err);
    }

    return await this.leadRepository.save(newLead);
  }
}
