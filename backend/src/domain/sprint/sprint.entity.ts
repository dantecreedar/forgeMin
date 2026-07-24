export interface ISprintTask {
  id: string;
  objectiveId: string;
  title: string;
  category: 'backend' | 'frontend' | 'database' | 'tests' | 'documentation' | 'devops' | 'other';
  estimatedHours: number;
  dependencies: string[];
  isCompleted: boolean;
  assignee?: string;
}

export interface ISprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  objectiveIds: string[];
  tasks: ISprintTask[];
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Sprint implements ISprint {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly name: string,
    public readonly goal: string | undefined,
    public readonly objectiveIds: string[],
    public readonly tasks: ISprintTask[],
    public readonly startDate: Date | undefined,
    public readonly endDate: Date | undefined,
    public readonly isActive: boolean,
    public readonly isCompleted: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  activate(startDate: Date, endDate: Date): Sprint {
    return new Sprint(
      this.id, this.projectId, this.name, this.goal,
      this.objectiveIds, this.tasks, startDate, endDate,
      true, false, this.createdAt, new Date(),
    );
  }

  complete(): Sprint {
    return new Sprint(
      this.id, this.projectId, this.name, this.goal,
      this.objectiveIds, this.tasks, this.startDate, this.endDate,
      false, true, this.createdAt, new Date(),
    );
  }
}
