'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { ArrowLeft, Edit3, Trash2, Plus, X, CheckCircle, Clock, AlertCircle, Target, Sparkles, FolderGit2, RefreshCw, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: <Clock size={12} /> },
  in_progress: { label: 'En Desarrollo', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Target size={12} /> },
  partial: { label: 'Parcial', color: 'text-amber-600', bg: 'bg-amber-100', icon: <AlertCircle size={12} /> },
  completed: { label: 'Cumplido', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <CheckCircle size={12} /> },
  blocked: { label: 'Bloqueado', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertCircle size={12} /> },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingObjId, setDeletingObjId] = useState<string | null>(null);
  const [objCreateError, setObjCreateError] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    Promise.all([
      api.projects.get(id),
      api.objectives.list(id),
      api.repositories.listByProject(id),
    ]).then(([projRes, objRes, repoRes]) => {
      setProject(projRes.project);
      setObjectives(objRes.objectives || []);
      setConnectedRepos(repoRes.repositories || []);
      setEditName(projRes.project?.name || '');
      setEditDesc(projRes.project?.description || '');
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const handleRefresh = () => load();
    window.addEventListener('forgemind:refresh', handleRefresh);
    return () => window.removeEventListener('forgemind:refresh', handleRefresh);
  }, [id]);

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      const res = await api.projects.update(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      setProject(res.project);
      setEditing(false);
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await api.projects.delete(id);
      router.push('/workspaces');
    } catch {}
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisMessage(null);
    try {
      const res = await api.projects.analyze(id);
      if (res.success) {
        setAnalysisMessage('Análisis completado. Los objetivos han sido evaluados en base a los commits.');
        load();
      }
    } catch (e: any) {
      setAnalysisMessage('Error al analizar con IA: ' + (e.message || 'Error en el servidor'));
    } finally {
      setAnalyzing(false);
    }
  };

  const createObjective = async () => {
    setObjCreateError(null);
    if (!newTitle.trim()) {
      setObjCreateError('Por favor ingresa un título para el objetivo.');
      return;
    }
    try {
      const res = await api.objectives.create(id, newTitle.trim(), newDesc.trim() || undefined);
      if (res.objective) {
        setObjectives((prev) => [res.objective, ...prev]);
        setNewTitle('');
        setNewDesc('');
        setShowCreate(false);
      } else if (res.message) {
        setObjCreateError(res.message);
      } else {
        setObjCreateError('No se pudo crear el objetivo.');
      }
    } catch (err: any) {
      setObjCreateError(err?.message || 'Error al conectar con el servidor.');
    }
  };

  const deleteObjective = async (id: string) => {
    try {
      await api.objectives.delete(id);
      setObjectives((prev) => prev.filter((o) => o.id !== id));
      setDeletingObjId(null);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
        <div className="w-full max-w-3xl space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Proyecto no encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
      <div className="w-full max-w-3xl space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Volver
        </button>

        {/* Project Header & Connected Repos */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {editing ? (
            <>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-3 text-lg font-semibold"
                autoFocus
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 mb-4"
              />
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveEdit}
                  className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                >
                  Guardar
                </motion.button>
                <button onClick={() => setEditing(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-gray-100"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Connected Repos Banner */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="text-primary" size={18} />
                  <span className="text-xs font-semibold text-foreground">Repositorios GitHub:</span>
                  {connectedRepos.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {connectedRepos.map((repo) => (
                        <span key={repo.id} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-mono font-medium">
                          {repo.fullName || `${repo.owner}/${repo.name}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">
                      Ningún repositorio vinculado
                    </span>
                  )}
                </div>
                <Link
                  href="/repositories"
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <LinkIcon size={12} />
                  {connectedRepos.length > 0 ? 'Administrar repos' : 'Vincular un repositorio'}
                </Link>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-5"
            >
              <p className="text-sm text-red-700 mb-4">¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-medium"
                >
                  Eliminar
                </motion.button>
                <button onClick={() => setConfirmDelete(false)} className="text-red-600 px-5 py-2 rounded-xl text-sm hover:bg-red-100">
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Header for Objectives & AI Analysis */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Target size={18} className="text-primary" />
            Objetivos del Proyecto
          </h2>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} className={`text-amber-400 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Leyendo Commits & Analizando IA...' : 'Sincronizar y Analizar con IA'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus size={14} />
              Nuevo Objetivo
            </motion.button>
          </div>
        </div>

        {analysisMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between"
          >
            <span>{analysisMessage}</span>
            <button onClick={() => setAnalysisMessage(null)} className="text-blue-600 hover:text-blue-900">
              <X size={14} />
            </button>
          </motion.div>
        )}

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Crear Objetivo</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                {objCreateError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {objCreateError}
                  </div>
                )}
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createObjective()}
                  placeholder="¿Qué objetivo o funcionalidad quieres lograr?"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Añade más detalles o especificaciones..."
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                />
                <div className="flex gap-3 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={createObjective}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                  >
                    Crear Objetivo
                  </motion.button>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {objectives.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-border rounded-2xl flex flex-col items-center justify-center py-14 shadow-sm"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Target className="text-primary" size={28} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Sin objetivos asignados</h3>
            <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
              Crea tu primer objetivo en este proyecto y vincula un repositorio para que la IA escanee los commits y evalúe su progreso.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              Crear Objetivo
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {objectives.map((obj, i) => {
              const status = statusConfig[obj.status] || statusConfig.pending;
              return (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-border hover:border-primary/30 rounded-2xl p-5 shadow-sm transition-all group space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${status.bg}`}>
                        <span className={status.color}>{status.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{obj.title}</h3>
                        {obj.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{obj.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeletingObjId(obj.id)}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${status.bg} ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {deletingObjId === obj.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <p className="text-xs text-red-700 mb-2">¿Eliminar este objetivo?</p>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => deleteObjective(obj.id)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          Eliminar
                        </motion.button>
                        <button onClick={() => setDeletingObjId(null)} className="text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-100">Cancelar</button>
                      </div>
                    </motion.div>
                  )}

                  {/* Progress Bar & Percentage */}
                  <div className="pl-11 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${obj.progress}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground font-mono">{obj.progress}%</span>
                    </div>

                    {/* AI Analysis Summary if present */}
                    {obj.summary && (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-900 flex items-center gap-1">
                          <Sparkles size={12} className="text-amber-500" /> Resumen de progreso (IA):
                        </p>
                        <p className="text-slate-600 leading-relaxed">{obj.summary}</p>
                      </div>
                    )}

                    {obj.tags?.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {obj.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-medium">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
