import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IWorkspaceRepository, WORKSPACE_REPOSITORY } from '../../domain/workspace/workspace.repository.interface';
import { Workspace, IWorkspace } from '../../domain/workspace/workspace.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkspaceApplicationService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly workspaceRepository: IWorkspaceRepository,
  ) {}

  async create(name: string, ownerId: string, description?: string): Promise<Workspace> {
    const workspace = new Workspace(
      uuidv4(), name, description, ownerId, [ownerId],
      new Date(), new Date(), true,
    );
    await this.workspaceRepository.save(workspace);
    return workspace;
  }

  async findById(id: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    const owned = await this.workspaceRepository.findByOwnerId(userId);
    const member = await this.workspaceRepository.findByMemberId(userId);
    const seen = new Set<string>();
    return [...owned, ...member].filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  }

  async addMember(id: string, userId: string): Promise<Workspace> {
    const workspace = await this.findById(id);
    const updated = workspace.addMember(userId);
    await this.workspaceRepository.update(updated);
    return updated;
  }

  async removeMember(id: string, userId: string): Promise<Workspace> {
    const workspace = await this.findById(id);
    const updated = workspace.removeMember(userId);
    await this.workspaceRepository.update(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.workspaceRepository.delete(id);
  }
}
