import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { WorkspaceApplicationService } from '../workspace/workspace.service';
import { ProjectApplicationService } from '../project/project.service';
import { ObjectiveApplicationService } from '../objective/objective.service';
import { RepositoryApplicationService } from '../repository/repository.service';

@Injectable()
export class EngineService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly workspaces: WorkspaceApplicationService,
    private readonly projects: ProjectApplicationService,
    private readonly objectives: ObjectiveApplicationService,
    private readonly repositories: RepositoryApplicationService,
  ) {}

  async process(userId: string, message: string) {
    const parsed = await this.parseIntent(userId, message);
    return this.execute(userId, parsed);
  }

  private async parseIntent(userId: string, message: string) {
    const systemPrompt = `Eres el motor de inteligencia de ForgeMind. Analiza el mensaje del usuario y determina QUÉ acción quiere realizar.

    Acciones disponibles:
    - create: crear workspace, project u objective
    - update: actualizar estado/progreso de objective
    - list: listar workspaces, projects, objectives o github_repos
    - detail: ver detalle de una entidad
    - delete: eliminar una entidad

    Entidades disponibles:
    - workspace: name, description, ownerId (userId)
    - project: name, description, workspaceId
    - objective (tambien llamado task o tarea): title, description, tags[], projectId, status, progress
    - github_repo (tambien llamado repo, repositorio de github): repositorios del usuario en GitHub

    Contexto: userId=${userId}

    Responde SOLO con JSON, SIN markdown, SIN formato, SIN texto adicional:
    {
      "action": "create|update|list|detail|delete",
      "entity": "workspace|project|objective|github_repo",
      "data": { campos necesarios para la acción },
      "search": "término de búsqueda si aplica"
    }`;

    const result = await this.gemini.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);

    const cleaned = result.reply.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se pudo interpretar la solicitud');

    return JSON.parse(jsonMatch[0]);
  }

  private async execute(userId: string, parsed: { action: string; entity: string; data: Record<string, unknown>; search?: string }) {
    const aliases: Record<string, string> = { 
      task: 'objective', 
      tarea: 'objective',
      repo: 'github_repo',
      repositorio: 'github_repo',
      repositorios: 'github_repo',
    };
    const entity = aliases[parsed.entity] || parsed.entity;
    const { action, data } = parsed;

    if (action === 'list') {
      if (entity === 'workspace') {
        const list = await this.workspaces.findByUser(userId);
        return { type: 'list', entity: 'workspace', items: list, message: `Tienes ${list.length} workspace${list.length !== 1 ? 's' : ''}` };
      }
      if (entity === 'project') {
        const list = await this.projects.findByWorkspaceId(data.workspaceId as string);
        return { type: 'list', entity: 'project', items: list, message: `Tienes ${list.length} proyecto${list.length !== 1 ? 's' : ''}` };
      }
      if (entity === 'objective') {
        const list = await this.objectives.findByProjectId(data.projectId as string);
        return { type: 'list', entity: 'objective', items: list, message: `Tienes ${list.length} objetivo${list.length !== 1 ? 's' : ''}` };
      }
      if (entity === 'github_repo') {
        try {
          const username = data.username as string | undefined;
          const list = await this.repositories.fetchGitHubRepositories(username);
          return { type: 'list', entity: 'github_repo', items: list, message: `Tienes ${list.length} repositorio${list.length !== 1 ? 's' : ''} en GitHub` };
        } catch (e: unknown) {
          const err = e as Error;
          return { type: 'error', message: `No se pudieron obtener los repositorios de GitHub: ${err.message}` };
        }
      }

    }

    if (action === 'create') {
      if (entity === 'workspace') {
        const ws = await this.workspaces.create(data.name as string, userId, data.description as string);
        return { type: 'created', entity: 'workspace', item: ws, message: `Workspace "${ws.name}" creado exitosamente` };
      }
      if (entity === 'project') {
        let workspaceId = data.workspaceId as string;
        if (!workspaceId) {
          const wss = await this.workspaces.findByUser(userId);
          if (wss.length === 0) return { type: 'message', message: 'Primero creá un workspace. Decí: "crea un workspace llamado [nombre]"' };
          workspaceId = wss[0].id;
        }
        const proj = await this.projects.create(workspaceId, data.name as string, data.description as string);
        return { type: 'created', entity: 'project', item: proj, message: `Proyecto "${proj.name}" creado exitosamente` };
      }
      if (entity === 'objective') {
        const title = (data.title || data.name) as string;
        if (!title || !title.trim()) {
          return { type: 'error', message: 'Se requiere un título para el objetivo. Por ejemplo: "crea un objetivo llamado Implementar OAuth"' };
        }
        let projId = data.projectId as string;
        if (!projId) {
          const wss = await this.workspaces.findByUser(userId);
          if (wss.length === 0) return { type: 'message', message: 'Primero creá un workspace. Decí: "crea un workspace llamado [nombre]"' };
          const allProjects = [];
          for (const ws of wss) {
            const ps = await this.projects.findByWorkspaceId(ws.id);
            allProjects.push(...ps);
          }
          if (allProjects.length === 0) return { type: 'message', message: 'Tenés workspace pero no tenés ningún proyecto. Decí: "crea un proyecto llamado [nombre]" para poder agregar objetivos.' };
          projId = allProjects[0].id;
        }
        try {
          const obj = await this.objectives.create(projId, title.trim(), data.description as string, data.tags as string[]);
          return { type: 'created', entity: 'objective', item: obj, message: `Objetivo "${obj.title}" creado exitosamente` };
        } catch (e: unknown) {
          const err = e as Error;
          return { type: 'error', message: `No pude crear el objetivo: ${err.message}` };
        }
      }
    }

    if (action === 'update' && entity === 'objective') {
      const updated = await this.objectives.updateStatus(
        data.id as string,
        data.status as any,
        (data.progress as number) ?? 0,
        data.summary as string,
        data.risks as string[],
        data.blockers as string[],
        data.nextSteps as string[],
      );
      return { type: 'updated', entity: 'objective', item: updated, message: `Objetivo "${updated.title}" actualizado` };
    }

    if (action === 'detail') {
      if (entity === 'workspace') {
        const item = await this.workspaces.findById(data.id as string);
        return { type: 'detail', entity: 'workspace', item };
      }
      if (entity === 'project') {
        const item = await this.projects.findById(data.id as string);
        return { type: 'detail', entity: 'project', item };
      }
      if (entity === 'objective') {
        const item = await this.objectives.findById(data.id as string);
        return { type: 'detail', entity: 'objective', item };
      }
    }

    if (action === 'delete') {
      if (entity === 'objective') {
        await this.objectives.delete(data.id as string);
        return { type: 'deleted', entity: 'objective', message: 'Objetivo eliminado' };
      }
      if (entity === 'project') {
        await this.projects.delete(data.id as string);
        return { type: 'deleted', entity: 'project', message: 'Proyecto eliminado' };
      }
      if (entity === 'workspace') {
        await this.workspaces.archive(data.id as string);
        return { type: 'deleted', entity: 'workspace', message: 'Workspace archivado' };
      }
    }

    throw new Error(`No se pudo ejecutar: ${action} ${entity}`);
  }
}
