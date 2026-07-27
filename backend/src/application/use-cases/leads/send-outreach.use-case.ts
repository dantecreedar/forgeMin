import { Injectable, Inject } from '@nestjs/common';
import { Lead, ILeadRepository, OutreachChannel, LeadStatus } from '../../../domain/entities/lead.entity';
import { GmailOutreachService } from '../../../infrastructure/services/gmail-outreach.service';

export interface SendOutreachDto {
  leadId: string;
  channel: OutreachChannel;
  subject?: string;
  body: string;
}

@Injectable()
export class SendOutreachUseCase {
  constructor(
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    private readonly gmailService: GmailOutreachService,
  ) {}

  async execute(dto: SendOutreachDto): Promise<{ success: boolean; message: string; lead: Lead }> {
    const lead = await this.leadRepository.findById(dto.leadId);
    if (!lead) {
      throw new Error(`Lead con ID ${dto.leadId} no encontrado`);
    }

    if (dto.channel === OutreachChannel.GMAIL || dto.channel === OutreachChannel.CUSTOM_EMAIL) {
      await this.gmailService.sendEmail({
        to: lead.email,
        subject: dto.subject || `Propuesta personalizada para ${lead.company}`,
        body: dto.body,
      });
      lead.status = LeadStatus.CONTACTED;
      lead.updatedAt = new Date();
      await this.leadRepository.update(lead);
      return { success: true, message: 'Correo enviado con éxito vía Gmail', lead };
    }

    // Para LinkedIn, se registra la intención y se entrega el borrador preparado
    lead.status = LeadStatus.CONTACTED;
    lead.updatedAt = new Date();
    await this.leadRepository.update(lead);

    return {
      success: true,
      message: 'Mensaje de LinkedIn preparado. Puedes copiarlo o enviarlo usando la integración.',
      lead,
    };
  }
}
