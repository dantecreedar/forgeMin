import { Injectable, Inject } from '@nestjs/common';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { IObjectiveRepository, OBJECTIVE_REPOSITORY } from '../../domain/objective/objective.repository.interface';
import { ITimelineRepository, TIMELINE_REPOSITORY } from '../../domain/timeline/timeline.repository.interface';
import { Objective, ObjectiveStatus } from '../../domain/objective/objective.entity';
import { ObjectiveAnalysis } from '../../domain/objective/objective-analysis.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AIEngineService {
  constructor(
    private readonly geminiService: GeminiService,
    @Inject(OBJECTIVE_REPOSITORY)
    private readonly objectiveRepository: IObjectiveRepository,
    @Inject(TIMELINE_REPOSITORY)
    private readonly timelineRepository: ITimelineRepository,
  ) {}

  async analyzeObjective(objectiveId: string): Promise<ObjectiveAnalysis> {
    const objective = await this.objectiveRepository.findById(objectiveId);
    if (!objective) throw new Error('Objective not found');

    const events = await this.timelineRepository.findByProjectId(objective.projectId);
    const commits = events.map((e) => ({
      title: e.title,
      description: e.description,
      metadata: e.metadata,
      date: e.occurredAt,
    }));


    const analysis = await this.geminiService.analyzeObjective(
      objective.title,
      commits,
      [],
      [],
    );

    const status = this.mapStatus(analysis.status);
    const updated = objective.updateStatus(
      status, analysis.progress, analysis.summary,
      analysis.risks, analysis.blockers, analysis.nextSteps,
    );
    await this.objectiveRepository.update(updated);

    return new ObjectiveAnalysis(
      uuidv4(), objectiveId, analysis.status, analysis.progress,
      analysis.summary, analysis.risks, analysis.blockers,
      analysis.nextSteps, [], [], [], new Date(), 'gemini-2.0-flash',
    );
  }


  async analyzeAllObjectives(projectId: string): Promise<ObjectiveAnalysis[]> {
    const objectives = await this.objectiveRepository.findByProjectId(projectId);
    const results: ObjectiveAnalysis[] = [];
    for (const objective of objectives) {
      const analysis = await this.analyzeObjective(objective.id);
      results.push(analysis);
    }
    return results;
  }

  async generateReport(projectId: string, type: string): Promise<{ summary: string; sections: Array<{ title: string; content: string }> }> {
    const objectives = await this.objectiveRepository.findByProjectId(projectId);
    return this.geminiService.generateReport(type, objectives, [], []);
  }

  private mapStatus(aiStatus: string): ObjectiveStatus {
    const mapping: Record<string, ObjectiveStatus> = {
      pending: ObjectiveStatus.PENDING,
      in_progress: ObjectiveStatus.IN_PROGRESS,
      partial: ObjectiveStatus.PARTIAL,
      completed: ObjectiveStatus.COMPLETED,
      validated: ObjectiveStatus.VALIDATED,
      released: ObjectiveStatus.RELEASED,
      blocked: ObjectiveStatus.BLOCKED,
    };
    return mapping[aiStatus.toLowerCase()] ?? ObjectiveStatus.PENDING;
  }
}
