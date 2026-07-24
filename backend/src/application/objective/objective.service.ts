import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IObjectiveRepository, OBJECTIVE_REPOSITORY } from '../../domain/objective/objective.repository.interface';
import { Objective, ObjectiveStatus, IObjective } from '../../domain/objective/objective.entity';
import { ProjectApplicationService } from '../project/project.service';
import { WorkspaceApplicationService } from '../workspace/workspace.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ObjectiveApplicationService {
  constructor(
    @Inject(OBJECTIVE_REPOSITORY)
    private readonly objectiveRepository: IObjectiveRepository,
    private readonly projectService: ProjectApplicationService,
    private readonly workspaceService: WorkspaceApplicationService,
  ) {}

  async create(projectId: string, title: string, description?: string, tags?: string[]): Promise<Objective> {
    if (!projectId || !projectId.trim()) throw new BadRequestException('Se requiere un projectId válido.');
    const project = await this.projectService.findById(projectId);
    const objective = new Objective(
      uuidv4(), projectId, title, description,
      ObjectiveStatus.PENDING, 0, undefined,
      undefined, undefined, undefined, tags ?? [],
      new Date(), new Date(),
    );
    await this.objectiveRepository.save(objective);
    await this.projectService.addObjective(projectId, objective.id);
    return objective;
  }

  async findById(id: string): Promise<Objective> {
    const objective = await this.objectiveRepository.findById(id);
    if (!objective) throw new NotFoundException('Objective not found');
    return objective;
  }

  async findByProjectId(projectId: string): Promise<Objective[]> {
    return this.objectiveRepository.findByProjectId(projectId);
  }

  async findByUserId(userId: string): Promise<Objective[]> {
    const workspaces = await this.workspaceService.findByUser(userId);
    const projectIds: string[] = [];
    for (const ws of workspaces) {
      const projects = await this.projectService.findByWorkspaceId(ws.id);
      projectIds.push(...projects.map(p => p.id));
    }
    const objectives: Objective[] = [];
    for (const pid of projectIds) {
      const objs = await this.findByProjectId(pid);
      objectives.push(...objs);
    }
    return objectives;
  }

  async updateStatus(
    id: string,
    status: ObjectiveStatus,
    progress: number,
    summary?: string,
    risks?: string[],
    blockers?: string[],
    nextSteps?: string[],
  ): Promise<Objective> {
    const objective = await this.findById(id);
    const updated = objective.updateStatus(status, progress, summary, risks, blockers, nextSteps);
    await this.objectiveRepository.update(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.objectiveRepository.delete(id);
  }
}
