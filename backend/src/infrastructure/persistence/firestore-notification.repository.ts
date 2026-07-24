import { Injectable } from '@nestjs/common';
import { INotificationRepository } from '../../domain/notification/notification.repository.interface';
import { Notification, INotification } from '../../domain/notification/notification.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreNotificationRepository extends FirestoreRepository<Notification> implements INotificationRepository {
  protected collectionName = 'notifications';

  async findByProjectId(projectId: string): Promise<Notification[]> {
    return this.findByField('projectId', projectId);
  }

  async findByWorkspaceId(workspaceId: string): Promise<Notification[]> {
    return this.findByField('workspaceId', workspaceId);
  }

  async findPending(): Promise<Notification[]> {
    return this.findByField('isSent', false);
  }
}
