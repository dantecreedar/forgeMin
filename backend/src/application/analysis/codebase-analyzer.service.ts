import { Injectable, Inject } from '@nestjs/common';
import { IGitHubClient, GITHUB_CLIENT, IRepoTreeItem } from '../../infrastructure/github/github-client.interface';
import { GeminiService, CodebaseAnalysisResult } from '../../infrastructure/gemini/gemini.service';

/**
 * Extensions considered binary or non-analyzable — these are always excluded.
 */
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp',
  'pdf', 'zip', 'tar', 'gz', 'rar', '7z',
  'mp3', 'mp4', 'wav', 'avi', 'mov',
  'ttf', 'woff', 'woff2', 'eot', 'otf',
  'lock', 'lockb', 'sum',
  'min.js', 'min.css',
  'map',
]);

/**
 * Directories to always exclude from analysis.
 */
const EXCLUDED_DIRS = [
  'node_modules/', '.git/', 'dist/', 'build/', '.next/', 'out/',
  'coverage/', '.cache/', '__pycache__/', 'vendor/', '.venv/',
  'target/', 'bin/', 'obj/',
];

/**
 * Files with highest priority — always included when present.
 */
const HIGH_PRIORITY_PATTERNS = [
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^nest-cli\.json$/,
  /^docker-compose\.ya?ml$/,
  /^Dockerfile$/,
  /^\.env\.example$/,
  /^README\.md$/i,
  /^app\.module\.ts$/,
  /^main\.ts$/,
  /^next\.config\.(ts|js|mjs)$/,
  /^vite\.config\.(ts|js)$/,
  /^pyproject\.toml$/,
  /^go\.mod$/,
  /^Cargo\.toml$/,
  /^pom\.xml$/,
];

/**
 * Medium priority — architectural files inside src directories.
 */
const MEDIUM_PRIORITY_PATTERNS = [
  /\.module\.ts$/,
  /\.entity\.ts$/,
  /\.service\.ts$/,
  /\.controller\.ts$/,
  /\.repository\.ts$/,
  /\.interface\.ts$/,
  /\.schema\.ts$/,
  /models\//,
  /domain\//,
  /application\//,
  /infrastructure\//,
  /presentation\//,
];

function getExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function isExcluded(path: string): boolean {
  if (EXCLUDED_DIRS.some((dir) => path.startsWith(dir) || path.includes(`/${dir.replace('/', '')}/`))) {
    return true;
  }
  const ext = getExtension(path);
  return BINARY_EXTENSIONS.has(ext);
}

function scorePath(path: string): number {
  const filename = path.split('/').pop() || path;
  if (HIGH_PRIORITY_PATTERNS.some((p) => p.test(filename) || p.test(path))) {
    return 100;
  }
  if (MEDIUM_PRIORITY_PATTERNS.some((p) => p.test(path))) {
    return 60;
  }
  if (path.startsWith('src/') || path.includes('/src/')) {
    return 30;
  }
  return 10;
}

@Injectable()
export class CodebaseAnalyzerService {
  constructor(
    @Inject(GITHUB_CLIENT)
    private readonly githubClient: IGitHubClient,
    private readonly geminiService: GeminiService,
  ) {}

  async analyzeCodebase(owner: string, repo: string, branch?: string, userToken?: string): Promise<CodebaseAnalysisResult> {
    const tree = await this.githubClient.getRepositoryTree(owner, repo, branch, userToken);

    if (tree.length === 0) {
      return this.emptyResult('El repositorio no tiene archivos accesibles o está vacío.');
    }

    const analyzableFiles = tree.filter(
      (item): item is IRepoTreeItem & { type: 'blob' } =>
        item.type === 'blob' && !isExcluded(item.path),
    );

    const scored = analyzableFiles
      .map((item) => ({ item, score: scorePath(item.path) }))
      .sort((a, b) => b.score - a.score);

    const highPriority = scored.filter((s) => s.score >= 100).slice(0, 10);
    const mediumPriority = scored.filter((s) => s.score >= 60 && s.score < 100).slice(0, 10);
    const lowerPriority = scored.filter((s) => s.score < 60).slice(0, 5);

    const selectedItems = [
      ...highPriority,
      ...mediumPriority,
      ...lowerPriority,
    ].map((s) => s.item);

    const fileContents = await Promise.all(
      selectedItems.map((item) =>
        this.githubClient.getFileContent(owner, repo, item.path, userToken),
      ),
    );

    const files = fileContents
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((f) => ({ path: f.path, content: f.content }));

    if (files.length === 0) {
      return this.emptyResult('No se pudo leer el contenido de los archivos del repositorio.');
    }

    const fullTreePaths = tree
      .filter((item) => !isExcluded(item.path))
      .map((item) => (item.type === 'tree' ? `📁 ${item.path}/` : `  ${item.path}`));

    return this.geminiService.analyzeCodebaseArchitecture(files, fullTreePaths);
  }

  private emptyResult(overview: string): CodebaseAnalysisResult {
    return {
      overview,
      stack: [],
      architecturePattern: 'No determinado',
      layers: [],
      strengths: [],
      issues: [],
      recommendations: [],
      securityNotes: [],
      complexityScore: 0,
      maintainabilityScore: 0,
    };
  }
}
