import { Injectable } from '@nestjs/common';
import { IProjectRepository } from '../../domain/project/project.repository.interface';
import { Project, IProject } from '../../domain/project/project.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreProjectRepository extends FirestoreRepository<Project> implements IProjectRepository {
  protected collectionName = 'projects';

  protected override toEntity(docData: any): Project {
    if (!docData) return docData;
    const parseDate = (d: any) => (d?.toDate ? d.toDate() : d ? new Date(d) : new Date());
    return new Project(
      docData.id,
      docData.workspaceId,
      docData.name,
      docData.description,
      docData.repositoryIds || [],
      docData.objectiveIds || [],
      parseDate(docData.createdAt),
      parseDate(docData.updatedAt),
      docData.isArchived ?? false,
    );
  }

  async findByWorkspaceId(workspaceId: string): Promise<Project[]> {
    return this.findByField('workspaceId', workspaceId);
  }
}
