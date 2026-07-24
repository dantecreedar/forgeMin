'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, X, Users, Search, ChevronDown, ChevronRight, ExternalLink, FolderPlus } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function WorkspacesPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDescription, setWsDescription] = useState('');

  const [creatingProjWsId, setCreatingProjWsId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
      // Automatically expand all workspaces so user sees projects right away
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
            <h1 className="text-xl font-semibold text-foreground">Workspaces & Proyectos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Organiza tus espacios de trabajo y proyectos</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateWs(true)}
            className="bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Nuevo Workspace
          </motion.button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar workspace..."
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
                  <h3 className="text-sm font-medium">Crear Workspace</h3>
                  <button onClick={() => setShowCreateWs(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                  placeholder="Nombre del Workspace (ej. Mi Empresa)"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <textarea
                  value={wsDescription}
                  onChange={(e) => setWsDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                />
                <div className="flex gap-3 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={createWorkspace}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                  >
                    Crear Workspace
                  </motion.button>
                  <button onClick={() => setShowCreateWs(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                    Cancelar
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
            <h3 className="text-sm font-medium text-foreground mb-1">Sin Workspaces aún</h3>
            <p className="text-xs text-muted-foreground mb-4">Crea tu primer espacio de trabajo para comenzar</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateWs(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              Crear Workspace
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ws, i) => {
              const wsProjects = projectsMap[ws.id] || [];
              const isExpanded = expanded[ws.id] ?? true;
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
                          <span className="text-xs text-muted-foreground">{wsProjects.length} proyecto{wsProjects.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{ws.memberIds?.length || 1} miembro{ws.memberIds?.length !== 1 ? 's' : ''}</span>
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
                        Crear Proyecto
                      </motion.button>
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
                            <h4 className="text-xs font-semibold text-slate-800">Nuevo Proyecto en "{ws.name}"</h4>
                            <button onClick={() => setCreatingProjWsId(null)} className="text-muted-foreground hover:text-foreground">
                              <X size={14} />
                            </button>
                          </div>
                          <input
                            value={projName}
                            onChange={(e) => setProjName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createProject(ws.id)}
                            placeholder="Nombre del proyecto (ej. API Backend)"
                            className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                          />
                          <textarea
                            value={projDesc}
                            onChange={(e) => setProjDesc(e.target.value)}
                            placeholder="Descripción del proyecto (opcional)"
                            className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none h-16"
                          />
                          <div className="flex gap-2 pt-1">
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => createProject(ws.id)}
                              className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-medium"
                            >
                              Guardar Proyecto
                            </motion.button>
                            <button onClick={() => setCreatingProjWsId(null)} className="text-muted-foreground px-4 py-1.5 rounded-lg text-xs hover:bg-gray-100">
                              Cancelar
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
                            <p className="text-xs text-muted-foreground mb-2">Este workspace aún no tiene proyectos.</p>
                            <button
                              onClick={() => setCreatingProjWsId(ws.id)}
                              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                            >
                              <Plus size={12} /> Crear el primer proyecto
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 space-y-2">
                            {wsProjects.map((proj: any) => (
                              <Link
                                key={proj.id}
                                href={`/projects/${proj.id}`}
                                className="block"
                              >
                                <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-primary/40 hover:shadow-xs transition-all group/proj">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                      <Folder size={14} className="text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-foreground group-hover/proj:text-primary transition-colors">{proj.name}</p>
                                      {proj.description && (
                                        <p className="text-[11px] text-muted-foreground truncate">{proj.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Ver proyecto</span>
                                    <ExternalLink size={14} className="text-muted-foreground group-hover/proj:text-primary transition-colors" />
                                  </div>
                                </div>
                              </Link>
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
    </div>
  );
}
