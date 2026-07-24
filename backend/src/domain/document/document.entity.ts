export interface IDocument {
  id: string;
  projectId: string;
  repoId?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  contentUrl?: string;
  uploadedAt: Date;
}

export class DocumentAttachment implements IDocument {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly fileName: string,
    public readonly fileType: string,
    public readonly fileSize?: number,
    public readonly contentUrl?: string,
    public readonly repoId?: string,
    public readonly uploadedAt: Date = new Date(),
  ) {}
}
