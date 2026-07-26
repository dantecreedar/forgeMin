'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, Check, AlertCircle, Sparkles, HardDrive, Folder, ChevronRight, RefreshCw, FileCode, Table, ShieldCheck, HelpCircle, Eye, Image as ImageIcon, Music, Film, Users, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (fileData: { name: string; content: string }) => void;
  onExplainDocument?: (fileData: { name: string; content: string }) => void;
}

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
}

interface FolderBreadcrumb {
  id: string;
  name: string;
}

export function DrivePickerModal({ isOpen, onClose, onImportSuccess, onExplainDocument }: DrivePickerModalProps) {
  const { loginWithGoogle } = useAuth();
  const [viewMode, setViewMode] = useState<'my_drive' | 'shared_with_me' | 'recents'>('my_drive');
  const [folderStack, setFolderStack] = useState<FolderBreadcrumb[]>([{ id: 'root', name: 'Mi Unidad' }]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [readResult, setReadResult] = useState<{ metadata: any; content: string } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const currentFolder = folderStack[folderStack.length - 1];

  useEffect(() => {
    if (isOpen) {
      fetchFolderContents(currentFolder.id, viewMode === 'shared_with_me', viewMode === 'recents');
    }
  }, [isOpen, folderStack, viewMode]);

  const fetchFolderContents = async (
    folderId: string,
    isShared: boolean = viewMode === 'shared_with_me',
    isRecents: boolean = viewMode === 'recents'
  ) => {
    setLoadingList(true);
    setListError(null);

    let googleToken = localStorage.getItem('google_token');

    if (!googleToken) {
      try {
        await loginWithGoogle();
        googleToken = localStorage.getItem('google_token');
      } catch (err) {
        // Fallback
      }
    }

    const tokenToUse = googleToken || localStorage.getItem('auth_token') || '';

    try {
      const items = await api.drive.listFiles(tokenToUse, folderId === 'root' ? undefined : folderId, isShared, isRecents);
      setFiles(items || []);
    } catch (err: any) {
      try {
        await loginWithGoogle();
        const freshToken = localStorage.getItem('google_token') || '';
        const items = await api.drive.listFiles(freshToken, folderId === 'root' ? undefined : folderId, isShared, isRecents);
        setFiles(items || []);
      } catch (retryErr: any) {
        setListError('Inicia sesión en tu cuenta de Google para cargar los archivos.');
      }
    } finally {
      setLoadingList(false);
    }
  };

  const handleFolderClick = (folder: DriveItem) => {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
  };

  const handleReadFile = async (file: DriveItem) => {
    setSelectedFile(file);
    setReadingFile(true);
    setReadError(null);
    setReadResult(null);
    setImported(false);

    let googleToken = localStorage.getItem('google_token');
    if (!googleToken) {
      try {
        await loginWithGoogle();
        googleToken = localStorage.getItem('google_token');
      } catch {}
    }

    const tokenToUse = googleToken || localStorage.getItem('auth_token') || '';

    try {
      const result = await api.drive.readFile(file.id, tokenToUse);
      setReadResult(result);
    } catch (err: any) {
      setReadError(err.message || 'Error al leer el archivo de Google Drive.');
    } finally {
      setReadingFile(false);
    }
  };

  const handleConfirmImport = () => {
    if (readResult && onImportSuccess) {
      onImportSuccess({
        name: readResult.metadata.name,
        content: readResult.content,
      });
      setImported(true);
      setTimeout(() => {
        onClose();
        resetState();
      }, 1000);
    }
  };

  const handleExplainAction = () => {
    if (readResult && onExplainDocument) {
      onExplainDocument({
        name: readResult.metadata.name,
        content: readResult.content,
      });
      onClose();
      resetState();
    }
  };

  const resetState = () => {
    setFolderStack([{ id: 'root', name: 'Mi Unidad' }]);
    setSelectedFile(null);
    setReadResult(null);
    setReadError(null);
    setImported(false);
  };

  if (!isOpen) return null;

  const getItemIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder size={18} className="text-amber-400 fill-amber-400/20" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon size={18} className="text-pink-400" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <Music size={18} className="text-purple-400" />;
    }
    if (mimeType.startsWith('video/')) {
      return <Film size={18} className="text-rose-400" />;
    }
    if (mimeType.includes('document') || mimeType.includes('word')) {
      return <FileText size={18} className="text-blue-400" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <Table size={18} className="text-emerald-400" />;
    }
    return <FileCode size={18} className="text-indigo-400" />;
  };

  const isSupportedFormat = (mimeType: string, name: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return false;
    const lowerName = name.toLowerCase();
    if (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('sheet') ||
      mimeType.includes('csv') ||
      mimeType.includes('text') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.csv')
    ) {
      return true;
    }
    return false;
  };

  const getHumanMimeType = (mimeType: string, name: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return 'Carpeta';
    if (!isSupportedFormat(mimeType, name)) {
      const ext = name.includes('.') ? `.${name.split('.').pop()}` : '';
      return `Formato no soportado (${ext || 'Archivo Binario'})`;
    }
    if (mimeType.startsWith('image/')) return 'Imagen';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType === 'application/vnd.google-apps.document') return 'Documento Google Docs';
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Hoja de Cálculo Google';
    if (mimeType.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'Documento Word';
    if (mimeType.includes('pdf') || name.endsWith('.pdf')) return 'Documento PDF';
    if (mimeType.includes('sheet') || name.endsWith('.xlsx')) return 'Hoja Excel';
    return 'Archivo de Texto';
  };

  const isSpreadsheetData = (mimeType: string, name: string) => {
    return (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('sheet') ||
      mimeType.includes('csv') ||
      name.endsWith('.csv') ||
      name.endsWith('.xlsx')
    );
  };

  const parseCsvRows = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    return lines
      .map((line) => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim().replace(/^"|"$/g, ''));

        while (cells.length > 0 && (cells[cells.length - 1] === '' || cells[cells.length - 1] === undefined)) {
          cells.pop();
        }
        return cells;
      })
      .filter((row) => row.length > 0 && row.some((cell) => cell.length > 0));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden text-white flex flex-col h-[82vh]"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <HardDrive size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Explorador de Google Drive</h3>
                <p className="text-xs text-slate-400">Selecciona un archivo para previsualizarlo e interactuar con la IA</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                resetState();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal 2-Column Split Body */}
          <div className="flex-1 flex overflow-hidden divide-x divide-slate-800/80">
            {/* Left Column: File Explorer (40% width) */}
            <div className="w-2/5 p-4 flex flex-col overflow-y-auto space-y-3 bg-slate-950/30">
              {/* Section Tabs: Mi Unidad vs Compartidos vs Recientes */}
              <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px] font-semibold gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('my_drive');
                    setFolderStack([{ id: 'root', name: 'Mi Unidad' }]);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    viewMode === 'my_drive' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Folder size={12} /> Mi Unidad
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('shared_with_me');
                    setFolderStack([{ id: 'root', name: 'Compartidos' }]);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    viewMode === 'shared_with_me' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users size={12} /> Compartidos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('recents');
                    setFolderStack([{ id: 'root', name: 'Recientes' }]);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    viewMode === 'recents' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock size={12} /> Recientes
                </button>
              </div>

              {/* Breadcrumbs Navigation */}
              <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 overflow-x-auto shrink-0">
                {folderStack.map((folder, idx) => (
                  <div key={folder.id} className="flex items-center gap-1 shrink-0">
                    {idx > 0 && <ChevronRight size={12} className="text-slate-600" />}
                    <button
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`hover:text-blue-400 font-medium transition-colors ${
                        idx === folderStack.length - 1 ? 'text-white font-semibold' : ''
                      }`}
                    >
                      {folder.name}
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fetchFolderContents(currentFolder.id)}
                  className="ml-auto p-1 text-slate-500 hover:text-white transition-colors"
                  title="Actualizar lista"
                >
                  <RefreshCw size={12} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* File / Folder Tree */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {loadingList ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <span className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                    <span className="text-xs">Cargando elementos...</span>
                  </div>
                ) : listError ? (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle size={16} className="shrink-0" />
                      <span className="font-semibold">{listError}</span>
                    </div>
                    <button
                      onClick={loginWithGoogle}
                      className="w-full bg-white hover:bg-slate-100 text-slate-900 rounded-xl px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <ShieldCheck size={14} className="text-blue-600" />
                      <span>Conectar con Google</span>
                    </button>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    Carpeta vacía.
                  </div>
                ) : (
                  files.map((item) => {
                    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                    const isSelected = selectedFile?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isFolder) {
                            handleFolderClick(item);
                          } else {
                            handleReadFile(item);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/60 text-white font-semibold shadow-xs ring-1 ring-blue-500/30'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <div className="shrink-0">{getItemIcon(item.mimeType)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{item.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {getHumanMimeType(item.mimeType, item.name)}
                          </p>
                        </div>
                        {isFolder && <ChevronRight size={14} className="text-slate-600 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Document Details & Content Preview (60% width) */}
            <div className="w-3/5 p-6 flex flex-col bg-slate-900/60 overflow-y-auto">
              {readingFile ? (
                <div className="flex-1 flex flex-col items-center justify-center text-blue-400 gap-3">
                  <span className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent" />
                  <span className="text-xs font-semibold text-slate-300">Leyendo y procesando documento...</span>
                </div>
              ) : readError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-red-400 gap-2">
                  <AlertCircle size={24} />
                  <p className="text-xs font-medium max-w-xs">{readError}</p>
                </div>
              ) : readResult && selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col h-full space-y-4"
                >
                  {/* File Document Banner */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        {getItemIcon(readResult.metadata.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{readResult.metadata.name}</h4>
                        <span className="text-[10px] bg-blue-500/15 text-blue-300 font-semibold px-2 py-0.5 rounded-md inline-block mt-0.5 border border-blue-500/20">
                          {getHumanMimeType(readResult.metadata.mimeType, readResult.metadata.name)}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0">
                      <Check size={11} /> Listo
                    </span>
                  </div>

                  {/* Clean Content Preview Box */}
                  <div className="flex-1 flex flex-col bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Eye size={13} className="text-blue-400" />
                        {readResult.metadata.mimeType.startsWith('image/')
                          ? 'Previsualización de Imagen'
                          : readResult.metadata.mimeType.startsWith('audio/')
                          ? 'Reproductor de Audio'
                          : readResult.metadata.mimeType.startsWith('video/')
                          ? 'Reproductor de Video'
                          : readResult.metadata.mimeType.includes('pdf') || readResult.metadata.name.toLowerCase().endsWith('.pdf')
                          ? 'Visor Interactivo de Documento PDF'
                          : isSpreadsheetData(readResult.metadata.mimeType, readResult.metadata.name)
                          ? 'Vista de Tabla Estructurada (Hoja de Cálculo)'
                          : 'Vista Previa del Texto Extraído'}
                      </span>
                    </div>

                    <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 select-text flex items-center justify-center">
                      {(() => {
                        const isDocx = readResult.metadata.name.toLowerCase().endsWith('.docx') || readResult.metadata.mimeType.includes('wordprocessingml');
                        let contentToRender = readResult.content;

                        if (isDocx && contentToRender.includes('<w:t')) {
                          const textMatches = contentToRender.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
                          if (textMatches && textMatches.length > 0) {
                            contentToRender = textMatches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
                          }
                        }

                        const isRawBinary = !isDocx && contentToRender.startsWith('PK\x03\x04');
                        const isSupported = isSupportedFormat(readResult.metadata.mimeType, readResult.metadata.name) && !isRawBinary;

                        if (!isSupported) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <AlertCircle size={32} />
                              </div>
                              <div className="space-y-1.5 max-w-sm">
                                <h4 className="text-sm font-bold text-white">Formato de archivo no soportado para lectura directa</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                  El archivo <span className="font-semibold text-slate-200">{readResult.metadata.name}</span> tiene una estructura binaria o comprimida no compatible para previsualización.
                                </p>
                              </div>
                              <div className="text-[11px] bg-slate-900 text-slate-400 px-4 py-2 rounded-xl border border-slate-800/80 max-w-sm font-sans">
                                Formatos soportados: <span className="text-slate-200 font-semibold">Documentos (Docs, Word, PDF, TXT), Hojas de cálculo (Excel, CSV), Imágenes, Audio y Video.</span>
                              </div>
                            </div>
                          );
                        }

                        if (readResult.metadata.mimeType.startsWith('image/') || contentToRender.startsWith('data:image/')) {
                          return (
                            <div className="flex items-center justify-center h-full w-full">
                              <img
                                src={contentToRender}
                                alt={readResult.metadata.name}
                                className="max-h-[48vh] max-w-full rounded-2xl object-contain border border-slate-800 shadow-xl"
                              />
                            </div>
                          );
                        }

                        if (readResult.metadata.mimeType.startsWith('audio/') || contentToRender.startsWith('data:audio/')) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full w-full p-6 space-y-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                <Music size={32} />
                              </div>
                              <p className="text-sm font-semibold text-white">{readResult.metadata.name}</p>
                              <audio controls src={contentToRender} className="w-full max-w-md" />
                            </div>
                          );
                        }

                        if (readResult.metadata.mimeType.startsWith('video/')) {
                          return (
                            <div className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                              {contentToRender.startsWith('http') ? (
                                <iframe
                                  src={contentToRender}
                                  className="w-full h-full min-h-[300px] border-none"
                                  allow="autoplay"
                                />
                              ) : (
                                <video controls src={contentToRender} className="max-h-[48vh] w-full rounded-2xl" />
                              )}
                            </div>
                          );
                        }

                        if (readResult.metadata.mimeType.includes('pdf') || readResult.metadata.name.toLowerCase().endsWith('.pdf')) {
                          return (
                            <div className="w-full h-full min-h-[340px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                              <iframe
                                src={contentToRender.startsWith('http') ? contentToRender : `https://drive.google.com/file/d/${readResult.metadata.id}/preview`}
                                className="w-full h-full min-h-[340px] border-none rounded-2xl"
                                allow="autoplay"
                              />
                            </div>
                          );
                        }

                        if (isSpreadsheetData(readResult.metadata.mimeType, readResult.metadata.name)) {
                          const rows = parseCsvRows(contentToRender);
                          if (rows.length === 0) return <div className="text-slate-500 italic">Hoja de cálculo vacía.</div>;

                          return (
                            <div className="overflow-x-auto border border-slate-800 rounded-xl w-full h-full">
                              <table className="w-full text-left text-xs border-collapse min-w-max">
                                <thead>
                                  <tr className="bg-slate-900 border-b border-slate-800 text-blue-300 font-bold">
                                    <th className="px-3 py-2 border-r border-slate-800 w-10 text-center text-slate-500 font-normal">#</th>
                                    {rows[0].map((cell, cIdx) => (
                                      <th key={cIdx} className="px-3 py-2 border-r border-slate-800 whitespace-nowrap">
                                        {cell || `Col ${cIdx + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {rows.slice(1).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-800/40 text-slate-200 transition-colors">
                                      <td className="px-3 py-1.5 border-r border-slate-800 text-center text-slate-500 text-[10px] font-mono">
                                        {rIdx + 1}
                                      </td>
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="px-3 py-1.5 border-r border-slate-800/60 whitespace-nowrap">
                                          {cell || '-'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        return (
                          <div className="whitespace-pre-wrap leading-relaxed w-full h-full">
                            {contentToRender}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
                    <button
                      onClick={onExplainDocument ? handleExplainAction : handleConfirmImport}
                      disabled={!isSupportedFormat(readResult.metadata.mimeType, readResult.metadata.name) || readResult.content.startsWith('PK\x03\x04')}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                    >
                      <Sparkles size={15} /> Explicar con IA
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Empty state when no file is selected */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Selecciona un archivo</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Haz clic en cualquier documento del explorador a la izquierda para ver su contenido y opciones de IA.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
