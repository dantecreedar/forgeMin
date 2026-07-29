'use client';

import { useState, useEffect, useRef } from 'react';

import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { 
  ArrowLeft, Edit3, Trash2, Plus, X, CheckCircle, Clock, AlertCircle, Target, 
  Sparkles, FolderGit2, RefreshCw, Link as LinkIcon, Table, LayoutGrid, Download, 
  FileText, Paperclip, Upload, File, HardDrive, BookOpen, ExternalLink, Mail, Send,
  Code2, ShieldAlert, Cpu, Check, Layers, ChevronDown, ChevronUp,
  Bookmark, FileCode, Printer, Maximize2, CheckCircle2, Building2
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
  const [architectureReport, setArchitectureReport] = useState<any>(null);
  const [analyzingArchitecture, setAnalyzingArchitecture] = useState(false);
  const [archError, setArchError] = useState<string | null>(null);
  const [showAllCommits, setShowAllCommits] = useState(false);

  // Focus Mode
  const [isFocusMode, setIsFocusMode] = useState(false);
  const archCardRef = useRef<HTMLDivElement>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement>(null);

  // Architecture Modal & Feature States
  const [showArchModal, setShowArchModal] = useState(false);
  const [archDocMode, setArchDocMode] = useState(false);
  const [isSavedArch, setIsSavedArch] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleAnalyzeArchitecture = async () => {
    setAnalyzingArchitecture(true);
    setIsFocusMode(true);
    setArchError(null);
    try {
      const res = await api.projects.analyzeArchitecture(id);
      if (res.success && res.report) {
        setArchitectureReport(res.report);
        setTimeout(() => {
          archCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else {
        setArchError(res.message || 'Error al analizar la arquitectura.');
        setIsFocusMode(false);
      }
    } catch (e: any) {
      setArchError(e.message || 'Error de red al conectar con el servidor.');
      setIsFocusMode(false);
    } finally {
      setAnalyzingArchitecture(false);
    }
  };

  const handleSaveArchitecture = () => {
    if (!architectureReport) return;
    try {
      const savedKey = `saved_arch_reports_${id}`;
      const existingStr = localStorage.getItem(savedKey);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const newEntry = {
        id: Date.now().toString(),
        projectId: id,
        projectName: project?.name || 'Proyecto',
        savedAt: new Date().toISOString(),
        report: architectureReport,
      };
      existing.unshift(newEntry);
      localStorage.setItem(savedKey, JSON.stringify(existing));
      setIsSavedArch(true);
      setSaveSuccessMsg('¡Informe guardado con éxito en Guardados!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch {
      setSaveSuccessMsg('No se pudo guardar localmente.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleExportPDF = () => {
    const prevMode = archDocMode;
    setArchDocMode(true);
    setTimeout(() => {
      window.print();
      setArchDocMode(prevMode);
    }, 200);
  };

  const handleSendArchEmail = () => {
    if (!architectureReport) return;
    
    const cleanMarkdown = (str: string) => {
      if (!str) return '';
      return str
        .replace(/\*{1,3}/g, '') // Elimina asteriscos de negrita/itálica
        .replace(/`/g, '')       // Elimina comillas de código
        .trim();
    };

    const cleanIssues = (architectureReport.issues || []).map((i: any, idx: number) => {
      const severity = i.severity ? `[Prioridad: ${i.severity.toUpperCase()}]` : '';
      const title = cleanMarkdown(i.title);
      const desc = cleanMarkdown(i.description);
      const rec = i.recommendation ? `\n   Recomendación: ${cleanMarkdown(i.recommendation)}` : '';
      return `${idx + 1}. ${severity} ${title}\n   Detalle: ${desc}${rec}`;
    }).join('\n\n');

    const cleanStrengths = (architectureReport.strengths || []).map((s: string) => `• ${cleanMarkdown(s)}`).join('\n');
    const cleanRecommendations = (architectureReport.recommendations || []).map((r: string) => `• ${cleanMarkdown(r)}`).join('\n');

    const summaryText = `INFORME DE ARQUITECTURA Y CÓDIGO - ${project?.name?.toUpperCase() || 'PROYECTO'}
Patrón de Arquitectura: ${architectureReport.architecturePattern || 'N/A'}
Mantenibilidad: ${architectureReport.maintainabilityScore ?? 0}/100 | Complejidad: ${architectureReport.complexityScore ?? 0}/100

Resumen Ejecutivo:
${cleanMarkdown(architectureReport.overview) || 'Sin descripción disponible.'}

Hallazgos e Issues Detectados (${architectureReport.issues?.length || 0}):
${cleanIssues || 'Ningún issue crítico detectado.'}

Fortalezas del Sistema:
${cleanStrengths || 'Sin fortalezas registradas.'}

Recomendaciones de Mejora:
${cleanRecommendations || 'Sin recomendaciones registradas.'}`;

    setEmailSubject(`[ForgeMind] Informe de Arquitectura de Código: ${project?.name || 'Proyecto'}`);
    setEmailContent(summaryText);
    setShowArchModal(false);
    setShowEmailModal(true);
  };

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

  const [gmailConnected, setGmailConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check saved Gmail token or URL params from Google OAuth redirect
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('access_token');
      const urlEmail = urlParams.get('email');

      if (urlToken && urlEmail) {
        localStorage.setItem('gmail_access_token', urlToken);
        localStorage.setItem('gmail_email', urlEmail);
        setGmailConnected(true);
        setGmailToken(urlToken);
        setGmailEmail(urlEmail);
      } else {
        const token = localStorage.getItem('gmail_access_token');
        const email = localStorage.getItem('gmail_email');
        if (token && email) {
          setGmailConnected(true);
          setGmailToken(token);
          setGmailEmail(email);
        }
      }
    }
  }, []);

  const connectGmail = async () => {
    try {
      const res = await api.gmail.getAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert('Error al iniciar vinculación con Google: ' + (err.message || 'Verifica GOOGLE_CLIENT_ID en backend/.env'));
    }
  };

  const openSendEmailModal = () => {
    setEmailSubject(`Reporte de Avances: ${project?.name || 'Proyecto'}`);
    const summaryText = gitActivity?.explanation || 'El proyecto se encuentra actualizado y en desarrollo activo.';
    setEmailContent(`Reporte Ejecutivo para ${project?.name || 'el proyecto'}:\n\n${summaryText}\n\n- Progreso Consolidado: ${statusSummary?.overallProgress || 0}%\n- Estado de Salud: ${statusSummary?.healthLabel || 'Saludable'}`);
    setEmailSuccessMsg(null);
    setEmailErrorMsg(null);
    setShowEmailModal(true);
  };

  const handleSendReportEmail = async () => {
    if (!emailTo.trim()) {
      setEmailErrorMsg('Por favor ingresa un correo destinatario.');
      return;
    }
    if (!gmailToken) {
      setEmailErrorMsg('Debes vincular tu cuenta de Gmail primero.');
      return;
    }

    setSendingEmail(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const res = await api.gmail.sendReport({
        accessToken: gmailToken,
        to: emailTo.trim(),
        subject: emailSubject.trim() || `Reporte: ${project?.name}`,
        content: emailContent,
        projectName: project?.name,
      });

      if (res.success) {
        setEmailSuccessMsg('¡Correo enviado exitosamente!');
        setTimeout(() => setShowEmailModal(false), 2000);
      } else {
        const errorMsg = res.message || 'Error al despachar el correo.';
        setEmailErrorMsg(errorMsg);
        // Si el token expiró (error de Google usualmente contiene "credential" o "invalid"), forzar re-vinculación
        if (errorMsg.toLowerCase().includes('credential') || errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('expired')) {
          localStorage.removeItem('gmail_access_token');
          localStorage.removeItem('gmail_email');
          setGmailConnected(false);
          setGmailToken(null);
        }
      }
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Error al despachar el correo.');
    } finally {
      setSendingEmail(false);
    }
  };

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
      if (projRes.project?.workspaceId) {
        api.workspaces.get(projRes.project.workspaceId).then((wsRes) => {
          if (wsRes.workspace?.name) {
            setWorkspaceName(wsRes.workspace.name);
          }
        }).catch(() => {});
      }
      setObjectives(objRes.objectives || []);
      setConnectedRepos(repoRes.repositories || []);
      setDocuments(docRes.documents || []);
      setEditName(projRes.project?.name || '');
      setEditDesc(projRes.project?.description || '');

      // Load persisted architecture report if exists
      if (projRes.project?.architectureReport) {
        setArchitectureReport(projRes.project.architectureReport);
      }

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

    // Check if redirect requested auto opening of architecture modal
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('openArch') === 'true') {
        setShowArchModal(true);
      }
    }

    const handleRefresh = () => loadData(false);
    window.addEventListener('forgemind:refresh', handleRefresh);

    // Auto-poll Git activity every 8 seconds for real-time commit detection
    const pollInterval = setInterval(() => {
      api.projects.getGitActivity(id)
        .then((res) => setGitActivity(res))
        .catch(() => {});
    }, 8000);

    const handleFocus = () => {
      api.projects.getGitActivity(id)
        .then((res) => setGitActivity(res))
        .catch(() => {});
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('forgemind:refresh', handleRefresh);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
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
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-6 relative">
      {/* BACKGROUND OVERLAY BLOQUEANTE - MODO FOCO / ANÁLISIS */}
      {(isFocusMode || analyzingArchitecture) && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-40 pointer-events-auto transition-all duration-300" />
      )}

      <div className="w-full max-w-4xl space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Volver
        </button>

        {/* Project Header & Connected Repos */}
        <div className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all duration-300 ${
          analyzingArchitecture
            ? 'relative z-50 ring-4 ring-indigo-500/35 border-indigo-400 scale-[1.01] shadow-2xl bg-white pointer-events-auto'
            : ''
        }`}>
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
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                    {workspaceName && (
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Building2 size={12} className="text-slate-500" />
                        Workspace: {workspaceName}
                      </span>
                    )}
                  </div>
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
                    <button
                      ref={analyzeButtonRef}
                      onClick={handleAnalyzeArchitecture}
                      disabled={analyzingArchitecture}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                      title="Analizar arquitectura y código fuente con IA"
                    >
                      <Code2 size={13} className={`text-indigo-600 ${analyzingArchitecture ? 'animate-spin' : ''}`} />
                      <span>{analyzingArchitecture ? 'Analizando Código...' : 'Analizar Arquitectura'}</span>
                    </button>
                  )}

                  <button
                    onClick={openSendEmailModal}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs"
                    title="Enviar reporte personalizado por correo"
                  >
                    <Mail size={13} className="text-red-600" />
                    <span>Enviar Reporte por Email</span>
                  </button>

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
          <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 text-left transition-all duration-300 ${
            (isFocusMode || analyzingArchitecture) ? 'blur-[1.5px] opacity-35 pointer-events-none' : ''
          }`}>
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
          <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 transition-all duration-300 ${
            (isFocusMode || analyzingArchitecture) ? 'blur-[1.5px] opacity-35 pointer-events-none' : ''
          }`}>
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

        {/* Panel de Análisis de Arquitectura de Código Fuente */}
        {archError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{archError}</span>
            </div>
            <button onClick={() => setArchError(null)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
          </div>
        )}

        {/* Tarjeta Comprimida de Análisis de Arquitectura */}
        {architectureReport && (
          <div
            ref={archCardRef}
            className={`w-full bg-slate-100 border text-slate-900 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all duration-300 pointer-events-auto ${
              isFocusMode
                ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg z-50 relative scale-[1.01]'
                : 'border-slate-200'
            }`}
          >
            {/* Focus mode badge */}
            {isFocusMode && (
              <div className="absolute -top-3 left-5 flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                ENFOQUE ACTIVO
              </div>
            )}

            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Code2 size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Análisis de Arquitectura Realizado</h3>
                  <span className="text-[10px] font-mono font-semibold bg-slate-200 text-slate-700 border border-slate-350 px-2 py-0.5 rounded-full">
                    Patrón: {architectureReport.architecturePattern || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  <span>Mantenibilidad: <strong className="text-blue-700 font-bold">{architectureReport.maintainabilityScore ?? 0}/100</strong></span>
                  <span>•</span>
                  <span>Complejidad: <strong className="text-slate-700 font-bold">{architectureReport.complexityScore ?? 0}/100</strong></span>
                  <span>•</span>
                  <span className="text-amber-700 font-medium">{architectureReport.issues?.length || 0} issue(s) detectados</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setArchDocMode(false); setShowArchModal(true); setIsFocusMode(false); }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-2"
              >
                <Maximize2 size={13} />
                <span>Ver Detalles Completos</span>
              </button>
              <button
                onClick={() => { setArchitectureReport(null); setIsFocusMode(false); }}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200/50 rounded-xl transition-colors"
                title={isFocusMode ? 'Salir del modo foco' : 'Descartar'}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* MODAL DE DETALLES DE ARQUITECTURA */}
        <AnimatePresence>
          {showArchModal && architectureReport && (
            <div
              className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
              onClick={(e) => { if (e.target === e.currentTarget) setShowArchModal(false); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-4xl mx-auto my-10 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              >
                {/* === HEADER PLANO NEUTRAL (Estilo ChatGPT / Informe Formal) === */}
                <div className="bg-white border-b border-slate-200 px-7 pt-7 pb-6 space-y-5 text-slate-900">
                  {/* Top bar */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-700 shrink-0">
                        <Code2 size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">Informe de Auditoría de Arquitectura</h2>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full">
                            {project?.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-150 px-2.5 py-0.5 rounded-full">
                            {architectureReport.architecturePattern || 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Análisis técnico de código fuente · {new Date().toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>

                    {/* Action buttons en header */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {saveSuccessMsg && (
                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1">
                          <CheckCircle2 size={13} /> {saveSuccessMsg}
                        </span>
                      )}
                      <button
                        onClick={handleSaveArchitecture}
                        className={`text-xs px-3.5 py-2 rounded-xl font-semibold border flex items-center gap-1.5 transition-all ${
                          isSavedArch
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        }`}
                      >
                        <Bookmark size={13} className={isSavedArch ? 'fill-blue-600 text-blue-600' : ''} />
                        {isSavedArch ? 'Guardado' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setArchDocMode(!archDocMode)}
                        className={`text-xs px-3.5 py-2 rounded-xl font-semibold border flex items-center gap-1.5 transition-all ${
                          archDocMode
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        }`}
                      >
                        <FileCode size={13} />
                        {archDocMode ? 'Vista Normal' : 'Modo Documento'}
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Printer size={13} />
                        PDF
                      </button>
                      <button
                        onClick={handleSendArchEmail}
                        className="text-xs bg-blue-600 hover:bg-blue-750 text-white px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                      >
                        <Mail size={13} />
                        Email
                      </button>
                      <button
                        onClick={() => setShowArchModal(false)}
                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors ml-1"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Scores en el header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Mantenibilidad */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mantenibilidad</span>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-blue-600 leading-none">{architectureReport.maintainabilityScore ?? 0}</span>
                        <span className="text-xs text-slate-400 mb-0.5">/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-700"
                          style={{ width: `${architectureReport.maintainabilityScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Complejidad */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Complejidad</span>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-slate-800 leading-none">{architectureReport.complexityScore ?? 0}</span>
                        <span className="text-xs text-slate-400 mb-0.5">/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-700 rounded-full transition-all duration-700"
                          style={{ width: `${architectureReport.complexityScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Stack */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tecnologías</span>
                      <span className="text-3xl font-black text-slate-900 leading-none">{architectureReport.stack?.length || 0}</span>
                      <p className="text-[10px] text-slate-500">detectadas</p>
                    </div>
                    {/* Issues */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Issues</span>
                      <span className={`text-3xl font-black leading-none ${(architectureReport.issues?.length || 0) > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                        {architectureReport.issues?.length || 0}
                      </span>
                      <p className="text-[10px] text-slate-500">detectados</p>
                    </div>
                  </div>
                </div>

                {/* === BODY BLANCO === */}
                <div className={`bg-white ${archDocMode ? 'p-8' : 'p-6'} space-y-6 max-h-[55vh] overflow-y-auto custom-scrollbar`}>
                  {!archDocMode ? (
                    <div className="space-y-6">

                      {/* Overview */}
                      {architectureReport.overview && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Cpu size={12} className="text-indigo-600" />
                            </div>
                            Visión General
                          </h4>
                          <p className="text-sm text-slate-700 leading-relaxed font-sans">
                            {architectureReport.overview}
                          </p>
                        </div>
                      )}

                      {/* Stack Tecnológico */}
                      {architectureReport.stack?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Layers size={12} className="text-blue-600" />
                            </div>
                            Stack Tecnológico
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {architectureReport.stack.map((item: any, idx: number) => (
                              <span key={idx} className="text-xs bg-slate-900 text-white px-3.5 py-2 rounded-xl font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                <strong>{item.name}</strong>
                                {item.role && <span className="text-slate-400 text-[10px]">· {item.role}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Issues */}
                      {architectureReport.issues?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-5 h-5 bg-amber-100 rounded-lg flex items-center justify-center">
                              <AlertCircle size={12} className="text-amber-600" />
                            </div>
                            Hallazgos y Problemas Detectados
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold ml-1">
                              {architectureReport.issues.length} total
                            </span>
                          </h4>
                          <div className="space-y-3">
                            {architectureReport.issues.map((issue: any, idx: number) => {
                              const isHigh = issue.severity === 'high';
                              const isMedium = issue.severity === 'medium';
                              return (
                                <div
                                  key={idx}
                                  className={`border-l-4 rounded-r-2xl rounded-l-sm pl-4 pr-4 py-4 space-y-2 ${
                                    isHigh
                                      ? 'border-red-500 bg-red-50'
                                      : isMedium
                                      ? 'border-amber-500 bg-amber-50'
                                      : 'border-slate-400 bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                      {isHigh ? '🔴' : isMedium ? '🟡' : '🟢'}
                                      {issue.title}
                                    </span>
                                    <span className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                      isHigh ? 'bg-red-100 text-red-700' : isMedium ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {issue.severity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed">{issue.description}</p>
                                  {issue.affectedFiles?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {issue.affectedFiles.map((file: string, fIdx: number) => (
                                        <span key={fIdx} className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">
                                          {file}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {issue.recommendation && (
                                    <div className="flex items-start gap-2 bg-white border border-indigo-100 rounded-xl p-3 mt-1">
                                      <span className="text-base shrink-0">💡</span>
                                      <p className="text-xs text-indigo-800 leading-relaxed">
                                        <strong>Recomendación:</strong> {issue.recommendation}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fortalezas y Recomendaciones */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {architectureReport.strengths?.length > 0 && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                            <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                              <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Check size={12} className="text-emerald-600" />
                              </div>
                              Fortalezas
                            </h5>
                            <ul className="space-y-2 text-xs text-emerald-900">
                              {architectureReport.strengths.map((s: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {architectureReport.recommendations?.length > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
                            <h5 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                              <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Sparkles size={12} className="text-indigo-600" />
                              </div>
                              Recomendaciones
                            </h5>
                            <ul className="space-y-2 text-xs text-indigo-900">
                              {architectureReport.recommendations.map((r: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-indigo-400 font-bold shrink-0 mt-0.5">→</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Seguridad */}
                      {architectureReport.securityNotes?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                          <h5 className="text-xs font-bold text-red-800 flex items-center gap-2">
                            <ShieldAlert size={14} className="text-red-600" /> Notas de Seguridad
                          </h5>
                          <ul className="space-y-1.5 text-xs text-red-900 pl-2">
                            {architectureReport.securityNotes.map((sec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-500 shrink-0">⚠</span>{sec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                     /* MODO DOCUMENTO FORMAL */
                     <div id="print-area" className="space-y-6 font-sans text-slate-900 text-xs bg-white p-2">
                       <style>{`
                         @media print {
                           body * {
                             visibility: hidden !important;
                           }
                           #print-area, #print-area * {
                             visibility: visible !important;
                           }
                           #print-area {
                             position: absolute !important;
                             left: 0 !important;
                             top: 0 !important;
                             width: 100% !important;
                             background: white !important;
                             color: black !important;
                             padding: 24px !important;
                           }
                         }
                       `}</style>
                       <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-end">
                         <div>
                           <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">Informe de Arquitectura de Software</h1>
                           <p className="text-xs text-slate-500 mt-1">Proyecto: <strong>{project?.name}</strong> · Fecha: {new Date().toLocaleDateString('es-ES')} · Generado por ForgeMind Intelligence</p>
                         </div>
                         <span className="text-xs font-mono font-bold text-indigo-700 text-right">Audit #{id?.substring(0, 8)}</span>
                       </div>
                       <section className="space-y-2">
                         <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-200 pb-1">1. Resumen Ejecutivo</h3>
                         <p className="text-slate-700 leading-relaxed">{architectureReport.overview}</p>
                       </section>
                       <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                         <div><span className="text-[10px] uppercase font-bold text-slate-400 block">Patrón</span><p className="font-bold">{architectureReport.architecturePattern || 'N/A'}</p></div>
                         <div><span className="text-[10px] uppercase font-bold text-slate-400 block">Mantenibilidad</span><p className="font-bold text-emerald-700">{architectureReport.maintainabilityScore}/100</p></div>
                         <div><span className="text-[10px] uppercase font-bold text-slate-400 block">Complejidad</span><p className="font-bold text-indigo-700">{architectureReport.complexityScore}/100</p></div>
                       </div>
                       <section className="space-y-3">
                         <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-200 pb-1">2. Hallazgos Críticos ({architectureReport.issues?.length || 0})</h3>
                         {architectureReport.issues?.map((issue: any, idx: number) => (
                           <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5">
                             <p className="font-bold">{idx + 1}. [{issue.severity?.toUpperCase()}] {issue.title}</p>
                             <p className="text-slate-600">{issue.description}</p>
                             {issue.recommendation && <p className="text-indigo-800 font-medium">↳ {issue.recommendation}</p>}
                           </div>
                         ))}
                       </section>
                       <section className="space-y-2">
                         <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-200 pb-1">3. Recomendaciones</h3>
                         <ul className="space-y-1 pl-4 list-disc text-slate-700">
                           {architectureReport.recommendations?.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                         </ul>
                       </section>
                     </div>
                   )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* Live Git Activity Graph & Development Timeline */}
        {(connectedRepos.length > 0 && gitActivity) && (
          <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 transition-all duration-300 ${
            (isFocusMode || analyzingArchitecture) ? 'blur-[1.5px] opacity-35 pointer-events-none' : ''
          }`}>
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

              <div className={`relative pl-6 space-y-3 border-l-2 border-gradient-to-b from-purple-500 to-indigo-500 transition-all duration-300 ${
                showAllCommits ? 'max-h-[420px] overflow-y-auto pr-2 custom-scrollbar' : ''
              }`}>
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
                  (showAllCommits ? gitActivity.commits : gitActivity.commits.slice(0, 3)).map((commit: any, idx: number) => (
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
                            <span>Rama: <strong className="text-purple-700 font-mono">{commit.branchName || gitActivity.defaultBranch || 'main'}</strong></span>
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

              {/* Botón Ver más / Ver menos con Scroll estilizado */}
              {gitActivity?.commits && gitActivity.commits.length > 3 && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    onClick={() => setShowAllCommits(!showAllCommits)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-1.5 rounded-full transition-all shadow-2xs group"
                  >
                    <span>{showAllCommits ? 'Ver menos commits' : `Ver más (${gitActivity.commits.length - 3} adicionales)`}</span>
                    {showAllCommits ? (
                      <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                    ) : (
                      <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                    )}
                  </button>
                </div>
              )}
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

      {/* Modal: Enviar Reporte por Email (Gmail API) */}
      <AnimatePresence>
          {showEmailModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Enviar Reporte por Correo</h3>
                      <p className="text-[11px] text-slate-500">Despacha el resumen de avances a clientes o miembros del equipo</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-700">
                    <X size={16} />
                  </button>
                </div>

                {emailSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                    <span>{emailSuccessMsg}</span>
                  </div>
                )}

                {emailErrorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-600 shrink-0" />
                    <span>{emailErrorMsg}</span>
                  </div>
                )}

                {!gmailConnected && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl space-y-2">
                    <p className="font-semibold">Cuenta de Gmail no vinculada</p>
                    <p className="text-[11px]">Vincula tu cuenta de Google para enviar correos autorizados directamente desde la plataforma.</p>
                    <button
                      onClick={connectGmail}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Mail size={13} /> Vincular Gmail Ahora
                    </button>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Destinatario (Email):
                    </label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="ejemplo@cliente.com, equipo@empresa.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Asunto:
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Asunto del correo..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Contenido del Mensaje / Reporte:
                    </label>
                    <textarea
                      rows={5}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-500/20 font-sans"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendReportEmail}
                    disabled={sendingEmail || !gmailConnected}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    {sendingEmail ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {sendingEmail ? 'Enviando...' : 'Enviar Correo por Gmail'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}

