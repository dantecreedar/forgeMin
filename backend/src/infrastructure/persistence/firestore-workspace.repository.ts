import { Injectable } from '@nestjs/common';
import { IWorkspaceRepository } from '../../domain/workspace/workspace.repository.interface';
import { Workspace, IWorkspace } from '../../domain/workspace/workspace.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreWorkspaceRepository extends FirestoreRepository<Workspace> implements IWorkspaceRepository {
  protected collectionName = 'workspaces';

  async findByOwnerId(ownerId: string): Promise<Workspace[]> {
    return this.findByField('ownerId', ownerId);
  }

  async findByMemberId(userId: string): Promise<Workspace[]> {
    return this.findByField('memberIds', userId);
  }
}
