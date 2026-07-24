import { Controller, Post, Get, Body, Param, Delete } from '@nestjs/common';
import { RepositoryApplicationService } from '../../application/repository/repository.service';

@Controller('repositories')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryApplicationService) {}

  @Post('connect')
  async connect(
    @Body('projectId') projectId: string,
    @Body('owner') owner: string,
    @Body('name') name: string,
    @Body('defaultBranch') defaultBranch: string,
    @Body('monitoredBranches') monitoredBranches: string[],
  ) {
    const repo = await this.repositoryService.connect(projectId, owner, name, defaultBranch, monitoredBranches);
    return { repository: repo };
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
