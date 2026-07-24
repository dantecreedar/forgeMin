import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IGitHubClient, GITHUB_CLIENT } from '../../infrastructure/github/github-client.interface';
import { IRepositoryRepository, REPOSITORY_REPOSITORY } from '../../domain/repository/repository.repository.interface';
import { ITimelineRepository, TIMELINE_REPOSITORY } from '../../domain/timeline/timeline.repository.interface';
import { TimelineEvent, TimelineEventType } from '../../domain/timeline/timeline.entity';
import { GitHubRepository } from '../../domain/repository/repository.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SyncEngineService {
  constructor(
    @Inject(GITHUB_CLIENT)
    private readonly githubClient: IGitHubClient,
    @Inject(REPOSITORY_REPOSITORY)
    private readonly repoRepository: IRepositoryRepository,
    @Inject(TIMELINE_REPOSITORY)
    private readonly timelineRepository: ITimelineRepository,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAllRepositories(): Promise<void> {
    const repos = await this.repoRepository.findAllActive();
    for (const repo of repos) {
      await this.syncRepository(repo);
    }
  }

  async syncRepository(repo: GitHubRepository): Promise<void> {
    try {
      const branches = await this.githubClient.getBranches(repo.owner, repo.name);
      const since = repo.lastSyncAt;

      for (const branch of repo.monitoredBranches) {
        const commits = await this.githubClient.getCommits(repo.owner, repo.name, branch, since);
        for (const commit of commits) {
          await this.timelineRepository.save(
            new TimelineEvent(
              uuidv4(), repo.projectId, TimelineEventType.COMMIT,
              commit.message.split('\n')[0], commit.message,
              commit.sha, 'commit', { author: commit.authorName, branch },
              commit.authorDate, new Date(),
            ),
          );
        }
      }

      const prs = await this.githubClient.getPullRequests(repo.owner, repo.name);
      for (const pr of prs) {
        const eventType = pr.state === 'merged' ? TimelineEventType.PULL_REQUEST_MERGED
          : pr.state === 'closed' ? TimelineEventType.PULL_REQUEST_CLOSED
          : TimelineEventType.PULL_REQUEST_OPENED;

        await this.timelineRepository.save(
          new TimelineEvent(
            uuidv4(), repo.projectId, eventType,
            pr.title, pr.description,
            String(pr.githubId), 'pull_request',
            { author: pr.authorName, branch: pr.branch, baseBranch: pr.baseBranch },
            pr.createdAt, new Date(),
          ),
        );
      }

      const updatedRepo = repo.markSynced();
      await this.repoRepository.update(updatedRepo);
    } catch (error) {
      console.error(`Sync failed for ${repo.fullName}:`, error);
    }
  }

  async syncRepositoryById(repoId: string): Promise<void> {
    const repo = await this.repoRepository.findById(repoId);
    if (repo) await this.syncRepository(repo);
  }
}
