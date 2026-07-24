import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ObjectiveApplicationService } from '../../application/objective/objective.service';
import { ObjectiveStatus } from '../../domain/objective/objective.entity';

@Controller('objectives')
export class ObjectiveController {
  constructor(private readonly objectiveService: ObjectiveApplicationService) {}

  @Post()
  async create(@Body('projectId') projectId: string, @Body('title') title: string, @Body('description') description?: string, @Body('tags') tags?: string[]) {
    const objective = await this.objectiveService.create(projectId, title, description, tags);
    return { objective };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const objective = await this.objectiveService.findById(id);
    return { objective };
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const objectives = await this.objectiveService.findByUserId(userId);
    return { objectives };
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    const objectives = await this.objectiveService.findByProjectId(projectId);
    return { objectives };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ObjectiveStatus,
    @Body('progress') progress: number,
    @Body('summary') summary?: string,
    @Body('risks') risks?: string[],
    @Body('blockers') blockers?: string[],
    @Body('nextSteps') nextSteps?: string[],
  ) {
    const objective = await this.objectiveService.updateStatus(id, status, progress, summary, risks, blockers, nextSteps);
    return { objective };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.objectiveService.delete(id);
    return { deleted: true };
  }
}
