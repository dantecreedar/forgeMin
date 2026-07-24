import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IRepositoryRepository, REPOSITORY_REPOSITORY } from '../../domain/repository/repository.repository.interface';
import { GitHubRepository } from '../../domain/repository/repository.entity';
import { ProjectApplicationService } from '../project/project.service';
import { IGitHubClient, GITHUB_CLIENT } from '../../infrastructure/github/github-client.interface';
import { IGitHubRepo } from '../../domain/repository/github-data.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RepositoryApplicationService {
  constructor(
    @Inject(REPOSITORY_REPOSITORY)
    private readonly repositoryRepository: IRepositoryRepository,
    @Inject(GITHUB_CLIENT)
    private readonly githubClient: IGitHubClient,
    private readonly projectService: ProjectApplicationService,
  ) {}

  async fetchGitHubRepositories(username?: string, userToken?: string, visibility?: 'all' | 'public' | 'private'): Promise<IGitHubRepo[]> {
    return this.githubClient.getUserRepositories(username, userToken, visibility);
  }



  async connect(projectId: string, owner: string, name: string, defaultBranch: string, monitoredBranches: string[]): Promise<GitHubRepository> {
    await this.projectService.findById(projectId);
    const existing = await this.repositoryRepository.findByProjectId(projectId);
    for (const oldRepo of existing) {
      await this.repositoryRepository.delete(oldRepo.id);
    }

    const repo = new GitHubRepository(
      uuidv4(), projectId, owner, name, `${owner}/${name}`,
      defaultBranch, monitoredBranches, undefined, undefined,
      true, undefined, new Date(), new Date(),
    );
    await this.repositoryRepository.save(repo);
    await this.projectService.addRepository(projectId, repo.id);
    return repo;
  }


  async findById(id: string): Promise<GitHubRepository> {
    const repo = await this.repositoryRepository.findById(id);
    if (!repo) throw new NotFoundException('Repository not found');
    return repo;
  }

  async findByProjectId(projectId: string): Promise<GitHubRepository[]> {
    return this.repositoryRepository.findByProjectId(projectId);
  }

  async addMonitoredBranch(id: string, branch: string): Promise<GitHubRepository> {
    const repo = await this.findById(id);
    const updated = repo.addMonitoredBranch(branch);
    await this.repositoryRepository.update(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repositoryRepository.delete(id);
  }
}

