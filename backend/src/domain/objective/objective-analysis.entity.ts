export interface IObjectiveAnalysis {
  id: string;
  objectiveId: string;
  status: string;
  progress: number;
  summary: string;
  risks: string[];
  blockers: string[];
  nextSteps: string[];
  relevantCommits: string[];
  relevantPullRequests: string[];
  relevantIssues: string[];
  analyzedAt: Date;
  modelVersion: string;
}

export class ObjectiveAnalysis implements IObjectiveAnalysis {
  constructor(
    public readonly id: string,
    public readonly objectiveId: string,
    public readonly status: string,
    public readonly progress: number,
    public readonly summary: string,
    public readonly risks: string[],
    public readonly blockers: string[],
    public readonly nextSteps: string[],
    public readonly relevantCommits: string[],
    public readonly relevantPullRequests: string[],
    public readonly relevantIssues: string[],
    public readonly analyzedAt: Date,
    public readonly modelVersion: string,
  ) {}
}
