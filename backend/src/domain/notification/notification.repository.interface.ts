import { Notification } from './notification.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByProjectId(projectId: string): Promise<Notification[]>;
  findByWorkspaceId(workspaceId: string): Promise<Notification[]>;
  findPending(): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
  delete(id: string): Promise<void>;
}
