import { TimelineEvent, TimelineEventType } from './timeline.entity';

export const TIMELINE_REPOSITORY = 'TIMELINE_REPOSITORY';

export interface ITimelineRepository {
  findById(id: string): Promise<TimelineEvent | null>;
  findByProjectId(projectId: string): Promise<TimelineEvent[]>;
  findByProjectIdAndType(projectId: string, type: TimelineEventType): Promise<TimelineEvent[]>;
  findByProjectIdPaginated(projectId: string, limit: number, offset: number): Promise<TimelineEvent[]>;
  save(event: TimelineEvent): Promise<void>;
  delete(id: string): Promise<void>;
}
