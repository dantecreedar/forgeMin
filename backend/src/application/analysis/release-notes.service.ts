import { Injectable, Inject } from '@nestjs/common';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { ReleaseNotes } from '../../domain/release/release-notes.entity';
import { IReleaseNotesRepository, RELEASE_NOTES_REPOSITORY } from '../../domain/release/release-notes.repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReleaseNotesEngineService {
  constructor(
    private readonly geminiService: GeminiService,
    @Inject(RELEASE_NOTES_REPOSITORY)
    private readonly releaseNotesRepository: IReleaseNotesRepository,
  ) {}

  async generate(
    projectId: string,
    version: string,
    tagName: string,
    commits: unknown[],
    pullRequests: unknown[],
    objectives: unknown[],
  ): Promise<ReleaseNotes> {
    const content = await this.geminiService.generateReleaseNotes(version, commits, pullRequests, objectives);

    const notes = new ReleaseNotes(
      uuidv4(), projectId, version, tagName,
      `Release ${version}`,
      content.summary,
      content.sections.map((s, i) => ({ title: s.title, items: s.items, order: i })),
      commits.map((c) => (c as Record<string, string>)['sha'] ?? ''),
      pullRequests.map((pr) => String((pr as Record<string, string>)['githubId'] ?? '')),
      objectives.map((o) => (o as Record<string, string>)['id'] ?? ''),
      'ai-engine',
      false, undefined, new Date(), new Date(),
    );

    await this.releaseNotesRepository.save(notes);
    return notes;
  }

  async publish(id: string): Promise<ReleaseNotes> {
    const notes = await this.releaseNotesRepository.findById(id);
    if (!notes) throw new Error('Release notes not found');
    const updated = notes.publish();
    await this.releaseNotesRepository.update(updated);
    return updated;
  }
}
