import { Injectable, Inject } from '@nestjs/common';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notification/notification.repository.interface';
import { Notification, NotificationChannel, NotificationEvent } from '../../domain/notification/notification.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationEngineService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async sendNotification(
    projectId: string,
    workspaceId: string,
    event: NotificationEvent,
    title: string,
    message: string,
    channels: NotificationChannel[],
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = new Notification(
      uuidv4(), projectId, workspaceId, event,
      channels, title, message, metadata,
      false, undefined, new Date(),
    );

    await this.notificationRepository.save(notification);

    for (const channel of channels) {
      await this.deliver(notification, channel);
    }

    const sent = notification.markSent();
    await this.notificationRepository.update(sent);
    return sent;
  }

  private async deliver(notification: Notification, channel: NotificationChannel): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmail(notification);
        break;
      case NotificationChannel.SLACK:
        await this.sendSlack(notification);
        break;
      case NotificationChannel.DISCORD:
        await this.sendDiscord(notification);
        break;
      case NotificationChannel.TEAMS:
        await this.sendTeams(notification);
        break;
      case NotificationChannel.IN_APP:
        break;
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    console.log(`[Email] ${notification.title}: ${notification.message}`);
  }

  private async sendSlack(notification: Notification): Promise<void> {
    console.log(`[Slack] ${notification.title}: ${notification.message}`);
  }

  private async sendDiscord(notification: Notification): Promise<void> {
    console.log(`[Discord] ${notification.title}: ${notification.message}`);
  }

  private async sendTeams(notification: Notification): Promise<void> {
    console.log(`[Teams] ${notification.title}: ${notification.message}`);
  }
}
