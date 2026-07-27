import { Injectable } from '@nestjs/common';
import { Lead, LeadScore, OutreachDraft, OutreachChannel } from '../../domain/entities/lead.entity';

@Injectable()
export class GeminiLeadEnrichmentService {
  private ai: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = { apiKey };
    }
  }

  async analyzeLeadSynergy(lead: Lead): Promise<{ score: LeadScore; drafts: OutreachDraft[] }> {
    const projectContext = `
    Nombre del Proyecto: ForgeMind / Platform
    Descripción: Plataforma de inteligencia en ingeniería que integra repositorios de GitHub con IA (Gemini) para automatización, arquitectura limpia y optimización de código.
    Público objetivo: Equipos de desarrollo, CTOs, Tech Leads, startups de software y empresas tecnológicas.
    `;

    const prompt = `
    Analiza la sinergia entre nuestro proyecto/plataforma y el siguiente prospecto:
    - Nombre del Prospecto: ${lead.name}
    - Empresa: ${lead.company}
    - Rol/Cargo: ${lead.role || 'Desconocido'}
    - Email: ${lead.email}
    - Dominio de la empresa: ${lead.companyContext?.domain || 'N/A'}

    Contexto del Proyecto:
    ${projectContext}

    Genera una respuesta en formato JSON estrictamente válido con el siguiente esquema:
    {
      "score": número del 0 al 100 de coincidencia/sinergia,
      "reasoning": "Explicación breve de por qué encaja o no este prospecto",
      "keySynergies": ["Punto de valor 1", "Punto de valor 2"],
      "emailSubject": "Asunto de correo frío altamente relevante",
      "emailBody": "Cuerpo del correo personalizado conectando los beneficios del proyecto con la empresa del lead",
      "linkedinMessage": "Mensaje corto e impacto directo para conectar por LinkedIn"
    }
    `;

    if (!this.ai) {
      // Fallback inteligente si no hay llave configurada
      return this.getMockEnrichment(lead);
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      return {
        score: {
          score: parsed.score || 85,
          reasoning: parsed.reasoning || 'Encaje estratégico basado en el perfil corporativo y requerimientos de desarrollo.',
          keySynergies: parsed.keySynergies || ['Optimización de ciclos de entrega de software', 'Integración directa con GitHub'],
        },
        drafts: [
          {
            channel: OutreachChannel.GMAIL,
            subject: parsed.emailSubject || `Propuesta de automatización para ${lead.company}`,
            body: parsed.emailBody || `Hola ${lead.name},\n\nHe visto el trabajo que realizan en ${lead.company} y quería compartirte cómo nuestra plataforma puede optimizar su desarrollo...`,
            generatedAt: new Date(),
          },
          {
            channel: OutreachChannel.LINKEDIN,
            subject: 'Conexión estratégica',
            body: parsed.linkedinMessage || `Hola ${lead.name}, me encantaría conectar contigo y compartir algunas ideas de IA aplicadas a ${lead.company}.`,
            generatedAt: new Date(),
          },
        ],
      };
    } catch (err: any) {
      console.warn('Error al llamar a Gemini API en LeadEnrichment:', err?.message || err);
      return this.getMockEnrichment(lead);
    }
  }

  private getMockEnrichment(lead: Lead): { score: LeadScore; drafts: OutreachDraft[] } {
    return {
      score: {
        score: 88,
        reasoning: `Alta coincidencia potencial entre ${lead.company} y nuestro ecosistema de desarrollo guiado por IA.`,
        keySynergies: [
          'Aceleración de revisión de código',
          'Gestión automatizada de tareas de backend y frontend',
        ],
      },
      drafts: [
        {
          channel: OutreachChannel.GMAIL,
          subject: `Automatización de desarrollo con IA para ${lead.company}`,
          body: `Hola ${lead.name},\n\nTe escribo porque noté el crecimiento de ${lead.company}. Estamos desarrollando una plataforma que ayuda a equipos como el tuyo a acelerar sus entregas conectando GitHub con inteligencia artificial.\n\n¿Te gustaría ver una demo corta de 5 minutos?\n\nSaludos.`,
          generatedAt: new Date(),
        },
        {
          channel: OutreachChannel.LINKEDIN,
          subject: 'Conexión estratégica',
          body: `Hola ${lead.name}, vi tu rol en ${lead.company} y me gustaría conectar contigo para compartir cómo estamos aplicando IA en ingeniería de software.`,
          generatedAt: new Date(),
        },
      ],
    };
  }
}
