import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ICommit } from '../../domain/repository/github-data.entity';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface ILocalStatus {
  hasUncommittedChanges: boolean;
  modifiedFiles: string[];
  currentBranch: string;
}

export interface ILocalBranch {
  name: string;
  creatorName: string;
  relativeDate: string;
  sha: string;
  isDefault: boolean;
  type: 'production' | 'development' | 'qa' | 'feature';
  categoryLabel: string;
}

export function classifyBranch(name: string): { type: 'production' | 'development' | 'qa' | 'feature'; categoryLabel: string } {
  const lower = name.toLowerCase();
  if (lower === 'develop' || lower === 'dev' || lower.includes('development') || lower.includes('prod')) {
    return { type: 'production', categoryLabel: 'Producción' };
  }
  if (lower === 'main' || lower === 'master') {
    return { type: 'development', categoryLabel: 'Desarrollo' };
  }
  if (lower.includes('qa') || lower.includes('stage') || lower.includes('staging') || lower.includes('test')) {
    return { type: 'qa', categoryLabel: 'Pruebas (QA)' };
  }
  return { type: 'feature', categoryLabel: 'Característica / Fix' };
}

@Injectable()
export class LocalGitService {
  private get repoRoot(): string {
    return process.cwd();
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.repoRoot });
      return stdout.trim() || 'main';
    } catch {
      return 'main';
    }
  }

  async getLocalStatus(): Promise<ILocalStatus> {
    try {
      const branch = await this.getCurrentBranch();
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.repoRoot });
      const lines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
      const modifiedFiles = lines.map((l) => l.substring(3).trim());

      return {
        hasUncommittedChanges: lines.length > 0,
        modifiedFiles,
        currentBranch: branch,
      };
    } catch {
      return {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        currentBranch: 'main',
      };
    }
  }

  async getLocalBranches(): Promise<ILocalBranch[]> {
    try {
      const current = await this.getCurrentBranch();
      const { stdout } = await execAsync(
        'git for-each-ref --sort=-committerdate refs/heads/ refs/remotes/ --format="%(refname:short)|%(authorname)|%(committerdate:relative)|%(objectname:short)"',
        { cwd: this.repoRoot }
      );

      if (!stdout.trim()) {
        const cls = classifyBranch(current);
        return [{ name: current, creatorName: 'Desarrollador', relativeDate: 'Reciente', sha: 'main', isDefault: true, ...cls }];
      }

      const lines = stdout.trim().split('\n');
      const seen = new Set<string>();
      const branches: ILocalBranch[] = [];

      for (const line of lines) {
        const [refname, authorname, relativeDate, sha] = line.split('|');
        const cleanName = refname.replace(/^origin\//, '');
        if (cleanName === 'HEAD' || seen.has(cleanName)) continue;
        seen.add(cleanName);

        const cls = classifyBranch(cleanName);
        branches.push({
          name: cleanName,
          creatorName: authorname || 'Desarrollador',
          relativeDate: relativeDate || 'Reciente',
          sha: sha || '',
          isDefault: cleanName === 'main' || cleanName === 'master' || cleanName === current,
          ...cls,
        });
      }

      return branches;
    } catch {
      const cls = classifyBranch('main');
      return [{ name: 'main', creatorName: 'Desarrollador', relativeDate: 'Reciente', sha: 'main', isDefault: true, ...cls }];
    }
  }

  async getLocalCommits(count = 10): Promise<(ICommit & { isLocal?: boolean; branchName?: string })[]> {
    try {
      const currentBranch = await this.getCurrentBranch();
      const format = '%H|%an|%ae|%ad|%s|%D';
      const { stdout } = await execAsync(`git log -n ${count} --pretty=format:"${format}"`, {
        cwd: this.repoRoot,
      });

      if (!stdout.trim()) return [];

      const lines = stdout.trim().split('\n');
      return lines.map((line) => {
        const [sha, authorName, authorEmail, authorDate, message, refs] = line.split('|');
        let branchName = currentBranch;
        if (refs) {
          // Parse ref names like "HEAD -> develop, origin/develop" or "tag: v1.0, main"
          const refParts = refs.split(',').map((r) => r.trim());
          for (const ref of refParts) {
            const cleanRef = ref.replace(/^HEAD ->\s*/, '').replace(/^origin\//, '');
            if (cleanRef && !cleanRef.startsWith('tag:')) {
              branchName = cleanRef;
              break;
            }
          }
        }
        return {
          id: uuidv4(),
          repositoryId: 'local-repo',
          branchId: '',
          sha: sha || '',
          message: message || '',
          authorName: authorName || 'Desarrollador Local',
          authorEmail: authorEmail || '',
          authorDate: authorDate ? new Date(authorDate) : new Date(),
          filesChanged: [],
          additions: 0,
          deletions: 0,
          url: '',
          createdAt: authorDate ? new Date(authorDate) : new Date(),
          isLocal: true,
          branchName,
        };
      });
    } catch (error) {
      return [];
    }
  }
}
