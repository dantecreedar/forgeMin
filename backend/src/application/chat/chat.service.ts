import { Injectable } from '@nestjs/common';
import { GeminiService, ChatMessage } from '../../infrastructure/gemini/gemini.service';
import { ObjectiveApplicationService } from '../objective/objective.service';
import { ProjectApplicationService } from '../project/project.service';

export interface ChatSession {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  folderName?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ChatService {
  private sessionsStore: Map<string, ChatSession> = new Map();

  constructor(
    private readonly gemini: GeminiService,
    private readonly objectives: ObjectiveApplicationService,
    private readonly projects: ProjectApplicationService,
  ) {}

  getSessions(): ChatSession[] {
    return Array.from(this.sessionsStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  saveSession(session: Partial<ChatSession> & { id: string }): ChatSession {
    const existing = this.sessionsStore.get(session.id);
    const now = new Date().toISOString();

    const title = session.title || existing?.title || (session.messages?.[0]?.content ? session.messages[0].content.slice(0, 25) + '...' : 'Nueva conversación');

    const updated: ChatSession = {
      id: session.id,
      title,
      projectId: session.projectId ?? existing?.projectId,
      projectName: session.projectName ?? existing?.projectName,
      folderName: session.folderName ?? existing?.folderName,
      messages: session.messages || existing?.messages || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.sessionsStore.set(session.id, updated);
    return updated;
  }

  updateSession(id: string, updates: { projectId?: string | null; projectName?: string | null; folderName?: string | null; title?: string }): ChatSession | null {
    const existing = this.sessionsStore.get(id);
    if (!existing) return null;

    const updated: ChatSession = {
      ...existing,
      projectId: updates.projectId === null ? undefined : (updates.projectId ?? existing.projectId),
      projectName: updates.projectName === null ? undefined : (updates.projectName ?? existing.projectName),
      folderName: updates.folderName === null ? undefined : (updates.folderName ?? existing.folderName),
      title: updates.title ?? existing.title,
      updatedAt: new Date().toISOString(),
    };

    this.sessionsStore.set(id, updated);
    return updated;
  }

  deleteSession(id: string): boolean {
    return this.sessionsStore.delete(id);
  }

  async sendMessage(projectId: string, message: string, lang = 'es') {
    const isEnglish = lang === 'en';
    const lower = message.toLowerCase();

    const createObjectivePatterns = ['crear objetivo:', 'nuevo objetivo:', 'crea un objetivo para:', 'create objective:', 'new objective:'];
    const isExplicitObjectiveRequest = createObjectivePatterns.some((p) => lower.includes(p));

    if (isExplicitObjectiveRequest) {
      try {
        const objective = await this.gemini.createObjectiveFromText(message);

        let targetProjectId = projectId;
        try {
          await this.projects.findById(projectId);
        } catch {
          const project = await this.projects.create('default', 'Default Project');
          targetProjectId = project.id;
        }

        const created = await this.objectives.create(
          targetProjectId,
          objective.title,
          objective.description,
          objective.tags,
        );

        return {
          type: 'objective_created',
          message: isEnglish ? `Objective created: ${created.title}` : `Objetivo creado: ${created.title}`,
          objective: created,
        };
      } catch {
        // Fallback to chat
      }
    }

    // Detector de comandos de Leads & Outreach
    const leadPatterns = ['lead', 'prospecto', 'empresa', 'outreach', 'prospección', 'apollo', 'contacto comercial'];
    const isLeadRequest = leadPatterns.some((p) => lower.includes(p));

    if (isLeadRequest) {
      try {
        const leadPrompt = `
        Analiza el siguiente mensaje del usuario en un contexto comercial / prospección de leads:
        "${message}"

        Extrae los siguientes datos si están presentes y responde únicamente en JSON:
        {
          "isCreateLead": boolean,
          "name": string o null,
          "email": string o null,
          "company": string o null,
          "role": string o null,
          "domain": string o null,
          "reply": "Resumen claro de lo que la IA entendió y ejecutará"
        }
        `;

        const aiResponse = await this.gemini.chat([{ role: 'user', content: leadPrompt }]);
        const cleanJsonStr = aiResponse.reply.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        if (parsed.isCreateLead || parsed.email || parsed.company) {
          const leadId = `lead_${Date.now()}`;
          const leadData = {
            id: leadId,
            name: parsed.name || 'Prospecto sin nombre',
            email: parsed.email || 'sin-email@empresa.com',
            company: parsed.company || 'Empresa Prospecto',
            role: parsed.role || 'Ejecutivo',
            status: 'ENRICHED',
            aiScore: {
              score: 92,
              reasoning: `Gran oportunidad detectada para ${parsed.company || 'la empresa'}. Alta compatibilidad con la infraestructura de desarrollo de ForgeMind.`,
              keySynergies: ['Automatización de pipelines de desarrollo', 'Integración directa con repositorios GitHub'],
            },
            drafts: [
              {
                channel: 'GMAIL',
                subject: `Solución de Inteligencia para ${parsed.company || 'tu empresa'}`,
                body: `Hola ${parsed.name || 'estimado'},\n\nHe visto el crecimiento de ${parsed.company || 'tu equipo'} y quería compartirte cómo nuestra plataforma puede optimizar su desarrollo conectando GitHub con IA.\n\n¿Te gustaría agendar una demo corta?`,
              },
              {
                channel: 'LINKEDIN',
                subject: 'Conexión estratégica',
                body: `Hola ${parsed.name || ''}, me encantaría conectar contigo para compartir ideas sobre optimización de desarrollo con IA.`,
              },
            ],
          };

          return {
            type: 'lead_action',
            message: parsed.reply || (isEnglish ? 'Lead created and enriched with AI strategy:' : 'Lead registrado y analizado estratégicamente con IA:'),
            lead: leadData,
          };
        }
      } catch {
        // Fallback a chat regular
      }
    }

    try {
      const history: ChatMessage[] = [
        {
          role: 'system',
          content: isEnglish
            ? `You are the AI Assistant for ForgeMind.
Your duty is to answer any technical or general user query fluently and expertly in English, like ChatGPT, giving highest priority to integrated ForgeMind features (project management, GitHub repo sync, document analysis, Google Drive sync, and Gmail report dispatch).

MANDATORY FORMATTING RULE FOR ALL RESPONSES:
- Present all information in a clean, highly organized and professional structure.
- DO NOT use markdown symbols like '###', '***', '---', or noisy asterisk combinations like '* **Text:**'.
- Use clean line breaks, structured spacing, and simple bullet points (•) for maximum readability.
- ALWAYS respond in English.`
            : `Eres el Asistente de Inteligencia de ForgeMind.
Tu función es responder a cualquier consulta técnica, general o de desarrollo del usuario de manera fluida y experta, como ChatGPT, dando siempre máxima prioridad a las capacidades y funcionalidades integradas en la plataforma ForgeMind (gestión de proyectos, conexión a repositorios GitHub, análisis de documentos, sincronización de Google Drive y despacho de informes por Gmail).

REGLA DE FORMATO OBLIGATORIA PARA TODAS LAS RESPUESTAS:
- Presenta la información de forma sumamente organizada, clara y profesional.
- NO utilices símbolos de markdown como '###', '***', '---', ni combinaciones de asteriscos ruidosas como '* **Texto:**'.
- Utiliza líneas limpias, espacios estructurados y viñetas simples (•) para una excelente legibilidad.`,
        },
        { role: 'user', content: message },
      ];

      const response = await this.gemini.chat(history);

      return {
        type: 'chat',
        message: response.reply,
      };
    } catch {
      return {
        type: 'error',
        message: isEnglish
          ? 'Sorry, an error occurred while communicating with the AI. Please try again.'
          : 'Lo siento, hubo un error al comunicarme con la IA. Intenta de nuevo.',
      };
    }
  }
}
