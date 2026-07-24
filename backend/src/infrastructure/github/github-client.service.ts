import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { IGitHubClient } from './github-client.interface';
import { IBranch, ICommit, IPullRequest, IIssue, IRelease, IGitHubRepo } from '../../domain/repository/github-data.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GitHubClientService implements IGitHubClient {
  private get token(): string | undefined {
    return process.env.GITHUB_TOKEN || process.env.GITHUB_API;
  }

  private get octokit(): Octokit {
    return new Octokit({
      auth: this.token,
    });
  }

  async getUserRepositories(username?: string, userToken?: string, visibility: 'all' | 'public' | 'private' = 'all'): Promise<IGitHubRepo[]> {
    const activeToken = userToken || process.env.GITHUB_TOKEN || process.env.GITHUB_API;
    const octokit = new Octokit({ auth: activeToken });
    let data;

    if (username) {
      const res = await octokit.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100,
      });
      data = res.data;
    } else {
      if (!activeToken) {
        throw new Error('No se encontró un token de GitHub. Inicia sesión con GitHub en la aplicación o configura GITHUB_TOKEN en backend/.env.');
      }
      const res = await octokit.repos.listForAuthenticatedUser({
        visibility,
        sort: 'updated',
        per_page: 100,
      });
      data = res.data;
    }

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      defaultBranch: repo.default_branch || 'main',
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description ?? undefined,
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : undefined,
    }));
  }


  async getBranches(owner: string, repo: string): Promise<IBranch[]> {

    const { data } = await this.octokit.repos.listBranches({ owner, repo });
    const defaultBranch = await this.getDefaultBranch(owner, repo);
    return data.map((b) => ({
      id: uuidv4(),
      repositoryId: '',
      name: b.name,
      sha: b.commit.sha,
      isDefault: b.name === defaultBranch,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async getCommits(owner: string, repo: string, branch: string, since?: Date): Promise<ICommit[]> {
    const { data } = await this.octokit.repos.listCommits({
      owner, repo, sha: branch, since: since?.toISOString(),
    });
    return data.map((c) => ({
      id: uuidv4(),
      repositoryId: '',
      branchId: '',
      sha: c.sha,
      message: c.commit.message,
      authorName: c.commit.author?.name ?? '',
      authorEmail: c.commit.author?.email ?? '',
      authorDate: c.commit.author?.date ? new Date(c.commit.author.date) : new Date(),
      filesChanged: c.files?.map((f) => f.filename) ?? [],
      additions: c.stats?.additions ?? 0,
      deletions: c.stats?.deletions ?? 0,
      url: c.html_url,
      createdAt: new Date(),
    }));
  }

  async getPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<IPullRequest[]> {
    const { data } = await this.octokit.pulls.list({ owner, repo, state: state ?? 'open' });
    return data.map((pr) => ({
      id: uuidv4(),
      repositoryId: '',
      githubId: pr.number,
      title: pr.title,
      description: pr.body ?? undefined,
      state: pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'open',
      branch: pr.head.ref,
      baseBranch: pr.base.ref,
      authorName: pr.user?.login ?? '',
      commits: [],
      filesChanged: [],
      additions: 0,
      deletions: 0,
      isDraft: (pr.draft as boolean) ?? false,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
    }));
  }

  async getIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<IIssue[]> {
    const { data } = await this.octokit.issues.listForRepo({ owner, repo, state: state ?? 'open' });
    return data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: uuidv4(),
        repositoryId: '',
        githubId: issue.number,
        title: issue.title,
        description: issue.body ?? undefined,
        state: issue.state as 'open' | 'closed',
        labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
        authorName: issue.user?.login ?? '',
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      }));
  }

  async getReleases(owner: string, repo: string): Promise<IRelease[]> {
    const { data } = await this.octokit.repos.listReleases({ owner, repo });
    return data.map((r) => ({
      id: uuidv4(),
      repositoryId: '',
      tagName: r.tag_name,
      releaseName: r.name ?? undefined,
      body: r.body ?? undefined,
      isDraft: r.draft,
      isPrerelease: r.prerelease,
      authorName: r.author?.login ?? '',
      publishedAt: r.published_at ? new Date(r.published_at) : undefined,
      createdAt: new Date(r.created_at),
      url: r.html_url,
    }));
  }

  async createWebhook(owner: string, repo: string, callbackUrl: string, secret: string): Promise<string> {
    const { data } = await this.octokit.repos.createWebhook({
      owner, repo,
      events: ['push', 'pull_request', 'issues', 'release'],
      config: {
        url: callbackUrl,
        content_type: 'json',
        secret,
      },
    });
    return String(data.id);
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<void> {
    await this.octokit.repos.deleteWebhook({ owner, repo, hook_id: parseInt(webhookId, 10) });
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data.default_branch;
  }
}
