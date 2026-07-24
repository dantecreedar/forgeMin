import { Injectable, Inject } from '@nestjs/common';
import { ITimelineRepository, TIMELINE_REPOSITORY } from '../../domain/timeline/timeline.repository.interface';
import { TimelineEvent, TimelineEventType } from '../../domain/timeline/timeline.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TimelineEngineService {
  constructor(
    @Inject(TIMELINE_REPOSITORY)
    private readonly timelineRepository: ITimelineRepository,
  ) {}

  async recordEvent(
    projectId: string,
    type: TimelineEventType,
    title: string,
    description?: string,
    referenceId?: string,
    referenceType?: string,
    metadata?: Record<string, unknown>,
  ): Promise<TimelineEvent> {
    const event = new TimelineEvent(
      uuidv4(), projectId, type, title, description,
      referenceId, referenceType, metadata, new Date(), new Date(),
    );
    await this.timelineRepository.save(event);
    return event;
  }

  async getProjectTimeline(projectId: string, limit = 50, offset = 0): Promise<TimelineEvent[]> {
    return this.timelineRepository.findByProjectIdPaginated(projectId, limit, offset);
  }

  async getEventsByType(projectId: string, type: TimelineEventType): Promise<TimelineEvent[]> {
    return this.timelineRepository.findByProjectIdAndType(projectId, type);
  }
}
