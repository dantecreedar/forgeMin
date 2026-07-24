import { Injectable } from '@nestjs/common';
import { IProjectRepository } from '../../domain/project/project.repository.interface';
import { Project, IProject } from '../../domain/project/project.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreProjectRepository extends FirestoreRepository<Project> implements IProjectRepository {
  protected collectionName = 'projects';

  async findByWorkspaceId(workspaceId: string): Promise<Project[]> {
    return this.findByField('workspaceId', workspaceId);
  }
}
