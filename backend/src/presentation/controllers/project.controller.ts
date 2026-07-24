import { Controller, Get, Post, Patch, Body, Param, Delete } from '@nestjs/common';
import { ProjectApplicationService } from '../../application/project/project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectApplicationService) {}

  @Post()
  async create(@Body('workspaceId') workspaceId: string, @Body('name') name: string, @Body('description') description?: string) {
    const project = await this.projectService.create(workspaceId, name, description);
    return { project };
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
