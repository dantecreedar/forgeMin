export interface IKnowledgeEntry {
  id: string;
  projectId: string;
  question: string;
  answer: string;
  sourceType: string;
  sourceId: string;
  relevance: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class KnowledgeEntry implements IKnowledgeEntry {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly question: string,
    public readonly answer: string,
    public readonly sourceType: string,
    public readonly sourceId: string,
    public readonly relevance: number,
    public readonly tags: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
