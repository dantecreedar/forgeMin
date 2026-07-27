export enum OutreachChannel {
  GMAIL = 'GMAIL',
  LINKEDIN = 'LINKEDIN',
  CUSTOM_EMAIL = 'CUSTOM_EMAIL',
}

export enum LeadStatus {
  NEW = 'NEW',
  ENRICHED = 'ENRICHED',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CLOSED = 'CLOSED',
}

export interface CompanyContext {
  domain: string;
  industry?: string;
  employeeCount?: string;
  description?: string;
}

export interface LeadScore {
  score: number; // 0 - 100
  reasoning: string;
  keySynergies: string[];
}

export interface OutreachDraft {
  channel: OutreachChannel;
  subject?: string;
  body: string;
  generatedAt: Date;
}

export interface DripStep {
  stepNumber: number;
  delayDays: number;
  subject?: string;
  body: string;
  sentAt?: Date;
  status: 'PENDING' | 'SENT' | 'SKIPPED';
}

export interface LeadReply {
  id: string;
  receivedAt: Date;
  fromEmail: string;
  subject: string;
  body: string;
  aiSentiment?: 'INTERESTED' | 'NOT_INTERESTED' | 'MORE_INFO';
  aiSuggestedReply?: string;
}

export class Lead {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    public company: string,
    public role?: string,
    public linkedinUrl?: string,
    public status: LeadStatus = LeadStatus.NEW,
    public companyContext?: CompanyContext,
    public aiScore?: LeadScore,
    public drafts: OutreachDraft[] = [],
    public dripSequence: DripStep[] = [],
    public replies: LeadReply[] = [],
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}

export interface ILeadRepository {
  save(lead: Lead): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  findAll(): Promise<Lead[]>;
  update(lead: Lead): Promise<Lead>;
  delete(id: string): Promise<void>;
}
