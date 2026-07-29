import { Controller, Post, Get, Body, Param, Query, Headers, Delete, BadRequestException } from '@nestjs/common';
import { RepositoryApplicationService } from '../../application/repository/repository.service';

@Controller('repositories')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryApplicationService) {}

  @Get('github')
  async getGitHubRepositories(
    @Query('username') username?: string,
    @Query('visibility') visibility?: 'all' | 'public' | 'private',
    @Headers('x-github-token') userGithubToken?: string,
  ) {
    const repos = await this.repositoryService.fetchGitHubRepositories(username, userGithubToken, visibility);
    return { repositories: repos };
  }

  @Post('connect')
  async connect(
    @Body('projectId') projectId: string,
    @Body('owner') owner: string,
    @Body('name') name: string,
    @Body('defaultBranch') defaultBranch: string,
    @Body('monitoredBranches') monitoredBranches?: string[],
  ) {
    try {
      if (!projectId) throw new BadRequestException('El ID del proyecto es requerido.');
      const repoOwner = owner || (name?.includes('/') ? name.split('/')[0] : '');
      const repoName = name?.includes('/') ? name.split('/')[1] : name;

      const repo = await this.repositoryService.connect(
        projectId,
        repoOwner,
        repoName,
        defaultBranch || 'main',
        monitoredBranches || [defaultBranch || 'main']
      );
      return { repository: repo };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Error al vincular el repositorio');
    }
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const repo = await this.repositoryService.findById(id);
    return { repository: repo };
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    const repos = await this.repositoryService.findByProjectId(projectId);
    return { repositories: repos };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.repositoryService.remove(id);
    return { deleted: true };
  }
}
