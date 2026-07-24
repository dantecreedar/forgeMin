'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { GitBranch, ExternalLink, Search, RefreshCw, Lock, Globe, AlertCircle, FolderGit2, Link as LinkIcon, Check, X, Key, ShieldCheck, Building2 } from 'lucide-react';
import Link from 'next/link';

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  description?: string;
  updatedAt?: string;
}

export default function RepositoriesPage() {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [visibleCount, setVisibleCount] = useState(6);

  // Token configuration modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [savedTokenMsg, setSavedTokenMsg] = useState<string | null>(null);

  // Map repo fullName -> { projectId, projectName }
  const [linkedMap, setLinkedMap] = useState<Record<string, { projectId: string; projectName: string }>>({});

  // Connect modal state
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  const loadData = async (username?: string, visibility: 'all' | 'public' | 'private' = visibilityFilter) => {
    setLoading(true);
    setError(null);
    setVisibleCount(6);
    try {
      const res = await api.repositories.listGitHub(username, visibility);
      if (res.repositories) {
        setRepositories(res.repositories);
      } else if (res.message) {
        setError(res.message);
      }

      // Load all linked repos across all user projects to build linkedMap
      if (user) {
        const wsRes = await api.workspaces.list(user.id);
        const wss = wsRes.workspaces || [];
        const newMap: Record<string, { projectId: string; projectName: string }> = {};

        for (const ws of wss) {
          const projRes = await api.projects.list(ws.id);
          const projs = projRes.projects || [];
          for (const p of projs) {
            const repoRes = await api.repositories.listByProject(p.id);
            const connected = repoRes.repositories || [];
            for (const r of connected) {
              const key = (r.fullName || `${r.owner}/${r.name}`).toLowerCase();
              newMap[key] = { projectId: p.id, projectName: p.name };
            }
          }
        }
        setLinkedMap(newMap);
      }
    } catch (e: any) {
      setError(e.message || 'Error al conectar con la API de GitHub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
    if (storedToken) setCustomToken(storedToken);
  }, [user, visibilityFilter]);

  const saveToken = () => {
    if (typeof window !== 'undefined') {
      if (customToken.trim()) {
        localStorage.setItem('github_token', customToken.trim());
        setSavedTokenMsg('Token guardado exitosamente. Cargando repositorios...');
      } else {
        localStorage.removeItem('github_token');
        setSavedTokenMsg('Token eliminado. Usando sesión por defecto.');
      }
    }
    setTimeout(() => {
      setShowTokenModal(false);
      setSavedTokenMsg(null);
      loadData();
    }, 1200);
  };

  const openConnectModal = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setConnectSuccess(null);
    if (!user) return;
    try {
      const wsRes = await api.workspaces.list(user.id);
      const wss = wsRes.workspaces || [];
      const allProjectsList: any[] = [];
      for (const ws of wss) {
        const projRes = await api.projects.list(ws.id);
        const projs = projRes.projects || [];
        allProjectsList.push(...projs);
      }
      setProjects(allProjectsList);
      if (allProjectsList.length > 0) {
        setSelectedProjectId(allProjectsList[0].id);
      }
    } catch {}
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo || !selectedProjectId) return;
    setConnecting(true);
    try {
      await api.repositories.connect(
        selectedProjectId,
        selectedRepo.owner,
        selectedRepo.name,
        selectedRepo.defaultBranch,
        [selectedRepo.defaultBranch]
      );
      setConnectSuccess(`Repositorio "${selectedRepo.name}" vinculado exitosamente al proyecto.`);
      setTimeout(() => {
        setSelectedRepo(null);
        setConnectSuccess(null);
        loadData(); // Refresh linked state badges
      }, 1500);
    } catch (e: any) {
      alert(e.message || 'Error al vincular el repositorio');
    } finally {
      setConnecting(false);
    }
  };

  const handleSearchUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      loadData(usernameInput.trim());
    }
  };

  const filtered = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  const visibleRepos = filtered.slice(0, visibleCount);
  const hasCustomToken = typeof window !== 'undefined' && !!localStorage.getItem('github_token');

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 className="text-primary" size={24} />
            <h1 className="text-2xl font-bold text-foreground">Repositorios de GitHub</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Explora tus repositorios públicos, privados u organizacionales y vincúlalos a tus proyectos.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTokenModal(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shadow-xs ${
              hasCustomToken
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            {hasCustomToken ? <ShieldCheck size={14} className="text-purple-600" /> : <Key size={14} className="text-amber-400" />}
            {hasCustomToken ? 'Token Privado Configurado' : 'Acceso Repos Privados / Empresa'}
          </button>

          <button
            onClick={() => loadData(usernameInput ? usernameInput : undefined)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border hover:bg-gray-50 rounded-xl text-xs font-medium text-foreground transition-colors shadow-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Visibility Filter */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Buscar entre los repositorios cargados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-medium w-full md:w-auto shrink-0">
          <button
            onClick={() => setVisibilityFilter('all')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              visibilityFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setVisibilityFilter('public')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              visibilityFilter === 'public' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Públicos
          </button>
          <button
            onClick={() => setVisibilityFilter('private')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              visibilityFilter === 'private' ? 'bg-white text-purple-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Privados
          </button>
        </div>
      </div>


      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm shadow-xs"
        >
          <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Atención</p>
            <p>{error}</p>
          </div>
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-border rounded-2xl p-5 shadow-xs space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-6">
          {/* Scrollable Container */}
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleRepos.map((repo, i) => {
                const linkedInfo = linkedMap[repo.fullName.toLowerCase()];
                return (
                  <motion.div
                    key={repo.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i % 6) * 0.04 }}
                    className="bg-white border border-border hover:border-primary/40 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <FolderGit2 size={18} className="text-primary shrink-0" />
                          <h3 className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors">
                            {repo.fullName}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                            repo.isPrivate
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {repo.isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                          {repo.isPrivate ? 'Privado / Empresa' : 'Público'}
                        </span>
                      </div>

                      {repo.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono pt-0.5">
                          <GitBranch size={11} /> Rama: {repo.defaultBranch || 'main'}
                        </div>
                      )}

                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {linkedInfo ? (
                          <Link
                            href={`/projects/${linkedInfo.projectId}`}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Check size={14} className="text-emerald-600" />
                            <span>Vinculado a: {linkedInfo.projectName}</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => openConnectModal(repo)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <LinkIcon size={14} />
                            Vincular a Proyecto
                          </button>
                        )}
                      </div>

                      <a
                        href={repo.htmlUrl || `https://github.com/${repo.fullName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1 hover:underline text-[11px]"
                      >
                        Ver en GitHub <ExternalLink size={12} />
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Ver Más Button for Infinite Scroll Effect */}
            {visibleCount < filtered.length && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-6 py-2.5 bg-white border border-border hover:bg-gray-50 rounded-xl text-xs font-semibold text-foreground transition-all shadow-xs flex items-center gap-2"
                >
                  Ver más ({filtered.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <FolderGit2 className="mx-auto text-muted-foreground" size={32} />
          <h3 className="font-semibold text-foreground">No se encontraron repositorios</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Prueba configurando tu Token de Acceso para Repositorios Privados o de Empresa.
          </p>
        </div>
      )}

      {/* Token Modal */}
      <AnimatePresence>
        {showTokenModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <Building2 size={20} className="text-purple-600" />
                  <h3 className="font-bold text-base">Acceso a Repos Privados y Empresa</h3>
                </div>
                <button onClick={() => setShowTokenModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Ingresa tu <strong>Personal Access Token (PAT)</strong> de GitHub con permisos <code>repo</code> y <code>read:org</code> para listar tus proyectos privados y de empresa.
              </p>

              {savedTokenMsg ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <Check size={16} className="text-emerald-600" />
                  <span>{savedTokenMsg}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GitHub Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-gray-50 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveToken}
                      className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      Guardar Token y Cargar Repos
                    </button>
                    {customToken && (
                      <button
                        onClick={() => {
                          setCustomToken('');
                          localStorage.removeItem('github_token');
                          setSavedTokenMsg('Token eliminado');
                          setTimeout(() => {
                            setShowTokenModal(false);
                            setSavedTokenMsg(null);
                            loadData();
                          }, 1000);
                        }}
                        className="px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium border border-red-200"
                      >
                        Limpiar Token
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connect Modal */}
      <AnimatePresence>
        {selectedRepo && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="text-primary" size={20} />
                  <h3 className="font-semibold text-foreground text-base">Vincular Repositorio (1:1)</h3>
                </div>
                <button onClick={() => setSelectedRepo(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Vincula <strong className="text-foreground">{selectedRepo.fullName}</strong> a un Proyecto exclusivo. Cada proyecto gestiona 1 repositorio.
              </p>

              {connectSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600" />
                  <span>{connectSuccess}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Proyecto</label>
                    {projects.length > 0 ? (
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full bg-gray-50 border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        No se encontraron proyectos activos. Crea un proyecto primero.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={handleConnectRepo}
                      disabled={connecting || !selectedProjectId}
                      className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {connecting ? 'Vinculando...' : 'Vincular Repositorio'}
                    </button>
                    <button
                      onClick={() => setSelectedRepo(null)}
                      className="px-4 py-2.5 text-muted-foreground hover:bg-gray-100 rounded-xl text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
