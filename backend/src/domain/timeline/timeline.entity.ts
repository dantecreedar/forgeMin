export enum TimelineEventType {
  PROJECT_CREATED = 'project_created',
  OBJECTIVE_ADDED = 'objective_added',
  OBJECTIVE_STATUS_CHANGED = 'objective_status_changed',
  COMMIT = 'commit',
  PULL_REQUEST_OPENED = 'pull_request_opened',
  PULL_REQUEST_MERGED = 'pull_request_merged',
  PULL_REQUEST_CLOSED = 'pull_request_closed',
  RELEASE = 'release',
  DEPLOY = 'deploy',
  REPORT_GENERATED = 'report_generated',
  BRANCH_CREATED = 'branch_created',
  ISSUE_OPENED = 'issue_opened',
  ISSUE_CLOSED = 'issue_closed',
  MILESTONE_REACHED = 'milestone_reached',
}

export interface ITimelineEvent {
  id: string;
  projectId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

export class TimelineEvent implements ITimelineEvent {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly type: TimelineEventType,
    public readonly title: string,
    public readonly description: string | undefined,
    public readonly referenceId: string | undefined,
    public readonly referenceType: string | undefined,
    public readonly metadata: Record<string, unknown> | undefined,
    public readonly occurredAt: Date,
    public readonly createdAt: Date,
  ) {}
}
