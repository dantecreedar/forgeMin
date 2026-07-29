'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useProfileSettings } from '@/lib/settings-context';
import { translations } from '@/lib/translations';
import { GitBranch, ExternalLink, Search, Lock, Globe, AlertCircle, FolderGit2, Link as LinkIcon, Check, X, Building2, ChevronDown } from 'lucide-react';
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
  const { settings } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang].repositories;

  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [visibleCount, setVisibleCount] = useState(6);

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [savedTokenMsg, setSavedTokenMsg] = useState<string | null>(null);

  const [linkedMap, setLinkedMap] = useState<Record<string, { projectId: string; projectName: string; workspaceName?: string }>>({});

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

      if (user) {
        const wsRes = await api.workspaces.list(user.id);
        const wss = wsRes.workspaces || [];
        const newMap: Record<string, { projectId: string; projectName: string; workspaceName?: string }> = {};

        for (const ws of wss) {
          const projRes = await api.projects.list(ws.id);
          const projs = projRes.projects || [];
          for (const p of projs) {
            const repoRes = await api.repositories.listByProject(p.id);
            const connected = repoRes.repositories || [];
            for (const r of connected) {
              const key = (r.fullName || `${r.owner}/${r.name}`).toLowerCase();
              newMap[key] = { projectId: p.id, projectName: p.name, workspaceName: ws.name || 'Sin nombre' };
            }
          }
        }
        setLinkedMap(newMap);
      }
    } catch (e: any) {
      setError(e.message || t.errorApi);
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
        setSavedTokenMsg(t.tokenSaved);
      } else {
        localStorage.removeItem('github_token');
        setSavedTokenMsg(t.tokenRemoved);
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
    setIsDropdownOpen(false);
    if (!user) return;
    try {
      const wsRes = await api.workspaces.list(user.id);
      const wss = wsRes.workspaces || [];
      const allProjectsList: any[] = [];
      for (const ws of wss) {
        const projRes = await api.projects.list(ws.id);
        const projs = projRes.projects || [];
        for (const p of projs) {
          const repoRes = await api.repositories.listByProject(p.id);
          const connected = repoRes.repositories || [];
          const isOccupied = connected.length > 0;
          const connectedRepoName = isOccupied
            ? (connected[0].fullName || `${connected[0].owner}/${connected[0].name}`)
            : null;

          allProjectsList.push({
            ...p,
            workspaceName: ws.name || 'Sin nombre',
            isOccupied,
            connectedRepoName,
          });
        }
      }
      setProjects(allProjectsList);
      const firstAvailable = allProjectsList.find((p) => !p.isOccupied);
      if (firstAvailable) {
        setSelectedProjectId(firstAvailable.id);
      } else if (allProjectsList.length > 0) {
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
      setConnectSuccess(`"${selectedRepo.name}" ${t.linkSuccess}`);
      setTimeout(() => {
        setSelectedRepo(null);
        setConnectSuccess(null);
        loadData();
      }, 1500);
    } catch (e: any) {
      alert(e.message || t.errorLink);
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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FolderGit2 className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
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
            {t.all}
          </button>
          <button
            onClick={() => setVisibilityFilter('public')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              visibilityFilter === 'public' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.public}
          </button>
          <button
            onClick={() => setVisibilityFilter('private')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              visibilityFilter === 'private' ? 'bg-white text-purple-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.private}
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
            <p className="font-semibold mb-0.5">{t.attention}</p>
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
                          {repo.isPrivate ? t.privateLabel : t.publicLabel}
                        </span>
                      </div>

                      {repo.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono pt-0.5">
                          <GitBranch size={11} /> {t.branch} {repo.defaultBranch || 'main'}
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
                            <span>{t.linkedTo} {linkedInfo.projectName} {linkedInfo.workspaceName ? `(Workspace: ${linkedInfo.workspaceName})` : ''}</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => openConnectModal(repo)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <LinkIcon size={14} />
                            {t.linkToProject}
                          </button>
                        )}
                      </div>

                      <a
                        href={repo.htmlUrl || `https://github.com/${repo.fullName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1 hover:underline text-[11px]"
                      >
                        {t.viewOnGithub} <ExternalLink size={12} />
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {visibleCount < filtered.length && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-6 py-2.5 bg-white border border-border hover:bg-gray-50 rounded-xl text-xs font-semibold text-foreground transition-all shadow-xs flex items-center gap-2"
                >
                  {t.showMore} ({filtered.length - visibleCount} {t.remaining})
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <FolderGit2 className="mx-auto text-muted-foreground" size={32} />
          <h3 className="font-semibold text-foreground">{t.noRepos}</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t.noReposSub}</p>
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
                  <h3 className="font-bold text-base">{t.tokenModalTitle}</h3>
                </div>
                <button onClick={() => setShowTokenModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{t.tokenModalDesc}</p>

              {savedTokenMsg ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <Check size={16} className="text-emerald-600" />
                  <span>{savedTokenMsg}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.tokenLabel}</label>
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
                      {t.saveToken}
                    </button>
                    {customToken && (
                      <button
                        onClick={() => {
                          setCustomToken('');
                          localStorage.removeItem('github_token');
                          setSavedTokenMsg(t.tokenRemovedShort);
                          setTimeout(() => {
                            setShowTokenModal(false);
                            setSavedTokenMsg(null);
                            loadData();
                          }, 1000);
                        }}
                        className="px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium border border-red-200"
                      >
                        {t.clearToken}
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
                  <h3 className="font-semibold text-foreground text-base">{t.connectModalTitle}</h3>
                </div>
                <button onClick={() => setSelectedRepo(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{selectedRepo.fullName}</strong> — {t.connectModalDesc}
              </p>

              {connectSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600" />
                  <span>{connectSuccess}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t.projectLabel}</label>
                    {projects.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          {(() => {
                            const selectedObj = projects.find((p) => p.id === selectedProjectId);
                            if (!selectedObj) return <span className="text-sm text-slate-400 font-medium">Seleccionar proyecto...</span>;

                            return (
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900 truncate">
                                    {selectedObj.name}
                                  </span>
                                  <span className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Building2 size={10} className="text-blue-500" />
                                    {selectedObj.workspaceName}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {selectedObj.isOccupied ? `🔒 Ocupado por ${selectedObj.connectedRepoName}` : 'Disponible (gestión 1:1)'}
                                </p>
                              </div>
                            );
                          })()}

                          <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 4, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"
                            >
                              {projects.map((p) => {
                                const isSelected = p.id === selectedProjectId;
                                const isOccupied = p.isOccupied;

                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={isOccupied}
                                    onClick={() => {
                                      setSelectedProjectId(p.id);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                      isOccupied
                                        ? 'bg-slate-50/70 border-slate-100 opacity-60 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-blue-50/80 border-blue-300 font-medium'
                                        : 'bg-white border-transparent hover:bg-slate-100/70 hover:border-slate-200'
                                    }`}
                                  >
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                          {p.name}
                                        </span>
                                        <span className="text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                          <Building2 size={9} className="text-slate-400" />
                                          {p.workspaceName}
                                        </span>
                                      </div>

                                      {isOccupied ? (
                                        <p className="text-[10px] text-amber-700 flex items-center gap-1 font-medium truncate">
                                          <Lock size={10} className="text-amber-600 shrink-0" />
                                          Ocupado por <span className="font-mono text-slate-700 truncate">{p.connectedRepoName}</span>
                                        </p>
                                      ) : (
                                        <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                                          <Check size={10} className="text-emerald-600" /> Disponible
                                        </p>
                                      )}
                                    </div>

                                    <div className="shrink-0 flex items-center">
                                      {isOccupied ? (
                                        <span className="text-[9px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <Lock size={9} /> Ocupado
                                        </span>
                                      ) : isSelected ? (
                                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                          <Check size={10} />
                                        </span>
                                      ) : (
                                        <span className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        {t.noProjects}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={handleConnectRepo}
                      disabled={connecting || !selectedProjectId || Boolean(projects.find((p) => p.id === selectedProjectId)?.isOccupied)}
                      className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting ? t.linking : t.linkBtn}
                    </button>
                    <button
                      onClick={() => setSelectedRepo(null)}
                      className="px-4 py-2.5 text-muted-foreground hover:bg-gray-100 rounded-xl text-sm font-medium"
                    >
                      {t.cancel}
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
