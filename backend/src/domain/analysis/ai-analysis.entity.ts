export interface IAIAnalysis {
  id: string;
  projectId: string;
  type: AnalysisType;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  modelVersion: string;
  tokensUsed?: number;
  latency?: number;
  createdAt: Date;
}

export enum AnalysisType {
  OBJECTIVE_STATUS = 'objective_status',
  OBJECTIVE_BREAKDOWN = 'objective_breakdown',
  REPORT_GENERATION = 'report_generation',
  RELEASE_NOTES = 'release_notes',
  SPRINT_PLANNING = 'sprint_planning',
  RISK_DETECTION = 'risk_detection',
  KNOWLEDGE_QUERY = 'knowledge_query',
  ROADMAP_GENERATION = 'roadmap_generation',
  CODE_SUMMARY = 'code_summary',
  TECHNICAL_DEBT = 'technical_debt',
}

export class AIAnalysis implements IAIAnalysis {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly type: AnalysisType,
    public readonly input: Record<string, unknown>,
    public readonly output: Record<string, unknown>,
    public readonly modelVersion: string,
    public readonly tokensUsed: number | undefined,
    public readonly latency: number | undefined,
    public readonly createdAt: Date,
  ) {}
}
