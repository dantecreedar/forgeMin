import { Injectable } from '@nestjs/common';
import { IRepositoryRepository } from '../../domain/repository/repository.repository.interface';
import { GitHubRepository, IGitHubRepository } from '../../domain/repository/repository.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreRepositoryRepository extends FirestoreRepository<GitHubRepository> implements IRepositoryRepository {
  protected collectionName = 'repositories';

  async findByProjectId(projectId: string): Promise<GitHubRepository[]> {
    return this.findByField('projectId', projectId);
  }

  async findByFullName(fullName: string): Promise<GitHubRepository | null> {
    const repos = await this.findByField('fullName', fullName);
    return repos.length > 0 ? repos[0] : null;
  }

  async findAllActive(): Promise<GitHubRepository[]> {
    return this.findByField('isActive', true);
  }
}
