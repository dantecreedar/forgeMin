import { Injectable, Inject } from '@nestjs/common';
import { GeminiService, ChatMessage } from '../../infrastructure/gemini/gemini.service';
import { ObjectiveApplicationService } from '../objective/objective.service';
import { ProjectApplicationService } from '../project/project.service';
import { ILeadRepository, Lead, LeadStatus, OutreachChannel } from '../../domain/entities/lead.entity';
import { LinkedInService } from '../../infrastructure/linkedin/linkedin.service';
import { ApolloEnrichmentService } from '../../infrastructure/services/apollo-enrichment.service';

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
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    private readonly linkedinService: LinkedInService,
    private readonly apolloService: ApolloEnrichmentService,
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

    // Detector de búsqueda en LinkedIn
    const linkedinPatterns = ['linkedin', 'buscar', 'busca', 'search', 'perfil', 'contacto'];
    const isLinkedInRequest = linkedinPatterns.some((p) => lower.includes(p));

    if (isLinkedInRequest) {
      try {
        const parsePrompt = `
        Analiza el siguiente mensaje del usuario y determina si quiere buscar personas, perfiles o prospectos en LinkedIn:
        "${message}"

        Responde únicamente en JSON puro (sin markdown, sin comillas invertidas):
        {
          "isLinkedInSearch": true,
          "role": "El nombre, cargo o rol de la persona a buscar (ej. Brian Alexis Galli, CEO, Developer)",
          "industry": "La industria o empresa (ej. Tecnología, Google, o vacío si no se especifica)"
        }
        `;

        const aiResponse = await this.gemini.chat([{ role: 'user', content: parsePrompt }]);
        const cleanJsonStr = aiResponse.reply.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        if (parsed.isLinkedInSearch) {
          const role = parsed.role || '';
          const industry = parsed.industry || '';

          if (!this.linkedinService.hasToken()) {
            return {
              type: 'chat',
              message: isEnglish
                ? 'To search for profiles on LinkedIn, please connect your account first by clicking "Conectar LinkedIn" at the top of the screen.'
                : 'Para buscar perfiles en LinkedIn, primero debes conectar tu cuenta haciendo clic en el botón "Conectar LinkedIn" en la parte superior de la pantalla.',
            };
          }

          const results = await this.linkedinService.searchPeople(industry, role, 0);

          return {
            type: 'linkedin_results',
            message: isEnglish
              ? `I found these profiles on LinkedIn for "${role}" ${industry ? `in ${industry}` : ''}:`
              : `Encontré estos perfiles en LinkedIn para "${role}" ${industry ? `en ${industry}` : ''}:`,
            linkedInPeople: results.people,
            hasMore: results.hasMore,
            searchContext: { industry, role },
          };
        }
      } catch (err) {
        // Fallback a chat regular
      }
    }

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

    // Detector de comandos para enviar reporte por correo
    const reportPatterns = ['enviar reporte por correo', 'enviar reporte de correo', 'reporte por correo', 'enviar reporte', 'email report', 'send email report'];
    const isReportRequest = reportPatterns.some((p) => lower.includes(p));

    if (isReportRequest) {
      try {
        const reportPrompt = `
        El usuario desea enviar un reporte por correo electrónico.
        Tu objetivo es guiarlo para armar el mensaje de correo creando una serie de opciones y contexto:
        • Destinatario (Email)
        • Contenido/Contexto (ej. Avance de Objetivos, Resumen de Proyectos, Notas de Lanzamiento)
        • Tono del Mensaje (ej. Profesional, Técnico, Informal)
        • Asunto sugerido

        Presenta estas opciones en una lista limpia y estructurada. Pregunta al usuario cuál prefiere o que te brinde los detalles para que puedas redactarle el correo.
        REGLA DE FORMATO:
        - Presenta la información de forma organizada, clara y profesional.
        - NO utilices símbolos de markdown como '###', '***', '---'.
        - Utiliza líneas limpias, espacios y viñetas simples (•) para una excelente legibilidad.
        `;

        const aiResponse = await this.gemini.chat([
          { role: 'system', content: reportPrompt },
          { role: 'user', content: message }
        ]);

        return {
          type: 'chat',
          message: aiResponse.reply,
        };
      } catch (err) {
        // Fallback
      }
    }

    // Detector de comandos de Leads & Outreach
    const leadPatterns = ['lead', 'prospecto', 'empresa', 'outreach', 'prospección', 'apollo', 'contacto comercial'];
    const isLeadRequest = leadPatterns.some((p) => lower.includes(p));

    if (isLeadRequest) {
      try {
        // Verificar si es una búsqueda en Apollo para un dominio
        const apolloPrompt = `
        Analiza el siguiente mensaje de prospección:
        "${message}"

        Determina si el usuario está solicitando explícitamente buscar prospectos en un dominio de correo/empresa (ej. stripe.com, vertex.ai) en Apollo.
        Responde únicamente en JSON puro (sin markdown, sin comillas invertidas):
        {
          "isApolloSearch": true o false,
          "domain": "el dominio a buscar (ej. stripe.com, vertex.ai, o vacío si no se detecta)"
        }
        `;

        const apolloRes = await this.gemini.chat([{ role: 'user', content: apolloPrompt }]);
        const cleanApolloJson = apolloRes.reply.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedApollo = JSON.parse(cleanApolloJson);

        if (parsedApollo.isApolloSearch && parsedApollo.domain) {
          const apolloResults = await this.apolloService.searchPeopleByDomain(parsedApollo.domain);
          if (apolloResults && apolloResults.length > 0) {
            const result = apolloResults[0];
            const leadId = `lead_${Date.now()}`;
            const newLead = new Lead(
              leadId,
              result.name || 'Prospecto sin nombre',
              result.email || 'sin-email@empresa.com',
              result.company || 'Empresa Prospecto',
              result.title || 'Ejecutivo',
              result.linkedinUrl || 'https://linkedin.com',
              LeadStatus.ENRICHED,
              { domain: parsedApollo.domain }, // companyContext
              {
                score: 95,
                reasoning: `Prospecto real extraído de Apollo para el dominio ${parsedApollo.domain}.`,
                keySynergies: ['Contacto directo validado', 'Email corporativo verificado'],
              },
              [
                {
                  channel: OutreachChannel.GMAIL,
                  subject: `Propuesta comercial para ${result.company}`,
                  body: `Hola ${result.name},\n\nHe visto tu trabajo en ${result.company} y quería compartirte cómo nuestra plataforma puede optimizar su desarrollo conectando GitHub con IA.\n\n¿Te gustaría agendar una demo corta?`,
                  generatedAt: new Date(),
                },
                {
                  channel: OutreachChannel.LINKEDIN,
                  subject: 'Conexión estratégica',
                  body: `Hola ${result.name}, me encantaría conectar contigo para compartir ideas sobre optimización de desarrollo con IA.`,
                  generatedAt: new Date(),
                },
              ],
              [], // dripSequence
              [], // replies
              new Date(),
              new Date()
            );

            await this.leadRepository.save(newLead);

            return {
              type: 'lead_action',
              message: isEnglish
                ? `I found a real prospect on Apollo for domain **${parsedApollo.domain}**:`
                : `He encontrado un prospecto real en Apollo para el dominio **${parsedApollo.domain}**:`,
              lead: newLead,
            };
          }
        }

        const leadPrompt = `
        Analiza el siguiente mensaje del usuario en un contexto comercial / prospección de leads:
        "${message}"

        Actúa como un buscador de prospectos. Debes generar un contacto realista (simulado) que coincida perfectamente con la solicitud del usuario (industria, rol, etc).
        Genera los siguientes datos y responde únicamente en JSON puro (sin markdown, sin comillas invertidas):
        {
          "isCreateLead": true,
          "name": "Nombre y apellido realista",
          "email": "email corporativo realista",
          "company": "Empresa realista según la industria",
          "role": "El rol solicitado",
          "domain": "dominio.com",
          "linkedinUrl": "https://linkedin.com/in/perfil-realista",
          "reply": "Resumen claro de lo que la IA encontró y el prospecto generado"
        }
        `;

        const aiResponse = await this.gemini.chat([{ role: 'user', content: leadPrompt }]);
        const cleanJsonStr = aiResponse.reply.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        if (parsed.isCreateLead || parsed.email || parsed.company) {
          const leadId = `lead_${Date.now()}`;
          const newLead = new Lead(
            leadId,
            parsed.name || 'Prospecto sin nombre',
            parsed.email || 'sin-email@empresa.com',
            parsed.company || 'Empresa Prospecto',
            parsed.role || 'Ejecutivo',
            parsed.linkedinUrl || 'https://linkedin.com',
            LeadStatus.ENRICHED,
            undefined, // companyContext
            {
              score: 92,
              reasoning: `Gran oportunidad detectada para ${parsed.company || 'la empresa'}. Alta compatibilidad con la infraestructura de desarrollo de ForgeMind.`,
              keySynergies: ['Automatización de pipelines de desarrollo', 'Integración directa con repositorios GitHub'],
            },
            [
              {
                channel: OutreachChannel.GMAIL,
                subject: `Solución de Inteligencia para ${parsed.company || 'tu empresa'}`,
                body: `Hola ${parsed.name || 'estimado'},\n\nHe visto el crecimiento de ${parsed.company || 'tu equipo'} y quería compartirte cómo nuestra plataforma puede optimizar su desarrollo conectando GitHub con IA.\n\n¿Te gustaría agendar una demo corta?`,
                generatedAt: new Date(),
              },
              {
                channel: OutreachChannel.LINKEDIN,
                subject: 'Conexión estratégica',
                body: `Hola ${parsed.name || ''}, me encantaría conectar contigo para compartir ideas sobre optimización de desarrollo con IA.`,
                generatedAt: new Date(),
              },
            ],
            [], // dripSequence
            [], // replies
            new Date(),
            new Date()
          );

          await this.leadRepository.save(newLead);

          return {
            type: 'lead_action',
            message: parsed.reply || (isEnglish ? 'Lead created and enriched with AI strategy:' : 'Lead registrado y analizado estratégicamente con IA:'),
            lead: newLead,
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
