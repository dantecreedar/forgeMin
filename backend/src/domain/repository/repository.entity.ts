export interface IGitHubRepository {
  id: string;
  projectId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  monitoredBranches: string[];
  webhookId?: string;
  webhookSecret?: string;
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class GitHubRepository implements IGitHubRepository {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly owner: string,
    public readonly name: string,
    public readonly fullName: string,
    public readonly defaultBranch: string,
    public readonly monitoredBranches: string[],
    public readonly webhookId: string | undefined,
    public readonly webhookSecret: string | undefined,
    public readonly isActive: boolean,
    public readonly lastSyncAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  addMonitoredBranch(branch: string): GitHubRepository {
    if (this.monitoredBranches.includes(branch)) return this;
    return new GitHubRepository(
      this.id, this.projectId, this.owner, this.name, this.fullName,
      this.defaultBranch, [...this.monitoredBranches, branch],
      this.webhookId, this.webhookSecret, this.isActive,
      this.lastSyncAt, this.createdAt, new Date(),
    );
  }

  markSynced(): GitHubRepository {
    return new GitHubRepository(
      this.id, this.projectId, this.owner, this.name, this.fullName,
      this.defaultBranch, this.monitoredBranches,
      this.webhookId, this.webhookSecret, this.isActive,
      new Date(), this.createdAt, new Date(),
    );
  }
}
