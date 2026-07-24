export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  TEAMS = 'teams',
  IN_APP = 'in_app',
}

export enum NotificationEvent {
  OBJECTIVE_COMPLETED = 'objective_completed',
  REPORT_GENERATED = 'report_generated',
  BRANCH_STALLED = 'branch_stalled',
  PR_BLOCKED = 'pr_blocked',
  RELEASE_PUBLISHED = 'release_published',
  MILESTONE_REACHED = 'milestone_reached',
  RISK_DETECTED = 'risk_detected',
}

export interface INotification {
  id: string;
  projectId: string;
  workspaceId: string;
  event: NotificationEvent;
  channel: NotificationChannel[];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isSent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

export class Notification implements INotification {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly workspaceId: string,
    public readonly event: NotificationEvent,
    public readonly channel: NotificationChannel[],
    public readonly title: string,
    public readonly message: string,
    public readonly metadata: Record<string, unknown> | undefined,
    public readonly isSent: boolean,
    public readonly sentAt: Date | undefined,
    public readonly createdAt: Date,
  ) {}

  markSent(): Notification {
    return new Notification(
      this.id, this.projectId, this.workspaceId, this.event,
      this.channel, this.title, this.message, this.metadata,
      true, new Date(), this.createdAt,
    );
  }
}
