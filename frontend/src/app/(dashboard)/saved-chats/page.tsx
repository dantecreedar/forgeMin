'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Search, MessageSquare, Calendar, ChevronRight, Check } from 'lucide-react';
import { api } from '@/lib/api';

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

    // Also remove from saved messages list
    window.dispatchEvent(new Event('forgemind:saved-responses-updated'));
    showToast('Conversación eliminada del historial');
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
          Historial de Conversaciones Guardadas
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tus conversaciones guardadas de Inteligencia. Haz clic en cualquier conversación para abrirla directamente.
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
            placeholder="Buscar por título, proyecto o mensaje..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
          />
        </div>
      )}

      {/* Sessions Grid */}
      <div className="space-y-3">
        {loadingSessions ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando conversaciones...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-2">
            <MessageSquare size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No hay conversaciones guardadas</p>
            <p className="text-xs text-slate-400">Las conversaciones de Inteligencia se guardarán aquí automáticamente.</p>
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
                      {cleanPreview || 'Sin mensajes'}...
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-full">
                        {msgCount} {msgCount === 1 ? 'mensaje' : 'mensajes'}
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
                        <span>Ver Chat</span>
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
    </div>
  );
}
