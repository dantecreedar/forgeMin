'use client';

import { Folder, Target, FolderGit2, ExternalLink, GitBranch, Sparkles } from 'lucide-react';

import Link from 'next/link';

export function renderProjectGraph(project: any, onNavigate?: () => void) {
  if (!project) return null;
  const objectives = project.objectives || [];
  const repos = project.repositories || [];

  return (
    <div key={project.id || project.name} className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md text-left text-slate-100 font-sans space-y-3">
      {/* Project Node Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
            <Folder size={16} />
          </div>
          <div>
            <span className="text-[9px] font-mono tracking-wider text-blue-400 uppercase">PROYECTO [NODO RAÍZ]</span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[190px]">{project.name}</h4>
          </div>
        </div>
        <Link
          href={`/projects/${project.id}`}
          onClick={onNavigate}
          className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 transition-colors"
        >
          Ver <ExternalLink size={10} />
        </Link>
      </div>

      {/* Tree Branches & Graph Diagram */}
      <div className="pl-2 space-y-3 border-l-2 border-slate-800 ml-3">
        {/* Branch: Objectives */}
        <div className="relative pl-3">
          <div className="absolute -left-[9px] top-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-slate-900" />
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target size={13} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-slate-300">
              Objetivos ({objectives.length})
            </span>
          </div>

          {objectives.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic pl-2">Sin objetivos asignados aún</p>
          ) : (
            <div className="space-y-1.5 pl-2 border-l border-slate-800/80">
              {objectives.map((obj: any) => (
                <div key={obj.id} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2 text-[10px] space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-slate-200 truncate max-w-[150px]">{obj.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      {obj.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${obj.progress || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branch: Repositories */}
        <div className="relative pl-3">
          <div className="absolute -left-[9px] top-1.5 w-2 h-2 rounded-full bg-purple-400 ring-4 ring-slate-900" />
          <div className="flex items-center gap-1.5 mb-1.5">
            <FolderGit2 size={13} className="text-purple-400" />
            <span className="text-[11px] font-medium text-slate-300">
              Repositorios ({repos.length})
            </span>
          </div>

          {repos.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic pl-2">Ningún repositorio vinculado</p>
          ) : (
            <div className="space-y-1.5 pl-2 border-l border-slate-800/80">
              {repos.map((repo: any) => {
                const fullName = repo.fullName || repo.name;
                const repoUrl = `https://github.com/${fullName}`;
                return (
                  <a
                    key={repo.id}
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg p-2 text-[10px] flex items-center justify-between transition-colors group"
                  >
                    <span className="font-mono text-purple-300 group-hover:text-purple-200 truncate max-w-[150px] flex items-center gap-1">
                      {fullName} <ExternalLink size={9} className="opacity-60 group-hover:opacity-100" />
                    </span>
                    <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                      <GitBranch size={9} /> {repo.defaultBranch || 'main'}
                    </span>
                  </a>
                );
              })}
            </div>

          )}
        </div>
      </div>
    </div>
  );
}

export function GraphCard({ payload, onNavigate }: { payload: any; onNavigate?: () => void }) {
  if (!payload) return null;
  const { entity, item, items, type } = payload;
  const listItems = Array.isArray(items) ? items : item ? [item] : [];

  if (listItems.length === 0) return null;

  if (entity === 'project') {
    return (
      <div className="space-y-2 mt-2">
        {listItems.map((proj) => renderProjectGraph(proj, onNavigate))}
      </div>
    );
  }

  if (entity === 'objective') {
    return (
      <div className="space-y-2 mt-2">
        {listItems.map((targetItem) => (
          <div key={targetItem.id || targetItem.title} className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                <Target size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase text-emerald-600 tracking-wider">Objetivo</span>
                <h4 className="text-xs font-semibold text-gray-900 truncate">{targetItem.title}</h4>
              </div>
            </div>
            {targetItem.description && (
              <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{targetItem.description}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${targetItem.progress || 0}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 font-mono">{targetItem.progress || 0}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entity === 'github_repo' || entity === 'repository') {
    return (
      <div className="space-y-2 mt-2">
        {listItems.map((repoItem) => (
          <div key={repoItem.id || repoItem.name} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700 shrink-0">
                <FolderGit2 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase text-slate-600 tracking-wider">
                  {type === 'connected' ? 'Repositorio Vinculado' : 'Repositorio GitHub'}
                </span>
                <h4 className="text-xs font-semibold text-gray-900 truncate">{repoItem.fullName || repoItem.name}</h4>
              </div>
            </div>
            {repoItem.defaultBranch && (
              <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                <GitBranch size={12} /> Rama: {repoItem.defaultBranch}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (entity === 'workspace') {
    return (
      <div className="space-y-2 mt-2">
        {listItems.map((wsItem) => (
          <div key={wsItem.id || wsItem.name} className="bg-white border border-purple-200 rounded-xl p-3 shadow-xs space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                <Folder size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase text-purple-600 tracking-wider">Workspace</span>
                <h4 className="text-xs font-semibold text-gray-900 truncate">{wsItem.name}</h4>
              </div>
            </div>
            <Link
              href="/workspaces"
              onClick={onNavigate}
              className="inline-flex items-center gap-1.5 text-xs text-purple-600 font-medium hover:underline pt-1"
            >
              Ir a Workspaces <ExternalLink size={12} />
            </Link>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'global_summary') {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 space-y-3 mt-3 text-left">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Sparkles size={16} className="text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Informe Ejecutivo Global (IA)
          </h4>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
          {payload.summary || payload.message}
        </div>
      </div>
    );
  }

  return null;
}

