import { Injectable } from '@nestjs/common';
import { GeminiService, ChatMessage } from '../../infrastructure/gemini/gemini.service';
import { ObjectiveApplicationService } from '../objective/objective.service';
import { ProjectApplicationService } from '../project/project.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly objectives: ObjectiveApplicationService,
    private readonly projects: ProjectApplicationService,
  ) {}

  async sendMessage(projectId: string, message: string) {
    const lower = message.toLowerCase();

    const createPatterns = [
      'crea', 'crear', 'create', 'nuevo', 'nueva', 'new',
      'agrega', 'agregar', 'add',
    ];

    const isCreateRequest = createPatterns.some((p) => lower.includes(p));

    if (isCreateRequest) {
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
          message: `Objetivo creado: ${created.title}`,
          objective: created,
        };
      } catch {
        return {
          type: 'error',
          message: 'No pude crear el objetivo. Intenta de nuevo con más detalles.',
        };
      }
    }

    try {
      const history: ChatMessage[] = [
        {
          role: 'system',
          content: `Eres un asistente de ingeniería para ForgeMind. Ayudas al usuario con sus proyectos de software, consultas e informes sobre documentos.
Puedes analizar objetivos, evaluar documentación, sugerir mejoras y planificar tareas.

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
        message: 'Lo siento, hubo un error al comunicarme con la IA. Intenta de nuevo.',
      };
    }
  }
}
