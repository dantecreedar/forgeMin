import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../../domain/project/project.repository.interface';
import { Project } from '../../domain/project/project.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectApplicationService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
  ) {}

  async create(workspaceId: string, name: string, description?: string): Promise<Project> {
    const project = new Project(
      uuidv4(), workspaceId, name, description,
      [], [], new Date(), new Date(), false,
    );
    await this.projectRepository.save(project);
    return project;
  }

  async findById(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findByWorkspaceId(workspaceId: string): Promise<Project[]> {
    return this.projectRepository.findByWorkspaceId(workspaceId);
  }

  async addRepository(id: string, repoId: string): Promise<Project> {
    const project = await this.findById(id);
    const updated = project.addRepository(repoId);
    await this.projectRepository.update(updated);
    return updated;
  }

  async addObjective(id: string, objectiveId: string): Promise<Project> {
    const project = await this.findById(id);
    const updated = project.addObjective(objectiveId);
    await this.projectRepository.update(updated);
    return updated;
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Project> {
    const project = await this.findById(id);
    const updated = project.update(data);
    await this.projectRepository.update(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    const project = await this.findById(id);
    await this.projectRepository.update(project.archive());
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.projectRepository.delete(id);
  }
}
