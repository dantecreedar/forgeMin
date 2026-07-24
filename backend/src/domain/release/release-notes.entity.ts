export interface IReleaseNotesSection {
  title: string;
  items: string[];
  order: number;
}

export interface IReleaseNotes {
  id: string;
  projectId: string;
  version: string;
  tagName: string;
  title: string;
  summary: string;
  sections: IReleaseNotesSection[];
  commits: string[];
  pullRequests: string[];
  objectives: string[];
  generatedBy: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ReleaseNotes implements IReleaseNotes {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly version: string,
    public readonly tagName: string,
    public readonly title: string,
    public readonly summary: string,
    public readonly sections: IReleaseNotesSection[],
    public readonly commits: string[],
    public readonly pullRequests: string[],
    public readonly objectives: string[],
    public readonly generatedBy: string,
    public readonly isPublished: boolean,
    public readonly publishedAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  publish(): ReleaseNotes {
    return new ReleaseNotes(
      this.id, this.projectId, this.version, this.tagName,
      this.title, this.summary, this.sections,
      this.commits, this.pullRequests, this.objectives,
      this.generatedBy, true, new Date(), this.createdAt, new Date(),
    );
  }
}
