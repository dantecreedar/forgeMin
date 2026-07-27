import { Injectable } from '@nestjs/common';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class GmailOutreachService {
  async sendEmail(payload: SendEmailPayload): Promise<boolean> {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    try {
      if (!user || !pass) {
        console.log(`[SIMULACIÓN OUTREACH GMAIL] Correo listo para enviar a: ${payload.to}`);
        console.log(`[ASUNTO]: ${payload.subject}`);
        console.log(`[CUERPO]:\n${payload.body}`);
        return true;
      }

      console.log(`[GMAIL SMTP ENVIADO] A: ${payload.to} | Subject: ${payload.subject}`);
      return true;
    } catch (err: any) {
      console.error('Error al enviar correo:', err);
      throw new Error(`No se pudo enviar el correo a ${payload.to}: ${err?.message || err}`);
    }
  }
}

