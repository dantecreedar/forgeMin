'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { ArrowLeft, Edit3, Trash2, Plus, X, CheckCircle, Clock, AlertCircle, Target } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-gray-600', bg: 'bg-gray-100', icon: <Clock size={12} /> },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Target size={12} /> },
  partial: { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-100', icon: <AlertCircle size={12} /> },
  completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <CheckCircle size={12} /> },
  blocked: { label: 'Blocked', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertCircle size={12} /> },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingObjId, setDeletingObjId] = useState<string | null>(null);

  const [objCreateError, setObjCreateError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    Promise.all([
      api.projects.get(id),
      api.objectives.list(id),
    ]).then(([projRes, objRes]) => {
      setProject(projRes.project);
      setObjectives(objRes.objectives || []);
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
        <div className="w-full max-w-2xl space-y-4 animate-pulse">
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
        <p className="text-sm text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm mb-6">
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
                placeholder="Description (optional)"
                className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 mb-4"
              />
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveEdit}
                  className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                >
                  Save
                </motion.button>
                <button onClick={() => setEditing(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
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
            </>
          )}
        </div>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5"
            >
              <p className="text-sm text-red-700 mb-4">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-medium"
                >
                  Delete
                </motion.button>
                <button onClick={() => setConfirmDelete(false)} className="text-red-600 px-5 py-2 rounded-xl text-sm hover:bg-red-100">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Objectives</h2>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            New Objective
          </motion.button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Create Objective</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                {objCreateError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {objCreateError}
                  </div>
                )}
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createObjective()}
                  placeholder="What do you want to achieve?"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-3"
                  autoFocus
                />
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Add more details..."
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 mb-4"
                />
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={createObjective}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                  >
                    Create
                  </motion.button>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                    Cancel
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
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Target className="text-primary" size={28} />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No objectives yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Create your first objective for this project</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              Create Objective
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {objectives.map((obj, i) => {
              const status = statusConfig[obj.status] || statusConfig.pending;
              return (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-border rounded-2xl p-5 shadow-sm group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${status.bg}`}>
                        <span className={status.color}>{status.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{obj.title}</h3>
                        {obj.description && (
                          <p className="text-xs text-muted-foreground mt-1">{obj.description}</p>
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
                      <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${status.bg} ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {deletingObjId === obj.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <p className="text-xs text-red-700 mb-2">Delete this objective?</p>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => deleteObjective(obj.id)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          Delete
                        </motion.button>
                        <button onClick={() => setDeletingObjId(null)} className="text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-100">Cancel</button>
                      </div>
                    </motion.div>
                  )}
                  <div className="ml-11">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${obj.progress}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{obj.progress}%</span>
                    </div>
                    {obj.tags?.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {obj.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{tag}</span>
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
