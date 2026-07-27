import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ILeadRepository, LeadStatus } from '../../domain/entities/lead.entity';
import { GmailOutreachService } from './gmail-outreach.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class LeadDripSequenceCronService {
  private readonly logger = new Logger(LeadDripSequenceCronService.name);

  constructor(
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    private readonly gmailService: GmailOutreachService,
  ) {}

  // Cron job automático que se ejecuta para verificar si hay pasos de seguimiento pendientes
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleLeadDripCron() {
    this.logger.log('Ejecutando revisión de Secuencias Automáticas de Seguimiento (Drip)...');

    const leads = await this.leadRepository.findAll();

    for (const lead of leads) {
      // Si el lead ya respondió o fue cerrado, no enviamos más correos automáticos
      if (lead.status === LeadStatus.CLOSED || lead.replies.length > 0) {
        continue;
      }

      for (const step of lead.dripSequence) {
        if (step.status === 'PENDING') {
          try {
            this.logger.log(`Enviando paso #${step.stepNumber} de seguimiento a ${lead.email}...`);

            await this.gmailService.sendEmail({
              to: lead.email,
              subject: step.subject || `Seguimiento de propuesta para ${lead.company}`,
              body: step.body,
            });

            step.status = 'SENT';
            step.sentAt = new Date();
            lead.status = LeadStatus.CONTACTED;
            lead.updatedAt = new Date();
            await this.leadRepository.update(lead);
            break; // Enviamos un paso por iteración
          } catch (err: any) {
            this.logger.error(`Error al enviar paso de seguimiento a ${lead.email}: ${err?.message || err}`);
          }
        }
      }
    }
  }
}
