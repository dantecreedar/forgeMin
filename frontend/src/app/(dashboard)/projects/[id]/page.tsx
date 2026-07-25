'use client';

import { useState, useEffect, useRef } from 'react';

import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { 
  ArrowLeft, Edit3, Trash2, Plus, X, CheckCircle, Clock, AlertCircle, Target, 
  Sparkles, FolderGit2, RefreshCw, Link as LinkIcon, Table, LayoutGrid, Download, 
  FileText, Paperclip, Upload, File, HardDrive, BookOpen, ExternalLink
} from 'lucide-react';

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
  const [documents, setDocuments] = useState<any[]>([]);
  const [readmeSummary, setReadmeSummary] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // View mode: 'cards' vs 'excel'
  const [viewMode, setViewMode] = useState<'cards' | 'excel'>('cards');

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Upload document modal
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingObjId, setDeletingObjId] = useState<string | null>(null);
  const [objCreateError, setObjCreateError] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  const hasFetchedReadmeRef = useRef(false);

  const [gitActivity, setGitActivity] = useState<any>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [statusSummary, setStatusSummary] = useState<any>(null);

  const loadData = async (autoAnalyze = false) => {
    if (!id) return;
    try {
      const [projRes, objRes, repoRes, docRes] = await Promise.all([
        api.projects.get(id),
        api.objectives.list(id),
        api.repositories.listByProject(id),
        api.documents.listByProject(id),
      ]);
      setProject(projRes.project);
      setObjectives(objRes.objectives || []);
      setConnectedRepos(repoRes.repositories || []);
      setDocuments(docRes.documents || []);
      setEditName(projRes.project?.name || '');
      setEditDesc(projRes.project?.description || '');

      // Load Status Summary & Git Activity
      api.projects.getStatusSummary(id)
        .then((res) => setStatusSummary(res))
        .catch(() => {});

      api.projects.getGitActivity(id)
        .then((res) => setGitActivity(res))
        .catch(() => {})
        .finally(() => setLoadingActivity(false));

      // Load Readme Summary ONCE if repo connected
      if ((repoRes.repositories || []).length > 0 && !hasFetchedReadmeRef.current) {
        hasFetchedReadmeRef.current = true;
        setLoadingReadme(true);
        api.projects.getReadmeSummary(id)
          .then((res) => setReadmeSummary(res.summary))
          .catch(() => {})
          .finally(() => setLoadingReadme(false));
      }



      // Trigger automatic sync & analysis on mount if requested
      if (autoAnalyze) {
        api.projects.analyze(id).then(() => {
          api.objectives.list(id).then((r) => setObjectives(r.objectives || []));
        }).catch(() => {});
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true); // Auto-sync on page mount!
    const handleRefresh = () => loadData(false);
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
        setAnalysisMessage('Análisis automático completado exitosamente.');
        loadData(false);
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
      }
    } catch (err: any) {
      setObjCreateError(err?.message || 'Error al conectar con el servidor.');
    }
  };

  const deleteObjective = async (objId: string) => {
    try {
      await api.objectives.delete(objId);
      setObjectives((prev) => prev.filter((o) => o.id !== objId));
      setDeletingObjId(null);
    } catch {}
  };

  // Upload file attachment handler
  const handleUploadDocument = async () => {
    if (!uploadName.trim()) return;
    try {
      const extension = uploadName.split('.').pop()?.toUpperCase() || 'DOC';
      const res = await api.documents.create(
        id,
        uploadName.trim(),
        extension,
        1024 * 50,
        uploadUrl.trim() || undefined
      );
      if (res.document) {
        setDocuments((prev) => [res.document, ...prev]);
        setUploadName('');
        setUploadUrl('');
        setShowUploadDoc(false);
      }
    } catch {}
  };

  const deleteDocument = async (docId: string) => {
    try {
      await api.documents.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {}
  };

  // Export Objectives Table / Commit Updates to Excel CSV format
  const exportToExcelCSV = () => {
    const headers = ['ID / Hash', 'Titulo / Actualizacion', 'Descripcion / Detalle', 'Estado', 'Progreso (%)', 'Resumen IA'];
    let rows: string[][] = [];

    if (objectives.length > 0) {
      rows = objectives.map((o) => [
        `"${o.id}"`,
        `"${o.title.replace(/"/g, '""')}"`,
        `"${(o.description || '').replace(/"/g, '""')}"`,
        `"${o.status}"`,
        `"${o.progress}%"`,
        `"${(o.summary || '').replace(/"/g, '""')}"`,
      ]);
    } else if (gitActivity?.commits && gitActivity.commits.length > 0) {
      rows = gitActivity.commits.map((c: any) => [
        `"${c.sha?.substring(0, 7) || 'local'}"`,
        `"${c.message.replace(/"/g, '""')}"`,
        `"Actualización por ${c.authorName}"`,
        `"Cumplido"`,
        `"100%"`,
        `"${(gitActivity.explanation || '').replace(/"/g, '""')}"`,
      ]);
    }

    if (rows.length === 0) return;

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `actualizaciones_proyecto_${project.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
        <div className="w-full max-w-4xl space-y-4 animate-pulse">
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
      <div className="w-full max-w-4xl space-y-6">
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
                className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-primary/20 mb-3"
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
                    <div className="flex flex-wrap gap-2">
                      {connectedRepos.map((repo) => {
                        const repoFullName = repo.fullName || `${repo.owner}/${repo.name}`;
                        const repoUrl = `https://github.com/${repoFullName}`;
                        return (
                          <a
                            key={repo.id}
                            href={repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-mono font-semibold flex items-center gap-1.5 transition-all shadow-2xs group"
                            title={`Abrir ${repoFullName} en GitHub`}
                          >
                            <FolderGit2 size={13} className="text-purple-600" />
                            <span>{repoFullName}</span>
                            <ExternalLink size={11} className="text-purple-400 group-hover:text-purple-700 transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">
                      Ningún repositorio vinculado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {connectedRepos.length > 0 && (
                    <a
                      href={`https://github.com/${connectedRepos[0].fullName || `${connectedRepos[0].owner}/${connectedRepos[0].name}`}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <FolderGit2 size={13} className="text-purple-400" />
                      Abrir en GitHub <ExternalLink size={11} />
                    </a>
                  )}
                  <Link
                    href="/repositories"
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <LinkIcon size={12} />
                    {connectedRepos.length > 0 ? 'Administrar repos' : 'Vincular repositorio'}
                  </Link>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Sección: Estado del Proyecto (Salud, KPIs y Flujo de Etapas) */}
        {statusSummary && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 text-left">
            {/* Header & Health Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Estado del Proyecto</h3>
                  <p className="text-[10px] text-slate-400">Evaluación consolidada de avance y salud de desarrollo</p>
                </div>
              </div>

              <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                statusSummary.healthStatus === 'critical'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : statusSummary.healthStatus === 'at_risk'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  statusSummary.healthStatus === 'critical' ? 'bg-red-500 animate-ping' : statusSummary.healthStatus === 'at_risk' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                {statusSummary.healthLabel}
              </span>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* KPI 1: Overall Progress */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progreso Consolidado</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 font-mono">{statusSummary.overallProgress}%</span>
                  <span className="text-[10px] font-semibold text-slate-500">De objetivos globales</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${statusSummary.overallProgress}%` }} />
                </div>
              </div>

              {/* KPI 2: Objectives Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Objetivos & Metas</span>
                {statusSummary.stats?.total === 0 ? (
                  <>
                    <p className="text-xs font-bold text-amber-800">Sin objetivos manuales</p>
                    <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
                      Evaluado por actualizaciones de commits.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-900">
                      {statusSummary.stats?.completed || 0} / {statusSummary.stats?.total || 0} Completados
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                      <span className="text-blue-600 font-medium">{statusSummary.stats?.inProgress || 0} en curso</span>
                      <span>•</span>
                      <span className="text-red-500 font-medium">{statusSummary.stats?.blocked || 0} bloqueados</span>
                    </div>
                  </>
                )}
              </div>

              {/* KPI 3: Code & Development State */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Control de Código</span>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {statusSummary.hasUncommittedChanges ? 'Modificaciones en Local' : 'Git Sincronizado'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {statusSummary.connectedReposCount > 0 ? `${statusSummary.connectedReposCount} repositorio(s) vinculados` : 'Entorno local activo'}
                </p>
              </div>
            </div>

            {/* Visual Lifecycle Pipeline Flow (Flujo de Etapas) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Flujo de Etapas del Proyecto (Pipeline):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 relative">
                {statusSummary.phases?.map((phase: any, idx: number) => {
                  const isCompleted = phase.status === 'completed';
                  const isInProgress = phase.status === 'in_progress';

                  return (
                    <div
                      key={phase.id || idx}
                      className={`relative border rounded-xl p-3 text-left transition-all ${
                        isCompleted
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : isInProgress
                          ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-100 text-blue-950'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase opacity-80">Paso {idx + 1}</span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-200/70 text-emerald-800'
                            : isInProgress
                            ? 'bg-blue-200 text-blue-800 font-bold animate-pulse'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {phase.label}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold truncate">{phase.name}</h5>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AI Executive Summary from README.md - Clean White Card */}
        {connectedRepos.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Resumen Ejecutivo del Proyecto</h3>
                  <p className="text-[10px] text-slate-400">Análisis ejecutivo inteligente de la aplicación</p>

                </div>
              </div>
              {loadingReadme && <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full animate-pulse">Analizando proyecto...</span>}

            </div>
            {readmeSummary ? (
              <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap pt-1 space-y-1">
                {readmeSummary}
              </div>
            ) : !loadingReadme ? (
              <p className="text-xs text-slate-400 italic pt-1">
                Haz clic en Sincronizar para escanear el README.md del repositorio de GitHub.
              </p>
            ) : null}
          </div>
        )}

        {/* Live Git Activity Graph & Development Timeline */}
        {(connectedRepos.length > 0 || gitActivity) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <FolderGit2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Grafo Visual de Desarrollo (Commits & Pushes)
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      En vivo
                    </span>
                    {gitActivity?.isLocalMode ? (
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        Git Local Workspace
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                        GitHub Remote
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400">Flujo visual de desarrollo y control de versiones en tiempo real</p>
                </div>
              </div>
              {loadingActivity && <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full animate-pulse">Obteniendo actividad...</span>}
            </div>

            {/* Clean White Card Showing Only What Was Done */}
            {gitActivity?.explanation && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-left">
                <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {gitActivity.explanation.replace(/^.*?(aquí (tienen|tienes)|en este resumen|a continuación|resumen de|avances recientes):?\s*/gi, '').trim()}
                </p>
              </div>
            )}

            {/* Branches Discovery Block */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ramas del Repositorio ({gitActivity?.branches?.length || 1})
                </span>
                {!gitActivity?.hasMultipleBranches && (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Rama única activa: {gitActivity?.defaultBranch || 'main'}
                  </span>
                )}
              </div>

              {gitActivity?.branches && gitActivity.branches.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {gitActivity.branches.map((b: any, idx: number) => {
                    const typeColors: Record<string, string> = {
                      production: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      development: 'bg-blue-50 text-blue-700 border-blue-200',
                      qa: 'bg-amber-50 text-amber-700 border-amber-200',
                      feature: 'bg-purple-50 text-purple-700 border-purple-200',
                    };
                    const badgeClass = typeColors[b.type] || typeColors.feature;
                    const label = b.categoryLabel || (b.type === 'production' ? 'Producción' : b.type === 'development' ? 'Desarrollo' : b.type === 'qa' ? 'Pruebas QA' : 'Característica');

                    return (
                      <div
                        key={b.name + idx}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-left group hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 truncate">
                              {b.name}
                            </span>
                            <span className={`text-[9px] font-semibold border px-1.5 py-0.2 rounded-md ${badgeClass}`}>
                              {label}
                            </span>
                            {b.isDefault && (
                              <span className="text-[9px] bg-slate-200 text-slate-800 font-semibold px-1.5 py-0.2 rounded font-mono">
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            Por: <strong className="text-slate-700 font-medium">{b.creatorName}</strong>
                          </p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0 ml-2">
                          {b.relativeDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                  Solo existe 1 rama activa en este repositorio (<strong>{gitActivity?.defaultBranch || 'main'}</strong>). No hay ramas secundarias adicionales registradas.
                </div>
              )}
            </div>

            {/* Visual Node Graph Pipeline Flow */}
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span>Flujo de Ramas & Pipeline de Código:</span>
                <span className="text-[10px] font-mono font-normal text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Rama: {gitActivity?.defaultBranch || 'main'}
                </span>
              </p>

              <div className="relative pl-6 space-y-3 border-l-2 border-gradient-to-b from-purple-500 to-indigo-500">
                {/* Active Working Tree Node (Local Uncommitted Work) */}
                {gitActivity?.localStatus?.hasUncommittedChanges && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative group"
                  >
                    <div className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white ring-4 ring-amber-100 animate-pulse" />
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 space-y-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          ⚡ Trabajo Local en Desarrollo (Sin Commit)
                        </span>
                        <span className="text-[9px] font-mono font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                          EN PROGRESO
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        {gitActivity.localStatus.modifiedFiles.length} archivo(s) modificados listos para ser guardados en el historial.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Commit History Flow Nodes */}
                {gitActivity?.commits && gitActivity.commits.length > 0 ? (
                  gitActivity.commits.map((commit: any, idx: number) => (
                    <motion.div
                      key={commit.sha || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="relative group"
                    >
                      {/* Branch Pipeline Node Bullet */}
                      <div className={`absolute -left-[31px] top-3 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs group-hover:scale-125 transition-transform ${
                        commit.isLocal ? 'bg-blue-600' : 'bg-purple-600'
                      }`} />

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 hover:bg-slate-100/80 transition-colors space-y-1.5 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate flex-1">
                            {commit.message}
                          </p>
                          {commit.url ? (
                            <a
                              href={commit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-purple-600 font-mono hover:underline shrink-0 bg-purple-50 px-2 py-0.5 rounded"
                            >
                              #{commit.sha?.substring(0, 7)} <ExternalLink size={9} className="inline" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-200 px-2 py-0.5 rounded">
                              #{commit.sha?.substring(0, 7) || 'local'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span>Por: <strong className="text-slate-700 font-medium">{commit.authorName}</strong></span>
                            <span>•</span>
                            <span>Rama: <strong className="text-purple-700 font-mono">{gitActivity.defaultBranch || 'main'}</strong></span>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-semibold ${
                            commit.isLocal ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {commit.isLocal ? 'Git Local' : 'GitHub'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : !loadingActivity ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Aún no hay commits o pushes registrados en este repositorio.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}



        {/* Documents & File Attachments Section */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Documentos y Archivos Adjuntos ({documents.length})</h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowUploadDoc(true)}
              className="text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5"
            >
              <Upload size={14} /> Adjuntar Documento
            </motion.button>
          </div>

          <AnimatePresence>
            {showUploadDoc && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900">Vincular Documento al Proyecto</h4>
                  <button onClick={() => setShowUploadDoc(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Nombre del documento (ej. Especificaciones_Tecnicas.pdf)"
                  className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <input
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="URL o enlace del archivo (opcional)"
                  className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUploadDocument}
                    className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Guardar Archivo
                  </button>
                  <button onClick={() => setShowUploadDoc(false)} className="text-muted-foreground px-4 py-1.5 rounded-lg text-xs">Cancelar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2 text-center">No hay documentos o especificaciones adjuntas todavía.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">
                      {doc.fileType || 'DOC'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{doc.fileName}</p>
                      <p className="text-[10px] text-slate-500">Adjuntado recientemente</p>
                    </div>
                  </div>
                  <button onClick={() => deleteDocument(doc.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objectives Section with View Mode Toggle */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Target size={18} className="text-primary" />
                Objetivos del Proyecto
              </h2>

              {/* View Switcher: Cards vs Excel Spreadsheet */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid size={13} /> Tarjetas
                </button>
                <button
                  onClick={() => setViewMode('excel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    viewMode === 'excel' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table size={13} className="text-emerald-600" /> Excel Grid
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'excel' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportToExcelCSV}
                  className="bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-emerald-800 transition-all whitespace-nowrap"
                >
                  <Download size={14} /> Exportar Excel (.csv)
                </motion.button>
              )}


              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                disabled={analyzing}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Sparkles size={14} className={`text-amber-400 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analizando Commits...' : 'Sincronizar y Analizar'}
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

          {/* VIEW MODE: CARDS */}
          {viewMode === 'cards' ? (
            objectives.length === 0 ? (
              <div className="bg-white border border-border rounded-2xl flex flex-col items-center justify-center py-14 shadow-sm">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Target className="text-primary" size={28} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Sin objetivos asignados</h3>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                  Crea tu primer objetivo para evaluarlo contra los commits del repositorio.
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreate(true)}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Crear Objetivo
                </motion.button>
              </div>
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

                        {obj.summary && (
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 space-y-1">
                            <p className="font-semibold text-slate-900 flex items-center gap-1">
                              <Sparkles size={12} className="text-amber-500" /> Resumen de progreso (IA):
                            </p>
                            <p className="text-slate-600 leading-relaxed">{obj.summary}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          ) : (
            /* VIEW MODE: EXCEL SPREADSHEET GRID */
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-900 text-white font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-3 w-12 text-center border-r border-slate-800 font-mono text-[10px]">#</th>
                      <th className="py-3.5 px-4 border-r border-slate-800 min-w-[200px]">Título del Objetivo</th>
                      <th className="py-3.5 px-4 border-r border-slate-800 min-w-[220px]">Descripción / Notas</th>
                      <th className="py-3.5 px-4 border-r border-slate-800 w-32">Estado</th>
                      <th className="py-3.5 px-4 border-r border-slate-800 w-32">Progreso</th>
                      <th className="py-3.5 px-4 border-r border-slate-800 min-w-[240px]">Resumen de IA (Commits)</th>
                      <th className="py-3.5 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {objectives.length > 0 ? (
                      objectives.map((obj, index) => {
                        const status = statusConfig[obj.status] || statusConfig.pending;
                        return (
                          <tr key={obj.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="p-3 text-center border-r border-slate-100 text-slate-400 font-mono text-[11px] font-semibold">
                              {index + 1}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 font-semibold text-slate-900">
                              {obj.title}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 text-slate-600">
                              {obj.description || <span className="text-slate-300 italic">Sin descripción</span>}
                            </td>
                            <td className="p-3.5 border-r border-slate-100">
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 w-fit ${status.bg} ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="p-3.5 border-r border-slate-100 font-mono font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${obj.progress || 0}%` }} />
                                </div>
                                <span className="text-[11px]">{obj.progress}%</span>
                              </div>
                            </td>
                            <td className="p-3.5 border-r border-slate-100 text-slate-600 leading-relaxed text-[11px]">
                              {obj.summary || <span className="text-slate-400 italic">Sincronizado con commits</span>}
                            </td>
                            <td className="p-3.5 text-center">
                              <button onClick={() => setDeletingObjId(obj.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : gitActivity?.commits && gitActivity.commits.length > 0 ? (
                      gitActivity.commits.map((commit: any, index: number) => (
                        <tr key={commit.sha || index} className="hover:bg-purple-50/40 transition-colors">
                          <td className="p-3 text-center border-r border-slate-100 text-slate-400 font-mono text-[11px] font-semibold">
                            {index + 1}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-semibold text-slate-900">
                            {commit.message}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 text-slate-600 font-mono text-[11px]">
                            Por: {commit.authorName} ({commit.sha?.substring(0, 7) || 'local'})
                          </td>
                          <td className="p-3.5 border-r border-slate-100">
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle size={10} /> Cumplido
                            </span>
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-mono font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                              </div>
                              <span className="text-[11px]">100%</span>
                            </div>
                          </td>
                          <td className="p-3.5 border-r border-slate-100 text-slate-700 leading-relaxed text-[11px]">
                            {gitActivity.explanation || 'Actualización de código registrada'}
                          </td>
                          <td className="p-3.5 text-center">
                            {commit.url && (
                              <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-900">
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                          No hay objetivos manuales ni publicaciones de commits registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          )}
        </div>
      </div>

      {/* Modal: Crear Objetivo */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="text-primary" size={20} />
                  <h3 className="font-semibold text-foreground text-base">Nuevo Objetivo</h3>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              {objCreateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {objCreateError}
                </div>
              )}

              <div className="space-y-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createObjective()}
                  placeholder="Título del objetivo (ej. Implementar Autenticación)"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descripción detallada o entregables (opcional)"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                />

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={createObjective}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    Crear Objetivo
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2.5 text-muted-foreground hover:bg-gray-100 rounded-xl text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación: Eliminar Proyecto */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-red-100 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">¿Eliminar Proyecto?</h3>
                  <p className="text-xs text-slate-500">Confirmación de acción destructiva</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-red-50/50 p-3 rounded-xl border border-red-100">
                Esta acción no se puede deshacer. Se eliminarán los objetivos y configuraciones asociadas al proyecto <strong className="text-slate-900">{project.name}</strong>.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Sí, Eliminar Proyecto
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación: Eliminar Objetivo */}
      <AnimatePresence>
        {deletingObjId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-red-100 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">¿Eliminar Objetivo?</h3>
                  <p className="text-xs text-slate-500">Confirmar eliminación</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas borrar este objetivo? Se removerá del proyecto y del análisis de commits.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => deleteObjective(deletingObjId)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Eliminar Objetivo
                </button>
                <button
                  onClick={() => setDeletingObjId(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

