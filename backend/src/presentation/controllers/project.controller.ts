import { Controller, Get, Post, Patch, Body, Param, Delete } from '@nestjs/common';
import { ProjectApplicationService } from '../../application/project/project.service';
import { SyncEngineService } from '../../application/analysis/sync-engine.service';
import { AIEngineService } from '../../application/analysis/ai-engine.service';
import { RepositoryApplicationService } from '../../application/repository/repository.service';

import { Inject } from '@nestjs/common';
import { GITHUB_CLIENT, IGitHubClient } from '../../infrastructure/github/github-client.interface';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { LocalGitService, classifyBranch } from '../../infrastructure/git/local-git.service';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectApplicationService,
    private readonly syncEngineService: SyncEngineService,
    private readonly aiEngineService: AIEngineService,
    private readonly repositoryService: RepositoryApplicationService,
    @Inject(GITHUB_CLIENT) private readonly githubClient: IGitHubClient,
    private readonly geminiService: GeminiService,
    private readonly localGitService: LocalGitService,
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
      return { summary: 'Sin repositorio de GitHub vinculado. Vincula un repositorio para analizar su estructura.' };
    }
    const repo = repos[0];
    const readmeContent = await this.githubClient.getReadme(repo.owner, repo.name);
    
    if (readmeContent) {
      const prompt = `Analiza la documentación del proyecto y genera un Informe Ejecutivo Directo en español.

REGLAS DE FORMATO ESTRICTAS:
1. NUNCA menciones las palabras "README", "README.md", "archivo", "plantilla", "boilerplate", ni utilices introducciones como "Aquí tienes un resumen..." o "Este archivo describe...".
2. Empieza DIRECTAMENTE con el título "📌 Propósito General:" sin ninguna presentación previa.
3. Describe la aplicación directamente por sus capacidades funcionales y de negocio.

Formato requerido:

📌 Propósito General:
(Explicación ejecutiva de lo que hace la aplicación)

⚡ Funcionalidades Clave:
• (Funcionalidad 1)
• (Funcionalidad 2)
• (Funcionalidad 3)

🛠️ Stack Tecnológico y Arquitectura:
• (Tecnología o herramientas)

Documentación técnica:
${readmeContent.slice(0, 4000)}`;

      const res = await this.geminiService.chat([{ role: 'user', content: prompt }]);
      let cleaned = res.reply
        .replace(/\*{1,3}/g, '') // Strip all *, **, *** markdown bold/italic formatting
        .replace(/Aquí tienes[\s\S]*?:/gi, '')
        .replace(/Este archivo README(\.md)? describe/gi, 'La aplicación es')
        .replace(/Este archivo README(\.md)?/gi, 'Esta aplicación')
        .replace(/README(\.md)?/gi, 'documentación')
        .replace(/plantilla de proyecto \(boilerplate\)/gi, 'aplicación')
        .replace(/boilerplate/gi, 'proyecto')
        .trim();

      return { summary: cleaned, repoName: repo.fullName };
    }

    // Fallback if no README file was found: generate summary from repository metadata
    const proj = await this.projectService.findById(id);
    const fallbackPrompt = `Genera un Resumen Ejecutivo de la aplicación en español basado en la información del repositorio y proyecto:
- Nombre del proyecto/repositorio: ${proj?.name || repo.name} (${repo.fullName})
- Descripción del proyecto: ${proj?.description || 'Sin descripción provista.'}
- Rama principal: ${repo.defaultBranch}

REGLA ESTRICTA: NO uses asterisco (*, **, ***) para formato. Usa texto plano limpio.
Indica brevemente el propósito de la app.`;

    const res = await this.geminiService.chat([{ role: 'user', content: fallbackPrompt }]);
    const cleanedFallback = res.reply.replace(/\*{1,3}/g, '').trim();
    return { summary: cleanedFallback, repoName: repo.fullName };
  }




  @Get(':id/git-activity')
  async getGitActivity(@Param('id') id: string) {
    const repos = await this.repositoryService.findByProjectId(id);
    const repo = repos.length > 0 ? repos[0] : null;

    const [remoteCommits, prs, remoteBranches, localCommits, localStatus, localBranches] = await Promise.all([
      repo ? this.githubClient.getCommits(repo.owner, repo.name, repo.defaultBranch).catch(() => []) : Promise.resolve([]),
      repo ? this.githubClient.getPullRequests(repo.owner, repo.name, 'all').catch(() => []) : Promise.resolve([]),
      repo ? this.githubClient.getBranches(repo.owner, repo.name).catch(() => []) : Promise.resolve([]),
      this.localGitService.getLocalCommits(8).catch(() => []),
      this.localGitService.getLocalStatus().catch(() => ({ hasUncommittedChanges: false, modifiedFiles: [], currentBranch: 'main' })),
      this.localGitService.getLocalBranches().catch(() => []),
    ]);

    let finalCommits = (remoteCommits || []).slice(0, 6).map((c) => ({ ...c, isLocal: false }));
    let isLocalMode = false;

    if (finalCommits.length === 0) {
      isLocalMode = true;
      finalCommits = (localCommits || []).slice(0, 6).map((c) => ({ ...c, isLocal: true }));
    }

    // Process all discovered branches & classify by environment (Producción, Desarrollo, QA)
    let allBranches = isLocalMode || remoteBranches.length === 0
      ? localBranches
      : remoteBranches.map((b) => {
          const cls = classifyBranch(b.name);
          return {
            name: b.name,
            creatorName: repo?.owner || 'Colaborador',
            relativeDate: 'Reciente',
            sha: b.sha,
            isDefault: b.isDefault,
            ...cls,
          };
        });

    if (allBranches.length === 0) {
      const cls = classifyBranch(repo?.defaultBranch || localStatus.currentBranch || 'main');
      allBranches = [{ name: repo?.defaultBranch || localStatus.currentBranch || 'main', creatorName: repo?.owner || 'Desarrollador', relativeDate: 'Reciente', sha: 'main', isDefault: true, ...cls }];
    }

    const hasMultipleBranches = allBranches.length > 1;
    const defaultBranch = repo?.defaultBranch || localStatus.currentBranch || 'main';
    const repoName = repo?.fullName || 'Repositorio Local';
    const recentPrs = (prs || []).slice(0, 3);

    const prompt = `Describe ÚNICAMENTE Y DIRECTAMENTE qué cambios o avances se realizaron en el código según estos commits.
REGLA ESTRICTA Y ABSOLUTA: NO escribas introducciones, NO escribas 'Aquí tienen un resumen', NO escribas 'Resumen de avances', NO saludes. Empieza la primera palabra directamente nombrando lo que se hizo en el proyecto.

Commits del proyecto:
${finalCommits.map((c) => `- Actividad: "${c.message}" por ${c.authorName}`).join('\n')}

${localStatus.hasUncommittedChanges ? `Trabajo en progreso local: ${localStatus.modifiedFiles.length} archivos modificados.` : ''}`;

    let plainExplanation = `El proyecto se encuentra actualizado en la rama ${defaultBranch}.`;
    try {
      const aiRes = await this.geminiService.chat([{ role: 'user', content: prompt }]);
      plainExplanation = aiRes.reply
        .replace(/\*{1,3}/g, '')
        .replace(/^.*?(aquí (tienen|tienes)|en este resumen|a continuación|resumen de|avances recientes):?\s*/gi, '')
        .replace(/^Aquí tienen[\s\S]*?:/gi, '')
        .trim();
    } catch {}

    return {
      repoName,
      defaultBranch,
      commits: finalCommits,
      pullRequests: recentPrs,
      branches: allBranches,
      hasMultipleBranches,
      localStatus,
      isLocalMode,
      explanation: plainExplanation,
    };
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

