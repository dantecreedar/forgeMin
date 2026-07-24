import { Injectable } from '@nestjs/common';
import { IReleaseNotesRepository } from '../../domain/release/release-notes.repository.interface';
import { ReleaseNotes, IReleaseNotes } from '../../domain/release/release-notes.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreReleaseNotesRepository extends FirestoreRepository<ReleaseNotes> implements IReleaseNotesRepository {
  protected collectionName = 'releaseNotes';

  async findByProjectId(projectId: string): Promise<ReleaseNotes[]> {
    return this.findByField('projectId', projectId);
  }

  async findByVersion(projectId: string, version: string): Promise<ReleaseNotes | null> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .where('version', '==', version)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ReleaseNotes;
  }
}
