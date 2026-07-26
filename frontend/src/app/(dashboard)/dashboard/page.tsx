'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { ArrowUp, Sparkles, Folder, Target, HardDrive, FileText, Check, Save } from 'lucide-react';
import { GraphCard } from '@/components/chat/graph-card';
import { DrivePickerModal } from '@/components/drive/drive-picker-modal';
import { SendEmailDropdown } from '@/components/chat/send-email-dropdown';
import { DotsLoader } from '@/components/ui/dots-loader';
import { DeerIcon } from '@/components/ui/deer-icon';
import { useProfileSettings, MessageDesign } from '@/lib/settings-context';
import { translations } from '@/lib/translations';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: any;
  fileAttachment?: {
    name: string;
    isExplain?: boolean;
  };
}

const themeStyles: Record<MessageDesign, { bg: string; text: string; border: string; accent: string }> = {
  slate: {
    bg: 'bg-white',
    text: 'text-slate-800',
    border: 'border-slate-200 shadow-2xs',
    accent: 'text-amber-500',
  },
  classic: {
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    border: 'border-slate-800 shadow-lg',
    accent: 'text-sky-400',
  },
  emerald: {
    bg: 'bg-emerald-950/90 backdrop-blur-md',
    text: 'text-emerald-50',
    border: 'border-emerald-800/60 shadow-md',
    accent: 'text-emerald-400',
  },
  violet: {
    bg: 'bg-indigo-950',
    text: 'text-indigo-100',
    border: 'border-indigo-800/80 shadow-lg',
    accent: 'text-pink-400',
  },
};

