import { GitHubRepository } from './repository.entity';

export const REPOSITORY_REPOSITORY = 'REPOSITORY_REPOSITORY';

export interface IRepositoryRepository {
  findById(id: string): Promise<GitHubRepository | null>;
  findByProjectId(projectId: string): Promise<GitHubRepository[]>;
  findByFullName(fullName: string): Promise<GitHubRepository | null>;
  findAll(): Promise<GitHubRepository[]>;
  findAllActive(): Promise<GitHubRepository[]>;
  save(repo: GitHubRepository): Promise<void>;
  update(repo: GitHubRepository): Promise<void>;
  delete(id: string): Promise<void>;
}
