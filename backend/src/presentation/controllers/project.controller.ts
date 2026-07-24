import { Controller, Get, Post, Patch, Body, Param, Delete } from '@nestjs/common';
import { ProjectApplicationService } from '../../application/project/project.service';
import { SyncEngineService } from '../../application/analysis/sync-engine.service';
import { AIEngineService } from '../../application/analysis/ai-engine.service';
import { RepositoryApplicationService } from '../../application/repository/repository.service';

import { Inject } from '@nestjs/common';
import { GITHUB_CLIENT, IGitHubClient } from '../../infrastructure/github/github-client.interface';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectApplicationService,
    private readonly syncEngineService: SyncEngineService,
    private readonly aiEngineService: AIEngineService,
    private readonly repositoryService: RepositoryApplicationService,
    @Inject(GITHUB_CLIENT) private readonly githubClient: IGitHubClient,
    private readonly geminiService: GeminiService,
  ) {}

  @Post()
  async create(@Body('workspaceId') workspaceId: string, @Body('name') name: string, @Body('description') description?: string) {
    const project = await this.projectService.create(workspaceId, name, description);
    return { project };
  }

  @Post(':id/analyze')
  async analyzeProject(@Param('id') id: string) {
    const repos = await this.repositoryService.findByProjectId(id);
    for (const repo of repos) {
      await this.syncEngineService.syncRepository(repo);
    }
    const analyses = await this.aiEngineService.analyzeAllObjectives(id);
    return { success: true, analyses };
  }

  @Get(':id/readme')
  async getReadmeSummary(@Param('id') id: string) {
    const repos = await this.repositoryService.findByProjectId(id);
    if (repos.length === 0) {
      return { summary: 'Sin repositorio de GitHub vinculado. Vincula un repositorio para analizar su README.md.' };
    }
    const repo = repos[0];
    const readmeContent = await this.githubClient.getReadme(repo.owner, repo.name);
    if (!readmeContent) {
      return { summary: `No se encontró un archivo README.md en el repositorio ${repo.fullName}.` };
    }
    const prompt = `Analiza este archivo README.md y genera un Resumen Ejecutivo en español del proyecto en 2-3 párrafos claros:
- ¿De qué trata la aplicación?
- ¿Cuáles son sus principales funcionalidades?
- Stack tecnológico o arquitectura clave si se menciona.

README.md:
${readmeContent.slice(0, 4000)}`;

    const res = await this.geminiService.chat([{ role: 'user', content: prompt }]);
    return { summary: res.reply, repoName: repo.fullName };
  }


  @Get(':id')
  async findById(@Param('id') id: string) {
    const project = await this.projectService.findById(id);
    return { project };
  }

  @Get('workspace/:workspaceId')
  async findByWorkspace(@Param('workspaceId') workspaceId: string) {
    const projects = await this.projectService.findByWorkspaceId(workspaceId);
    return { projects };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: { name?: string; description?: string }) {
    const project = await this.projectService.update(id, data);
    return { project };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.projectService.delete(id);
    return { deleted: true };
  }
}

