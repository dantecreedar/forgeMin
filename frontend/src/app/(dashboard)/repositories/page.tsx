'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { GitBranch, ExternalLink, Search, RefreshCw, Lock, Globe, AlertCircle, FolderGit2, Link as LinkIcon, Check, X } from 'lucide-react';

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
  const [visibleCount, setVisibleCount] = useState(6);

  // Connect modal state
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  const loadRepositories = async (username?: string) => {
    setLoading(true);
    setError(null);
    setVisibleCount(6);
    try {
      const res = await api.repositories.listGitHub(username);
      if (res.repositories) {
        setRepositories(res.repositories);
      } else if (res.message) {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message || 'Error al conectar con la API de GitHub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepositories();
  }, []);

  const openConnectModal = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setConnectSuccess(null);
    if (!user) return;
    try {
      const wsRes = await api.workspaces.list(user.id);
      const wss = wsRes.workspaces || [];
      setWorkspaces(wss);
      if (wss.length > 0) {
        setSelectedWorkspaceId(wss[0].id);
        const projRes = await api.projects.list(wss[0].id);
        const projs = projRes.projects || [];
        setProjects(projs);
        if (projs.length > 0) setSelectedProjectId(projs[0].id);
      }
    } catch {}
  };

  const handleWorkspaceChange = async (wsId: string) => {
    setSelectedWorkspaceId(wsId);
    setSelectedProjectId('');
    try {
      const projRes = await api.projects.list(wsId);
      const projs = projRes.projects || [];
      setProjects(projs);
      if (projs.length > 0) setSelectedProjectId(projs[0].id);
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
      }, 1800);
    } catch (e: any) {
      alert(e.message || 'Error al vincular el repositorio');
    } finally {
      setConnecting(false);
    }
  };

  const handleSearchUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      loadRepositories(usernameInput.trim());
    }
  };

  const filtered = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  const visibleRepos = filtered.slice(0, visibleCount);

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
            Explora tus repositorios conectados y vincúlalos a un Proyecto para que la IA analice su progreso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRepositories(usernameInput.trim() || undefined)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium text-foreground hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Fetch by User */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Buscar entre los repositorios cargados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
          />
        </div>
        <form onSubmit={handleSearchUser} className="flex gap-2">
          <input
            type="text"
            placeholder="Usuario de GitHub..."
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm shadow-sm"
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
            <div key={n} className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3 animate-pulse">
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
              {visibleRepos.map((repo, i) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 6) * 0.04 }}
                  className="bg-white border border-border hover:border-primary/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
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
                        {repo.isPrivate ? 'Privado' : 'Público'}
                      </span>
                    </div>

                    {repo.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Sin descripción</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      onClick={() => openConnectModal(repo)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-lg transition-colors"
                    >
                      <LinkIcon size={12} />
                      Vincular a Proyecto
                    </button>

                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
                    >
                      Ver en GitHub
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            {visibleCount < filtered.length && (
              <div className="text-center pt-4 pb-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-6 py-2.5 bg-white border border-border hover:bg-gray-50 text-foreground font-medium rounded-xl text-sm transition-all shadow-sm hover:shadow"
                >
                  Ver más ({filtered.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm space-y-3"
        >
          <FolderGit2 className="mx-auto text-muted-foreground/50" size={40} />
          <h3 className="text-base font-semibold text-foreground">No se encontraron repositorios</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? 'Prueba modificando los términos de búsqueda.'
              : 'Verifica tu token de GitHub en el backend o busca repositorios públicos de un usuario arriba.'}
          </p>
        </motion.div>
      )}

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
                  <h3 className="font-semibold text-foreground text-base">Vincular Repositorio</h3>
                </div>
                <button onClick={() => setSelectedRepo(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Vincula <strong className="text-foreground">{selectedRepo.fullName}</strong> a un Proyecto para que la IA analice sus commits y evalúe tus objetivos.
              </p>

              {connectSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600" />
                  <span>{connectSuccess}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Workspace</label>
                    <select
                      value={selectedWorkspaceId}
                      onChange={(e) => handleWorkspaceChange(e.target.value)}
                      className="w-full bg-gray-50 border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Proyecto</label>
                    {projects.length > 0 ? (
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full bg-gray-50 border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        Este workspace no tiene proyectos aún. Crea un proyecto primero.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={handleConnectRepo}
                      disabled={connecting || !selectedProjectId}
                      className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
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
