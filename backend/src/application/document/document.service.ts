import { Injectable, Inject } from '@nestjs/common';
import { IDocumentRepository, DOCUMENT_REPOSITORY } from '../../domain/document/document.repository.interface';
import { DocumentAttachment } from '../../domain/document/document.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentApplicationService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: IDocumentRepository,
  ) {}

  async create(
    projectId: string,
    fileName: string,
    fileType: string,
    fileSize?: number,
    contentUrl?: string,
    repoId?: string,
  ): Promise<DocumentAttachment> {
    const doc = new DocumentAttachment(
      uuidv4(),
      projectId,
      fileName,
      fileType,
      fileSize,
      contentUrl,
      repoId,
      new Date(),
    );
    await this.documentRepo.save(doc);
    return doc;
  }

  async findByProjectId(projectId: string): Promise<DocumentAttachment[]> {
    return this.documentRepo.findByProjectId(projectId);
  }

  async delete(id: string): Promise<void> {
    await this.documentRepo.delete(id);
  }
}
