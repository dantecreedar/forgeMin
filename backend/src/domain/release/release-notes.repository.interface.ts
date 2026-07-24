import { ReleaseNotes } from './release-notes.entity';

export const RELEASE_NOTES_REPOSITORY = 'RELEASE_NOTES_REPOSITORY';

export interface IReleaseNotesRepository {
  findById(id: string): Promise<ReleaseNotes | null>;
  findByProjectId(projectId: string): Promise<ReleaseNotes[]>;
  findByVersion(projectId: string, version: string): Promise<ReleaseNotes | null>;
  save(releaseNotes: ReleaseNotes): Promise<void>;
  update(releaseNotes: ReleaseNotes): Promise<void>;
  delete(id: string): Promise<void>;
}
