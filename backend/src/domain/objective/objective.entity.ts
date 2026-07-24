export enum ObjectiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  VALIDATED = 'validated',
  RELEASED = 'released',
  BLOCKED = 'blocked',
}

export interface IObjective {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: ObjectiveStatus;
  progress: number;
  summary?: string;
  risks?: string[];
  blockers?: string[];
  nextSteps?: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Objective implements IObjective {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly title: string,
    public readonly description: string | undefined,
    public readonly status: ObjectiveStatus,
    public readonly progress: number,
    public readonly summary: string | undefined,
    public readonly risks: string[] | undefined,
    public readonly blockers: string[] | undefined,
    public readonly nextSteps: string[] | undefined,
    public readonly tags: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  updateStatus(
    status: ObjectiveStatus,
    progress: number,
    summary?: string,
    risks?: string[],
    blockers?: string[],
    nextSteps?: string[],
  ): Objective {
    return new Objective(
      this.id, this.projectId, this.title, this.description,
      status, progress, summary ?? this.summary,
      risks ?? this.risks, blockers ?? this.blockers,
      nextSteps ?? this.nextSteps, this.tags,
      this.createdAt, new Date(),
    );
  }
}
