'use client';

import { useState, useEffect } from 'react';
import { useProfileSettings, SavedResponseItem } from '@/lib/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Copy, Check, Sparkles, Search, MessageSquare, Calendar, ChevronRight, RefreshCw, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';

export interface ChatSessionItem {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function SavedChatsPage() {
  const { savedResponses, deleteSavedResponse, settings } = useProfileSettings();
  const [activeTab, setActiveTab] = useState<'threads' | 'highlights'>('threads');
  const [chatSessions, setChatSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<ChatSessionItem | null>(null);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.chat.getSessions().catch(() => []);
      let remoteSessions: ChatSessionItem[] = Array.isArray(res) ? res : [];

      const local = localStorage.getItem('forgemind_auto_chat_sessions');
      let localSessions: ChatSessionItem[] = local ? JSON.parse(local) : [];

      const map = new Map<string, ChatSessionItem>();
      [...remoteSessions, ...localSessions].forEach((s) => {
        if (s.id) map.set(s.id, s);
      });

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );

      setChatSessions(combined);
    } catch {
      const local = localStorage.getItem('forgemind_auto_chat_sessions');
      setChatSessions(local ? JSON.parse(local) : []);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();

    const handleSync = () => loadSessions();
    window.addEventListener('forgemind:saved-responses-updated', handleSync);
    return () => window.removeEventListener('forgemind:saved-responses-updated', handleSync);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = (item: SavedResponseItem) => {
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.chat.deleteSession(sessionId).catch(() => {});
    } catch {}

    const updated = chatSessions.filter((s) => s.id !== sessionId);
    setChatSessions(updated);
    localStorage.setItem('forgemind_auto_chat_sessions', JSON.stringify(updated));

    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }

    showToast('Conversación eliminada correctamente');
  };

  const filteredSessions = chatSessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = s.title?.toLowerCase().includes(q);
    const contentMatch = s.messages?.some((m) => m.content?.toLowerCase().includes(q));
    return titleMatch || contentMatch;
  });

  const filteredResponses = savedResponses.filter((r) => {
    const q = searchQuery.toLowerCase();
    return r.title?.toLowerCase().includes(q) || r.content?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-left">
      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-slate-800"
        >
          <Check size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Save className="text-amber-500" size={22} />
            Guardados (Historial de Inteligencia)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tus conversaciones guardadas automáticamente estilo ChatGPT y tus respuestas destacadas.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('threads')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'threads'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={14} className="text-blue-600" />
            <span>Historial Chats ({chatSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('highlights')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'highlights'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Respuestas ({savedResponses.length})</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'threads' ? 'Buscar en conversaciones guardadas...' : 'Buscar en respuestas guardadas...'}
            className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        <button
          onClick={loadSessions}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          title="Refrescar historial"
        >
          <RefreshCw size={16} className={loadingSessions ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TAB 1: HISTORIAL DE CHATS AUTOMÁTICOS */}
      {activeTab === 'threads' && (
        <div className="space-y-4">
          {loadingSessions ? (
            <div className="py-20 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw size={20} className="animate-spin text-amber-500 mx-auto" />
              <p>Cargando historial de conversaciones...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 max-w-md mx-auto">
              <MessageCircle size={28} className="text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Sin conversaciones registradas</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Todas tus conversaciones con el asistente de Inteligencia se guardarán automáticamente en la base de datos estilo ChatGPT.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredSessions.map((session) => {
                  const msgCount = session.messages?.length || 0;
                  const lastMsg = session.messages?.[session.messages.length - 1]?.content || 'Sin mensajes';
                  const dateFormatted = session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : 'Reciente';

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setActiveSession(session)}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MessageSquare size={16} className="text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xs font-bold text-slate-900 truncate">{session.title}</h3>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                            <Calendar size={10} />
                            {dateFormatted}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {lastMsg}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {msgCount} {msgCount === 1 ? 'mensaje' : 'mensajes'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar conversación"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESPUESTAS DESTACADAS GUARDADAS */}
      {activeTab === 'highlights' && (
        <div className="space-y-4">
          {filteredResponses.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 max-w-md mx-auto">
              <Sparkles size={28} className="text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Sin respuestas destacadas guardadas</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Presiona el botón <span className="font-semibold text-slate-800">"Guardar Respuesta"</span> en cualquier mensaje para añadirlo aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredResponses.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Watermark Overlay */}
                    {settings.showWatermark && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-bold text-xs tracking-widest uppercase transform -rotate-12"
                        style={{ opacity: settings.watermarkOpacity }}
                      >
                        {settings.watermarkText}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles size={14} className="text-amber-500 shrink-0" />
                          <h3 className="text-xs font-bold text-slate-900 truncate">{item.title}</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.date}</span>
                      </div>

                      <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
                        {item.content}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCopy(item)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all"
                      >
                        {copiedId === item.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedId === item.id ? 'Copiado' : 'Copiar'}</span>
                      </button>

                      <button
                        onClick={() => {
                          deleteSavedResponse(item.id);
                          showToast('Respuesta eliminada correctamente');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar de guardados"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* FULL CHAT SESSION READER MODAL */}
      <AnimatePresence>
        {activeSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-left"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">{activeSession.title}</h3>
                </div>
                <button
                  onClick={() => setActiveSession(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs"
                >
                  Cerrar
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-slate-50/50">
                {activeSession.messages?.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-2xs mr-auto rounded-bl-none font-sans whitespace-pre-wrap'
                    }`}
                  >
                    <p className="font-bold text-[10px] opacity-70 mb-1">{m.role === 'user' ? 'Tú' : 'ForgeMind AI'}</p>
                    <p>{m.content}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
