import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { DocumentApplicationService } from '../../application/document/document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentApplicationService) {}

  @Post()
  async create(
    @Body('projectId') projectId: string,
    @Body('fileName') fileName: string,
    @Body('fileType') fileType: string,
    @Body('fileSize') fileSize?: number,
    @Body('contentUrl') contentUrl?: string,
    @Body('repoId') repoId?: string,
  ) {
    const document = await this.documentService.create(projectId, fileName, fileType, fileSize, contentUrl, repoId);
    return { document };
  }

  @Get('project/:projectId')
  async findByProjectId(@Param('projectId') projectId: string) {
    const documents = await this.documentService.findByProjectId(projectId);
    return { documents };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.documentService.delete(id);
    return { success: true };
  }
}
