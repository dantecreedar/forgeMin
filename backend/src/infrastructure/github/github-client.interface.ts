import { IBranch, ICommit, IPullRequest, IIssue, IRelease, IGitHubRepo } from '../../domain/repository/github-data.entity';

export const GITHUB_CLIENT = 'GITHUB_CLIENT';

export interface IRepoTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
}

export interface IRepoFile {
  path: string;
  content: string;
  size: number;
}

export interface IGitHubClient {
  getUserRepositories(username?: string, userToken?: string, visibility?: 'all' | 'public' | 'private'): Promise<IGitHubRepo[]>;

  getBranches(owner: string, repo: string): Promise<IBranch[]>;
  getCommits(owner: string, repo: string, branch: string, since?: Date): Promise<ICommit[]>;
  getPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<IPullRequest[]>;
  getIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<IIssue[]>;
  getReleases(owner: string, repo: string): Promise<IRelease[]>;
  createWebhook(owner: string, repo: string, callbackUrl: string, secret: string): Promise<string>;
  deleteWebhook(owner: string, repo: string, webhookId: string): Promise<void>;
  getReadme(owner: string, repo: string, userToken?: string): Promise<string | null>;

  getRepositoryTree(owner: string, repo: string, branch?: string, userToken?: string): Promise<IRepoTreeItem[]>;
  getFileContent(owner: string, repo: string, path: string, userToken?: string): Promise<IRepoFile | null>;
}


