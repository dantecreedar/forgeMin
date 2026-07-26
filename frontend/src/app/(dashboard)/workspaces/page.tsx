'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, X, Users, Search, ChevronDown, ChevronRight, ExternalLink, FolderPlus, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useProfileSettings } from '@/lib/settings-context';
import { translations } from '@/lib/translations';

export default function WorkspacesPage() {
  const { user } = useAuth();
  const { settings } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang].workspaces;

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDescription, setWsDescription] = useState('');

  const [creatingProjWsId, setCreatingProjWsId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');

  const [deletingWsId, setDeletingWsId] = useState<string | null>(null);
  const [deletingProjId, setDeletingProjId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const deleteWorkspace = async (id: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    setDeletingWsId(null);
    try {
      await api.workspaces.delete(id);
    } catch (err) {
      console.error('Error deleting workspace:', err);
    }
  };

  const deleteProjectInWs = async (projId: string, wsId: string) => {
    setProjectsMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).filter((p) => p.id !== projId),
    }));
    setDeletingProjId(null);
    try {
      await api.projects.delete(projId);
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const loadProjects = async (wsId: string) => {
    try {
      const res = await api.projects.list(wsId);
      setProjectsMap((prev) => ({ ...prev, [wsId]: res.projects || [] }));
    } catch {}
  };

  const loadAll = () => {
    if (!user) return;
    api.workspaces.list(user.id).then((res) => {
      const wss = res.workspaces || [];
      setWorkspaces(wss);
      const initialExpanded: Record<string, boolean> = {};
      wss.forEach((ws: any) => {
        initialExpanded[ws.id] = true;
        loadProjects(ws.id);
      });
      setExpanded(initialExpanded);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
    const handleRefresh = () => loadAll();
    window.addEventListener('forgemind:refresh', handleRefresh);
    return () => window.removeEventListener('forgemind:refresh', handleRefresh);
  }, [user]);

  const createWorkspace = async () => {
    if (!wsName.trim() || !user) return;
    try {
      const res = await api.workspaces.create(wsName.trim(), user.id, wsDescription.trim() || undefined);
      const ws = res.workspace;
      setWorkspaces((prev) => [ws, ...prev]);
      setExpanded((prev) => ({ ...prev, [ws.id]: true }));
      loadProjects(ws.id);
      setWsName('');
      setWsDescription('');
      setShowCreateWs(false);
    } catch {}
  };

  const createProject = async (wsId: string) => {
    if (!projName.trim()) return;
    try {
      const res = await api.projects.create(wsId, projName.trim(), projDesc.trim() || undefined);
      if (res.project) {
        setProjectsMap((prev) => ({
          ...prev,
          [wsId]: [res.project, ...(prev[wsId] || [])],
        }));
        setProjName('');
        setProjDesc('');
        setCreatingProjWsId(null);
      }
    } catch {}
  };

  const toggleExpand = (wsId: string) => {
    setExpanded((prev) => ({ ...prev, [wsId]: !prev[wsId] }));
  };

  const filtered = search
    ? workspaces.filter((ws: any) => ws.name?.toLowerCase().includes(search.toLowerCase()))
    : workspaces;

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateWs(true)}
            className="bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            {t.newWorkspace}
          </motion.button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-white border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <AnimatePresence>
          {showCreateWs && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t.createWsTitle}</h3>
                  <button onClick={() => setShowCreateWs(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                  placeholder={t.wsNamePlaceholder}
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <textarea
                  value={wsDescription}
                  onChange={(e) => setWsDescription(e.target.value)}
                  placeholder={t.wsDescPlaceholder}
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                />
                <div className="flex gap-3 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={createWorkspace}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                  >
                    {t.createBtn}
                  </motion.button>
                  <button onClick={() => setShowCreateWs(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                    {t.cancel}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-border rounded-2xl p-5 animate-pulse space-y-3">
                <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-border rounded-2xl flex flex-col items-center justify-center py-16 shadow-sm"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Folder className="text-primary" size={28} />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">{t.noWorkspaces}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t.noWorkspacesSub}</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateWs(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              {t.createBtn}
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ws, i) => {
              const wsProjects = projectsMap[ws.id] || [];
              const isExpanded = expanded[ws.id] ?? true;
              const projCount = wsProjects.length;
              const memberCount = ws.memberIds?.length || 1;
              return (
                <motion.div
                  key={ws.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="p-5 flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(ws.id)}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <Folder className="text-primary" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">{ws.name}</h3>
                          {ws.description && (
                            <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <Folder size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {projCount} {projCount !== 1 ? t.projectsPlural : t.projects}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {memberCount} {memberCount !== 1 ? t.membersPlural : t.members}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreatingProjWsId(ws.id);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
                      >
                        <FolderPlus size={14} className="text-primary" />
                        {t.createProject}
                      </motion.button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingWsId(ws.id);
                        }}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title={t.deleteWsBtn}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => toggleExpand(ws.id)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-gray-100">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {creatingProjWsId === ws.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-4 border-t border-gray-100 pt-3"
                      >
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-slate-800">{t.newProjectIn} "{ws.name}"</h4>
                            <button onClick={() => setCreatingProjWsId(null)} className="text-muted-foreground hover:text-foreground">
                              <X size={14} />
                            </button>
                          </div>
                          <input
                            value={projName}
                            onChange={(e) => setProjName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createProject(ws.id)}
                            placeholder={t.projNamePlaceholder}
                            className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                          />
                          <textarea
                            value={projDesc}
                            onChange={(e) => setProjDesc(e.target.value)}
                            placeholder={t.projDescPlaceholder}
                            className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none h-16"
                          />
                          <div className="flex gap-2 pt-1">
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => createProject(ws.id)}
                              className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-medium"
                            >
                              {t.saveProject}
                            </motion.button>
                            <button onClick={() => setCreatingProjWsId(null)} className="text-muted-foreground px-4 py-1.5 rounded-lg text-xs hover:bg-gray-100">
                              {t.cancel}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 bg-gray-50/50"
                      >
                        {wsProjects.length === 0 ? (
                          <div className="px-5 py-6 flex flex-col items-center justify-center text-center">
                            <p className="text-xs text-muted-foreground mb-2">{t.noProjects}</p>
                            <button
                              onClick={() => setCreatingProjWsId(ws.id)}
                              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                            >
                              <Plus size={12} /> {t.createFirst}
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 space-y-2">
                            {wsProjects.map((proj: any) => (
                              <div
                                key={proj.id}
                                className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-primary/40 hover:shadow-xs transition-all group/proj"
                              >
                                <Link
                                  href={`/projects/${proj.id}`}
                                  className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                    <Folder size={14} className="text-blue-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground group-hover/proj:text-primary transition-colors truncate">{proj.name}</p>
                                    {proj.description && (
                                      <p className="text-[11px] text-muted-foreground truncate">{proj.description}</p>
                                    )}
                                  </div>
                                </Link>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/projects/${proj.id}`}
                                    className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium hover:bg-slate-200"
                                  >
                                    {t.viewProject}
                                  </Link>
                                  <button
                                    onClick={() => setDeletingProjId(proj.id)}
                                    className="text-slate-300 hover:text-red-600 p-1 transition-colors"
                                    title={t.deleteProjBtn}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <Link href={`/projects/${proj.id}`}>
                                    <ExternalLink size={14} className="text-muted-foreground group-hover/proj:text-primary transition-colors" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Workspace Modal */}
      <AnimatePresence>
        {deletingWsId && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.deleteWsTitle}</h3>
                  <p className="text-xs text-slate-500">{t.deleteWsSub}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{t.deleteWsConfirm}</p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => deleteWorkspace(deletingWsId)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> {t.deleteWsBtn}
                </button>
                <button
                  onClick={() => setDeletingWsId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Project Modal */}
      <AnimatePresence>
        {deletingProjId && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.deleteProjTitle}</h3>
                  <p className="text-xs text-slate-500">{t.deleteProjSub}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{t.deleteProjConfirm}</p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const wsId = Object.keys(projectsMap).find((key) =>
                      projectsMap[key].some((p) => p.id === deletingProjId)
                    );
                    if (wsId) deleteProjectInWs(deletingProjId, wsId);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> {t.deleteProjBtn}
                </button>
                <button
                  onClick={() => setDeletingProjId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
