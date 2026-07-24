export interface IWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export class Workspace implements IWorkspace {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly ownerId: string,
    public readonly memberIds: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly isActive: boolean,
  ) {}

  addMember(userId: string): Workspace {
    if (this.memberIds.includes(userId)) return this;
    return new Workspace(
      this.id, this.name, this.description, this.ownerId,
      [...this.memberIds, userId], this.createdAt, new Date(), this.isActive,
    );
  }

  removeMember(userId: string): Workspace {
    return new Workspace(
      this.id, this.name, this.description, this.ownerId,
      this.memberIds.filter((id) => id !== userId),
      this.createdAt, new Date(), this.isActive,
    );
  }

  archive(): Workspace {
    return new Workspace(
      this.id, this.name, this.description, this.ownerId,
      this.memberIds, this.createdAt, new Date(), false,
    );
  }
}
