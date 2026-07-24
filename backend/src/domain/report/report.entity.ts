export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  MARKDOWN = 'markdown',
  HTML = 'html',
}

export interface IReportSection {
  title: string;
  content: string;
  order: number;
}

export interface IReport {
  id: string;
  projectId: string;
  type: ReportType;
  format: ReportFormat;
  title: string;
  summary: string;
  sections: IReportSection[];
  generatedBy: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class Report implements IReport {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly type: ReportType,
    public readonly format: ReportFormat,
    public readonly title: string,
    public readonly summary: string,
    public readonly sections: IReportSection[],
    public readonly generatedBy: string,
    public readonly dateRangeStart: Date,
    public readonly dateRangeEnd: Date,
    public readonly metadata: Record<string, unknown> | undefined,
    public readonly createdAt: Date,
  ) {}
}
