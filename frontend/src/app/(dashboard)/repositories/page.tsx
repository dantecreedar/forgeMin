'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { GitBranch, ExternalLink, Search, RefreshCw, Lock, Globe, AlertCircle, FolderGit2 } from 'lucide-react';

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
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);

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
            Explora tus repositorios conectados y sincronízalos con ForgeMind.
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
                    <div className="flex items-center gap-1.5 font-mono">
                      <GitBranch size={13} className="text-gray-400" />
                      <span>{repo.defaultBranch}</span>
                    </div>

                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
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
    </div>
  );
}

