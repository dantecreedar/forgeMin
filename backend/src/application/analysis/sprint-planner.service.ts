import { Injectable, Inject } from '@nestjs/common';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { Sprint, ISprintTask } from '../../domain/sprint/sprint.entity';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../domain/sprint/sprint.repository.interface';
import { IObjectiveRepository, OBJECTIVE_REPOSITORY } from '../../domain/objective/objective.repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SprintPlannerService {
  constructor(
    private readonly geminiService: GeminiService,
    @Inject(SPRINT_REPOSITORY)
    private readonly sprintRepository: ISprintRepository,
    @Inject(OBJECTIVE_REPOSITORY)
    private readonly objectiveRepository: IObjectiveRepository,
  ) {}

  async planSprint(projectId: string, objectiveIds: string[], name: string, goal?: string): Promise<Sprint> {
    const objectives = await Promise.all(
      objectiveIds.map((id) => this.objectiveRepository.findById(id)),
    );

    const validObjectives = objectives.filter(Boolean);
    const plan = await this.geminiService.planSprint(
      validObjectives.map((o) => ({ title: o!.title, description: o!.description })),
    );

    const tasks: ISprintTask[] = plan.tasks.map((t, i) => ({
      id: uuidv4(),
      objectiveId: objectiveIds[i] ?? '',
      title: t.title,
      category: t.category as ISprintTask['category'],
      estimatedHours: t.estimatedHours,
      dependencies: t.dependencies,
      isCompleted: false,
    }));

    const sprint = new Sprint(
      uuidv4(), projectId, name, goal,
      objectiveIds, tasks,
      undefined, undefined,
      false, false, new Date(), new Date(),
    );

    await this.sprintRepository.save(sprint);
    return sprint;
  }
}
