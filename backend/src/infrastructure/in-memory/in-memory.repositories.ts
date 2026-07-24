import { Injectable } from '@nestjs/common';
import { IAuthRepository } from '../../domain/authentication/auth.repository.interface';
import { User } from '../../domain/authentication/user.entity';
import { IWorkspaceRepository } from '../../domain/workspace/workspace.repository.interface';
import { Workspace } from '../../domain/workspace/workspace.entity';
import { IProjectRepository } from '../../domain/project/project.repository.interface';
import { Project } from '../../domain/project/project.entity';
import { IRepositoryRepository } from '../../domain/repository/repository.repository.interface';
import { GitHubRepository } from '../../domain/repository/repository.entity';
import { IObjectiveRepository } from '../../domain/objective/objective.repository.interface';
import { Objective } from '../../domain/objective/objective.entity';
import { ITimelineRepository } from '../../domain/timeline/timeline.repository.interface';
import { TimelineEvent } from '../../domain/timeline/timeline.entity';
import { IReportRepository } from '../../domain/report/report.repository.interface';
import { Report } from '../../domain/report/report.entity';
import { IReleaseNotesRepository } from '../../domain/release/release-notes.repository.interface';
import { ReleaseNotes } from '../../domain/release/release-notes.entity';
import { ISprintRepository } from '../../domain/sprint/sprint.repository.interface';
import { Sprint } from '../../domain/sprint/sprint.entity';
import { INotificationRepository } from '../../domain/notification/notification.repository.interface';
import { Notification } from '../../domain/notification/notification.entity';
import { IKnowledgeRepository } from '../../domain/knowledge/knowledge.repository.interface';
import { KnowledgeEntry } from '../../domain/knowledge/knowledge.entity';

// Base class for all in-memory repositories
class InMemoryRepo<T extends { id: string }> {
  protected store = new Map<string, T>();

  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.store.values());
  }

  async save(entity: T): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async update(entity: T): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  protected findBy(field: keyof T, value: unknown): T[] {
    return Array.from(this.store.values()).filter((e) => e[field] === value);
  }
}

@Injectable()
export class InMemoryAuthRepo extends InMemoryRepo<User> implements IAuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return this.findBy('email', email)[0] ?? null;
  }
}

@Injectable()
export class InMemoryWorkspaceRepo extends InMemoryRepo<Workspace> implements IWorkspaceRepository {
  async findByOwnerId(ownerId: string): Promise<Workspace[]> {
    return this.findBy('ownerId', ownerId);
  }
  async findByMemberId(userId: string): Promise<Workspace[]> {
    return Array.from(this.store.values()).filter((w) => w.memberIds.includes(userId));
  }
}

@Injectable()
export class InMemoryProjectRepo extends InMemoryRepo<Project> implements IProjectRepository {
  async findByWorkspaceId(workspaceId: string): Promise<Project[]> {
    return this.findBy('workspaceId', workspaceId);
  }
}

@Injectable()
export class InMemoryRepoRepo extends InMemoryRepo<GitHubRepository> implements IRepositoryRepository {
  async findByProjectId(projectId: string): Promise<GitHubRepository[]> {
    return this.findBy('projectId', projectId);
  }
  async findByFullName(fullName: string): Promise<GitHubRepository | null> {
    return this.findBy('fullName', fullName)[0] ?? null;
  }
  async findAllActive(): Promise<GitHubRepository[]> {
    return this.findBy('isActive', true);
  }
}

@Injectable()
export class InMemoryObjectiveRepo extends InMemoryRepo<Objective> implements IObjectiveRepository {
  async findByProjectId(projectId: string): Promise<Objective[]> {
    return this.findBy('projectId', projectId);
  }
  async findByStatus(status: string): Promise<Objective[]> {
    return this.findBy('status', status);
  }
}

@Injectable()
export class InMemoryTimelineRepo extends InMemoryRepo<TimelineEvent> implements ITimelineRepository {
  async findByProjectId(projectId: string): Promise<TimelineEvent[]> {
    return this.findBy('projectId', projectId);
  }
  async findByProjectIdAndType(projectId: string, type: string): Promise<TimelineEvent[]> {
    return this.findBy('projectId', projectId).filter((e) => e.type === type);
  }
  async findByProjectIdPaginated(projectId: string, limit: number, offset: number): Promise<TimelineEvent[]> {
    return this.findBy('projectId', projectId).slice(offset, offset + limit);
  }
}

@Injectable()
export class InMemoryReportRepo extends InMemoryRepo<Report> implements IReportRepository {
  async findByProjectId(projectId: string): Promise<Report[]> {
    return this.findBy('projectId', projectId);
  }
  async findByProjectIdAndType(projectId: string, type: string): Promise<Report[]> {
    return this.findBy('projectId', projectId).filter((r) => r.type === type);
  }
}

@Injectable()
export class InMemoryReleaseNotesRepo extends InMemoryRepo<ReleaseNotes> implements IReleaseNotesRepository {
  async findByProjectId(projectId: string): Promise<ReleaseNotes[]> {
    return this.findBy('projectId', projectId);
  }
  async findByVersion(projectId: string, version: string): Promise<ReleaseNotes | null> {
    return this.findBy('projectId', projectId).find((r) => r.version === version) ?? null;
  }
}

@Injectable()
export class InMemorySprintRepo extends InMemoryRepo<Sprint> implements ISprintRepository {
  async findByProjectId(projectId: string): Promise<Sprint[]> {
    return this.findBy('projectId', projectId);
  }
  async findActiveByProjectId(projectId: string): Promise<Sprint | null> {
    return this.findBy('projectId', projectId).find((s) => s.isActive) ?? null;
  }
}

@Injectable()
export class InMemoryNotificationRepo extends InMemoryRepo<Notification> implements INotificationRepository {
  async findByProjectId(projectId: string): Promise<Notification[]> {
    return this.findBy('projectId', projectId);
  }
  async findByWorkspaceId(workspaceId: string): Promise<Notification[]> {
    return this.findBy('workspaceId', workspaceId);
  }
  async findPending(): Promise<Notification[]> {
    return this.findBy('isSent', false);
  }
}

@Injectable()
export class InMemoryKnowledgeRepo extends InMemoryRepo<KnowledgeEntry> implements IKnowledgeRepository {
  async findByProjectId(projectId: string): Promise<KnowledgeEntry[]> {
    return this.findBy('projectId', projectId);
  }
  async search(projectId: string, query: string): Promise<KnowledgeEntry[]> {
    return this.findBy('projectId', projectId).filter((e) => e.question.includes(query));
  }
}
