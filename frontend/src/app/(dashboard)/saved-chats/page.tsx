'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Search, MessageSquare, Calendar, ChevronRight, Check, Code2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useProfileSettings } from '@/lib/settings-context';
import { translations } from '@/lib/translations';

export interface ChatSessionItem {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  folderName?: string;
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
  const router = useRouter();
  const { settings } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  const [chatSessions, setChatSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.chat.deleteSession(sessionId).catch(() => {});
    } catch {}

    const updated = chatSessions.filter((s) => s.id !== sessionId);
    setChatSessions(updated);
    localStorage.setItem('forgemind_auto_chat_sessions', JSON.stringify(updated));

    window.dispatchEvent(new Event('forgemind:saved-responses-updated'));
    showToast(lang === 'en' ? 'Conversation removed from history' : 'Conversación eliminada del historial');
  };

  const handleOpenChatSession = (sessionId: string) => {
    router.push(`/dashboard?session=${sessionId}`);
  };

  const filteredSessions = chatSessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = s.title?.toLowerCase().includes(q);
    const projectMatch = s.projectName?.toLowerCase().includes(q);
    const contentMatch = s.messages?.some((m) => m.content?.toLowerCase().includes(q));
    return titleMatch || projectMatch || contentMatch;
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
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Save className="text-amber-500" size={22} />
          {t.savedChats.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {t.savedChats.subtitle}
        </p>
      </div>

      {/* Search Bar */}
      {chatSessions.length >= 2 && (
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.savedChats.searchPlaceholder}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
          />
        </div>
      )}

      {/* Sessions Grid */}
      <div className="space-y-3">
        {loadingSessions ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {lang === 'en' ? 'Loading conversations...' : 'Cargando conversaciones...'}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-2">
            <MessageSquare size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">{t.savedChats.noSaved}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => {
              const msgCount = session.messages?.length || 0;
              const lastMsg = session.messages?.[session.messages.length - 1]?.content || '';
              const cleanPreview = lastMsg.replace(/^#{1,6}\s*/, '').slice(0, 140);
              const dateStr = new Date(session.updatedAt || session.createdAt).toLocaleDateString();

              return (
                <motion.div
                  key={session.id}
                  whileHover={{ y: -2 }}
                  onClick={() => handleOpenChatSession(session.id)}
                  className="bg-white border border-slate-200 hover:border-amber-500/40 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare size={16} className="text-amber-500 shrink-0" />
                        <h3 className="text-xs font-bold text-slate-800 truncate group-hover:text-amber-600 transition-colors">
                          {session.title}
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Calendar size={11} />
                        {dateStr}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {cleanPreview || (lang === 'en' ? 'No messages' : 'Sin mensajes')}...
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-full">
                        {msgCount} {msgCount === 1 ? (lang === 'en' ? 'message' : 'mensaje') : (lang === 'en' ? 'messages' : 'mensajes')}
                      </span>
                      {session.projectName && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                          {session.projectName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Eliminar conversación"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button className="text-xs font-bold text-amber-600 group-hover:text-amber-700 flex items-center gap-0.5 pl-1">
                        <span>{t.savedChats.viewChat}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN DE INFORMES DE ARQUITECTURA GUARDADOS */}
      <div className="pt-6 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="text-indigo-600" size={20} />
              Informes de Arquitectura Guardados
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Auditorías técnicas y análisis de código fuente guardados en la plataforma</p>
          </div>
        </div>

        {(() => {
          if (typeof window === 'undefined') return null;
          const allSavedReports: any[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('saved_arch_reports_')) {
              try {
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                allSavedReports.push(...items);
              } catch {}
            }
          }

          if (allSavedReports.length === 0) {
            return (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-1">
                <Code2 size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No hay informes de arquitectura guardados aún.</p>
                <p className="text-[11px] text-slate-400">Puedes guardar un informe haciendo click en "Guardar" al analizar un proyecto.</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allSavedReports.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/projects/${item.projectId}`)}
                  className="bg-white border border-slate-200 hover:border-indigo-500/40 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                        {item.projectName}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors pt-1">
                        Patrón: {item.report?.architecturePattern || 'N/A'}
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Calendar size={11} />
                      {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-sans">
                    {item.report?.overview}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-600 font-bold">Mantenibilidad: {item.report?.maintainabilityScore}/100</span>
                      <span>•</span>
                      <span className="text-amber-600 font-bold">{item.report?.issues?.length || 0} issues</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          const savedKey = `saved_arch_reports_${item.projectId}`;
                          const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
                          const updated = existing.filter((x: any) => x.id !== item.id);
                          localStorage.setItem(savedKey, JSON.stringify(updated));
                          showToast('Informe eliminado de Guardados');
                          window.dispatchEvent(new Event('forgemind:saved-responses-updated'));
                        } catch {}
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Eliminar de guardados"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