function formatCleanContent(text: string) {
  const lines = text
    .split('\n')
    .filter((line) => !line.trim().startsWith('---') && !line.trim().startsWith('***'))
    .map((line) => {
      let cleaned = line
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\*\s*\*\*(.*?)\*\*/, '• $1')
        .replace(/^\d+\.\s*\*\*(.*?)\*\*/, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');

      return cleaned;
    });

  return lines.join('\n');
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const { settings, saveResponse } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [emailedMessageIds, setEmailedMessageIds] = useState<Set<string>>(new Set());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => 'session-' + Date.now());

  const endRef = useRef<HTMLDivElement>(null);
  const activeTheme = themeStyles[settings.messageDesign] || themeStyles.slate;

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const access_token = urlParams.get('access_token');
      const email = urlParams.get('email');
      if (access_token && email) {
        localStorage.setItem('gmail_access_token', access_token);
        localStorage.setItem('gmail_email', email);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const startFreshNewChat = () => {
    const freshId = 'session-' + Date.now();
    setActiveSessionId(freshId);
    setMessages([]);
    setInput('');
  };

  useEffect(() => {
    const handleNewChat = () => startFreshNewChat();
    window.addEventListener('forgemind:new-chat', handleNewChat);
    return () => window.removeEventListener('forgemind:new-chat', handleNewChat);
  }, []);

  // Handle active session switching via URL query parameter ?session=<id>
  useEffect(() => {
    if (!sessionParam || sessionParam === 'new') {
      startFreshNewChat();
      return;
    }

    setActiveSessionId(sessionParam);
    try {
      const local = localStorage.getItem('forgemind_auto_chat_sessions');
      if (local) {
        const list = JSON.parse(local);
        const match = list.find((s: any) => s.id === sessionParam);
        if (match && Array.isArray(match.messages) && match.messages.length > 0) {
          setMessages(match.messages);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [sessionParam]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoSaveSessionToSidebar = (updatedMsgs: Message[]) => {
    if (updatedMsgs.length === 0) return;
    const firstUserMsg = updatedMsgs.find((m) => m.role === 'user')?.content || 'Nueva conversación';
    const truncatedTitle = firstUserMsg.length > 25 ? firstUserMsg.slice(0, 25) + '...' : firstUserMsg;

    const sessionObj = {
      id: activeSessionId,
      title: truncatedTitle,
      messages: updatedMsgs.map((m) => ({ id: m.id, role: m.role, content: m.content })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    api.chat.saveSession(sessionObj).catch(() => {});

    try {
      const savedList = localStorage.getItem('forgemind_auto_chat_sessions');
      const list = savedList ? JSON.parse(savedList) : [];
      const filtered = list.filter((s: any) => s.id !== activeSessionId);
      const newList = [sessionObj, ...filtered];
      localStorage.setItem('forgemind_auto_chat_sessions', JSON.stringify(newList));
      window.dispatchEvent(new Event('forgemind:saved-responses-updated'));
    } catch {}
  };

  const handleSendEmail = async (msgId: string, targetEmail?: string) => {
    const recipient = targetEmail || settings.userEmail;
    const msg = messages.find((m) => m.id === msgId);
    const content = msg ? formatCleanContent(msg.content) : 'Respuesta de ForgeMind Intelligence';

    const token = localStorage.getItem('gmail_access_token') || localStorage.getItem('google_token');

    if (!token) {
      try {
        const { url } = await api.gmail.getAuthUrl();
        if (url) {
          window.location.href = url;
          return;
        }
      } catch {}
      showNotification('Vincule su cuenta de Gmail para enviar correos');
      return;
    }

    try {
      await api.gmail.sendReport(token, recipient, 'Respuesta de Inteligencia - ForgeMind', content);
      setEmailedMessageIds((prev) => new Set(prev).add(msgId));
      showNotification(`Respuesta enviada con éxito por Gmail a ${recipient}`);
    } catch (err: any) {
      showNotification(err?.message || 'Error al enviar correo por Gmail');
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('forgemind_saved_msg_ids');
      if (stored) {
        setSavedMessageIds(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  const handleSaveResponse = (msgId: string) => {
    const nextSet = new Set(savedMessageIds);
    nextSet.add(msgId);
    setSavedMessageIds(nextSet);
    try {
      localStorage.setItem('forgemind_saved_msg_ids', JSON.stringify(Array.from(nextSet)));
    } catch {}
    autoSaveSessionToSidebar(messages);
    showNotification('Respuesta guardada en el historial');
  };

  const send = async (
    textToSend?: string,
    fileAttachment?: { name: string; isExplain?: boolean }
  ) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;
    setInput('');

    const userMsgId = Date.now().toString();
    const msgsWithUser: Message[] = [...messages, { id: userMsgId, role: 'user', content: text, fileAttachment }];
    setMessages(msgsWithUser);
    setLoading(true);

    try {
      const res = await api.engine.command(text);
      const assistantMsgId = (Date.now() + 1).toString();
      const finalMsgs: Message[] = [
        ...msgsWithUser,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: res.message || 'Análisis completado',
          payload: res,
        },
      ];
      setMessages(finalMsgs);
      autoSaveSessionToSidebar(finalMsgs);
    } catch {
      const errorMsgs: Message[] = [
        ...msgsWithUser,
        { id: Date.now().toString(), role: 'assistant', content: 'Error de conexión con el servidor' },
      ];
      setMessages(errorMsgs);
      autoSaveSessionToSidebar(errorMsgs);
    } finally {
      setLoading(false);
    }
  };

  const handleDriveImport = ({ name, content }: { name: string; content: string }) => {
    const promptText = `Analiza el siguiente documento importado de Google Drive (${name}):\n\n${content}`;
    send(promptText, { name, isExplain: false });
  };

  const handleExplainDocument = ({ name, content }: { name: string; content: string }) => {
    const promptText = `Explica detalladamente el siguiente documento de Google Drive (${name}):\n\n${content}`;
    send(promptText, { name, isExplain: true });
  };

  const quickPrompts = [
    { label: '📊 Resumen Global con IA', query: 'analizar todo y dar un resumen global de los proyectos', icon: Sparkles },
    { label: 'Ver Proyectos', query: 'muestrame los proyectos', icon: Folder },
    { label: 'Ver Objetivos', query: 'muestrame los objetivos', icon: Target },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafd] relative">
      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-slate-800"
        >
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl font-medium tracking-tight text-slate-800 mb-2 flex items-center justify-center gap-2.5"
            >
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold inline-flex items-center gap-2">
                <DeerIcon size={32} className="text-blue-600 inline-block shrink-0" />
                ForgeMind
              </span>{' '}
              Intelligence
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="text-sm text-slate-500 mb-9 font-normal leading-relaxed max-w-md"
            >
              Hola. Gestiona tus proyectos, objetivos y analiza documentos de Drive mediante instrucciones de IA.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full space-y-4"
            >
              <div className="relative flex items-center bg-white border border-slate-200/90 rounded-3xl shadow-xs hover:shadow-md focus-within:shadow-md focus-within:border-blue-500/50 transition-all px-4 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={t.dashboard.placeholder}
                  className="w-full bg-transparent px-2 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowDriveModal(true)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors mr-1 shrink-0"
                  title="Importar documento de Google Drive"
                >
                  <HardDrive size={18} />
                </button>
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-blue-600 transition-all shrink-0 shadow-xs"
                  title="Enviar instrucción"
                >
                  <ArrowUp size={18} />
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDriveModal(true)}
                  className="flex items-center gap-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-2xl transition-all shadow-2xs font-semibold"
                >
                  <HardDrive size={14} className="text-blue-600" />
                  <span>📁 Seleccionar Documento del Drive</span>
                </button>
                {quickPrompts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.query}
                      onClick={() => send(item.query)}
                      className="flex items-center gap-2 text-xs bg-white hover:bg-slate-100/80 text-slate-700 border border-slate-200/80 px-4 py-2 rounded-2xl transition-all shadow-2xs font-medium"
                    >
                      <Icon size={14} className="text-blue-600" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-4">
              <div className="max-w-3xl mx-auto py-8 space-y-5">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const cleanText = isUser ? msg.content : formatCleanContent(msg.content);
                  const isSaved = savedMessageIds.has(msg.id);
                  const isEmailed = emailedMessageIds.has(msg.id);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[88%]">
                        {msg.fileAttachment ? (
                          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-md space-y-2 min-w-[280px]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs truncate text-white">{msg.fileAttachment.name}</p>
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-md inline-block mt-0.5 border border-blue-500/30">
                                  {msg.fileAttachment.isExplain ? '💡 Explicación del Documento' : '📄 Análisis de Documento'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`relative transition-all ${
                              isUser
                                ? 'bg-slate-200/90 text-slate-900 px-4 py-3 rounded-3xl rounded-br-xs shadow-2xs font-medium text-xs sm:text-sm'
                                : 'bg-transparent text-slate-800 py-1 text-xs sm:text-sm leading-relaxed'
                            }`}
                          >
                            {/* Watermark Overlay for Assistant Responses */}
                            {!isUser && settings.showWatermark && (
                              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                <div
                                  className="w-full h-full flex items-center justify-center select-none font-bold text-xs tracking-widest uppercase transform -rotate-12 text-slate-400"
                                  style={{ opacity: settings.watermarkOpacity }}
                                >
                                  {settings.watermarkText}
                                </div>
                              </div>
                            )}

                            <p className="whitespace-pre-line relative z-10">{cleanText}</p>

                            {/* Assistant Response Actions */}
                            {!isUser && (
                              <div className="mt-3 flex items-center justify-start gap-2 relative z-10">
                                <SendEmailDropdown
                                  defaultEmail={settings.userEmail}
                                  isSent={isEmailed}
                                  onSend={(targetEmail) => handleSendEmail(msg.id, targetEmail)}
                                />

                                <button
                                  onClick={() => handleSaveResponse(msg.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    isSaved
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-200/70 hover:bg-slate-200 text-slate-700'
                                  }`}
                                  title="Guardar respuesta"
                                >
                                  {isSaved ? <Check size={13} /> : <Save size={13} />}
                                  <span>{isSaved ? 'Guardada' : 'Guardar Respuesta'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.payload && <GraphCard payload={msg.payload} />}
                      </div>
                    </motion.div>
                  );
                })}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-2.5">
                      <DotsLoader className="text-blue-600" />
                      <span className="text-xs text-slate-500 font-medium">Analizando...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t border-slate-200/80 p-4 bg-[#f8fafd]">
              <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white border border-slate-200/90 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-2xs">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={t.dashboard.placeholder}
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none py-1.5 px-1"
                />
                <button
                  type="button"
                  onClick={() => setShowDriveModal(true)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                  title="Importar documento de Google Drive"
                >
                  <HardDrive size={18} />
                </button>
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-blue-600 transition-all shrink-0 shadow-xs"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DrivePickerModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onImportSuccess={handleDriveImport}
        onExplainDocument={handleExplainDocument}
      />
    </div>
  );
}
