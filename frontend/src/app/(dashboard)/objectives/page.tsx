'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, X, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useProfileSettings } from '@/lib/settings-context';
import { translations } from '@/lib/translations';

interface Objective {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  tags: string[];
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}

const getStatusConfig = (lang: 'es' | 'en') => ({
  pending: { label: lang === 'en' ? 'Pending' : 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: <Clock size={12} /> },
  in_progress: { label: lang === 'en' ? 'In Progress' : 'En Progreso', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Target size={12} /> },
  partial: { label: lang === 'en' ? 'Partial' : 'Parcial', color: 'text-amber-600', bg: 'bg-amber-100', icon: <AlertCircle size={12} /> },
  completed: { label: lang === 'en' ? 'Completed' : 'Completado', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <CheckCircle size={12} /> },
  blocked: { label: lang === 'en' ? 'Blocked' : 'Bloqueado', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertCircle size={12} /> },
});

export default function ObjectivesPage() {
  const { user } = useAuth();
  const { settings } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang].objectives;

  const statusConfig = getStatusConfig(lang);

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    if (!user) return;
    Promise.all([
      api.objectives.listByUser(user.id),
      api.workspaces.list(user.id),
    ]).then(async ([objRes, wsRes]) => {
      setObjectives(objRes.objectives || []);
      const workspaces = wsRes.workspaces || [];
      const allProjects: Project[] = [];
      for (const ws of workspaces) {
        const projRes = await api.projects.list(ws.id);
        allProjects.push(...(projRes.projects || []));
      }
      setProjects(allProjects);
      if (allProjects.length > 0) {
        setSelectedProject((prev) => prev || allProjects[0].id);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('forgemind:refresh', handleRefresh);
    return () => window.removeEventListener('forgemind:refresh', handleRefresh);
  }, [user]);

  const create = async () => {
    setCreateError(null);
    if (!selectedProject) {
      setCreateError(t.errorNoProject);
      return;
    }
    if (!title.trim()) {
      setCreateError(t.errorNoTitle);
      return;
    }
    try {
      const res = await api.objectives.create(selectedProject, title.trim(), description.trim() || undefined);
      if (res.objective) {
        setObjectives((prev) => [res.objective, ...prev]);
        setTitle('');
        setDescription('');
        setShowCreate(false);
      } else if (res.message) {
        setCreateError(res.message);
      } else {
        setCreateError(t.errorCreate);
      }
    } catch (err: any) {
      setCreateError(err?.message || (lang === 'en' ? 'Error connecting to server.' : 'Error al conectar con el servidor.'));
    }
  };

  const deleteObjective = async (id: string) => {
    try {
      await api.objectives.delete(id);
      setObjectives((prev) => prev.filter((o) => o.id !== id));
      setDeletingId(null);
    } catch {}
  };

  const filtered = filter === 'all' ? objectives : objectives.filter((o) => o.status === filter);

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            {t.newObjective}
          </motion.button>
        </div>

        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {['all', ...Object.keys(statusConfig)].map((s) => {
            const cfg = s !== 'all' ? statusConfig[s as keyof typeof statusConfig] : null;
            return (
              <motion.button
                key={s}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFilter(s)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === s ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-gray-100'
                }`}
              >
                {cfg ? <span className="flex items-center gap-1.5">{cfg.icon}{cfg.label}</span> : (lang === 'en' ? 'All' : 'Todos')}
              </motion.button>
            );
          })}
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
                  <h3 className="text-sm font-medium">{t.createTitle}</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                {createError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {createError}
                  </div>
                )}
                {projects.length > 0 && (
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-3"
                  >
                    <option value="">{t.selectProject}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground mb-3">{t.noProjectsMsg}</p>
                )}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && create()}
                  placeholder={t.titlePlaceholder}
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-3"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descPlaceholder}
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 mb-4"
                />
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={create}
                    disabled={!selectedProject || projects.length === 0}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {t.createBtn}
                  </motion.button>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                    {t.cancel}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-border rounded-2xl p-5 animate-pulse space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Target className="text-primary" size={28} />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">{t.noObjectives}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t.noObjectivesSub}</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              {t.newObjective}
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((obj, i) => {
              const status = statusConfig[obj.status as keyof typeof statusConfig] || statusConfig.pending;
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
                        onClick={() => setDeletingId(obj.id)}
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
                  {deletingId === obj.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <p className="text-xs text-red-700 mb-2">{t.deleteConfirm}</p>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => deleteObjective(obj.id)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          {t.deleteBtn}
                        </motion.button>
                        <button onClick={() => setDeletingId(null)} className="text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-100">{t.cancel}</button>
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
