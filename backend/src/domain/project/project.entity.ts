export interface IProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  repositoryIds: string[];
  objectiveIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

export class Project implements IProject {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly repositoryIds: string[],
    public readonly objectiveIds: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly isArchived: boolean,
  ) {}

  addRepository(repoId: string): Project {
    if (this.repositoryIds.includes(repoId)) return this;
    return new Project(
      this.id, this.workspaceId, this.name, this.description,
      [...this.repositoryIds, repoId], this.objectiveIds,
      this.createdAt, new Date(), this.isArchived,
    );
  }

  addObjective(objectiveId: string): Project {
    if (this.objectiveIds.includes(objectiveId)) return this;
    return new Project(
      this.id, this.workspaceId, this.name, this.description,
      this.repositoryIds, [...this.objectiveIds, objectiveId],
      this.createdAt, new Date(), this.isArchived,
    );
  }

  update(data: { name?: string; description?: string }): Project {
    return new Project(
      this.id, this.workspaceId,
      data.name ?? this.name,
      data.description !== undefined ? data.description : this.description,
      this.repositoryIds, this.objectiveIds,
      this.createdAt, new Date(), this.isArchived,
    );
  }

  archive(): Project {
    return new Project(
      this.id, this.workspaceId, this.name, this.description,
      this.repositoryIds, this.objectiveIds,
      this.createdAt, new Date(), true,
    );
  }
}
