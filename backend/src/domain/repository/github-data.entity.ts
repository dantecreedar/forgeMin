export interface IBranch {
  id: string;
  repositoryId: string;
  name: string;
  sha: string;
  isDefault: boolean;
  lastCommitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommit {
  id: string;
  repositoryId: string;
  branchId: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: Date;
  filesChanged: string[];
  additions: number;
  deletions: number;
  url: string;
  createdAt: Date;
}

export interface IPullRequest {
  id: string;
  repositoryId: string;
  githubId: number;
  title: string;
  description?: string;
  state: 'open' | 'closed' | 'merged';
  branch: string;
  baseBranch: string;
  authorName: string;
  commits: string[];
  filesChanged: string[];
  additions: number;
  deletions: number;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  closedAt?: Date;
}

export interface IIssue {
  id: string;
  repositoryId: string;
  githubId: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  labels: string[];
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface IRelease {
  id: string;
  repositoryId: string;
  tagName: string;
  releaseName?: string;
  body?: string;
  isDraft: boolean;
  isPrerelease: boolean;
  authorName: string;
  publishedAt?: Date;
  createdAt: Date;
  url: string;
}

export interface IGitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  description?: string;
  updatedAt?: Date;
}

