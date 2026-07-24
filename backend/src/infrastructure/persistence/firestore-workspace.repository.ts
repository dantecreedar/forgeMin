import { Injectable } from '@nestjs/common';
import { getFirestore } from 'firebase-admin/firestore';
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
    const snapshot = await getFirestore()
      .collection(this.collectionName)
      .where('memberIds', 'array-contains', userId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Workspace));
  }
}
