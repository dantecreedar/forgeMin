import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceApplicationService } from '../../application/workspace/workspace.service';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceApplicationService) {}

  @Post()
  async create(@Body('name') name: string, @Body('ownerId') ownerId: string, @Body('description') description?: string) {
    const workspace = await this.workspaceService.create(name, ownerId, description);
    return { workspace };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const workspace = await this.workspaceService.findById(id);
    return { workspace };
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const workspaces = await this.workspaceService.findByUser(userId);
    return { workspaces };
  }

  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body('userId') userId: string) {
    const workspace = await this.workspaceService.addMember(id, userId);
    return { workspace };
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    const workspace = await this.workspaceService.removeMember(id, userId);
    return { workspace };
  }

  @Delete(':id')
  async archive(@Param('id') id: string) {
    await this.workspaceService.archive(id);
    return { deleted: true };
  }
}
