'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sparkles, MessageSquare, X, Send, Mail, Bookmark, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { GraphCard } from './graph-card';
import { useProfileSettings, MessageDesign } from '@/lib/settings-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: any;
}

const themeStyles: Record<MessageDesign, { bg: string; text: string; border: string; accent: string }> = {
  slate: {
    bg: 'bg-white',
    text: 'text-slate-800',
    border: 'border-slate-200 shadow-xs',
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
  // Strip raw markdown headers (###, ##, #), horizontal dividers (---, ***), and clean up bullet points
  const lines = text
    .split('\n')
    .filter((line) => !line.trim().startsWith('---') && !line.trim().startsWith('***'))
    .map((line) => {
      let cleaned = line
        .replace(/^#{1,6}\s*/, '') // Strip headers #, ##, ###
        .replace(/^\*\s*\*\*(.*?)\*\*/, '• $1') // Clean bullet header * **Text** -> • Text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold asterisks -> Clean text
        .replace(/\*(.*?)\*/g, '$1'); // Italic asterisks -> Clean text

      return cleaned;
    });

  return lines.join('\n');
}

import { SendEmailDropdown } from './send-email-dropdown';
import { DotsLoader } from '@/components/ui/dots-loader';

export function ChatPanel({ _projectId = 'default' }: { _projectId?: string }) {
  const { settings } = useProfileSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [emailedMessageIds, setEmailedMessageIds] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  const activeTheme = themeStyles[settings.messageDesign] || themeStyles.slate;

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSendEmail = (msgId: string, targetEmail?: string) => {
    const recipient = targetEmail || settings.userEmail;
    setEmailedMessageIds((prev) => new Set(prev).add(msgId));
    showNotification(`Respuesta enviada a ${recipient}`);
  };

  const handleSaveResponse = (msgId: string) => {
    setSavedMessageIds((prev) => new Set(prev).add(msgId));
    showNotification('Respuesta guardada en tu biblioteca de respuestas');
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await api.engine.command(text);
      const assistantMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: res.message || 'Operación completada',
          payload: res,
        },
      ]);
      if (res.type === 'created' || res.type === 'updated' || res.type === 'deleted' || res.type === 'connected') {
        window.dispatchEvent(new CustomEvent('forgemind:refresh'));
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: e?.message || 'Ocurrió un error al procesar tu mensaje.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-slate-900 text-white p-3.5 rounded-full shadow-lg hover:bg-slate-800 transition-all z-50 flex items-center gap-2 border border-slate-700"
      >
        <Sparkles size={18} className="text-amber-400" />
        <span className="text-xs font-medium pr-1">Asistente IA</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed bottom-6 right-6 w-84 sm:w-[420px] h-[520px] border border-border bg-white shadow-2xl flex flex-col z-50 rounded-2xl overflow-hidden"
    >
      {/* Toast Notification inside Chat Panel */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-12 left-4 right-4 bg-slate-900 text-white text-[11px] px-3 py-2 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-slate-700"
        >
          <Check size={13} className="text-emerald-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center">
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <span className="text-xs font-semibold tracking-wide">ForgeMind Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
          <X size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
              <MessageSquare size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-800">¿En qué puedo ayudarte hoy?</p>
            <p className="text-[11px] text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
              Realiza preguntas o analiza documentos. <br />
              <span className="text-primary italic">"analizar requerimientos del sistema"</span>
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const cleanText = isUser ? msg.content : formatCleanContent(msg.content);
          const isSaved = savedMessageIds.has(msg.id);
          const isEmailed = emailedMessageIds.has(msg.id);

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] px-4 py-3 rounded-2xl text-xs leading-relaxed relative overflow-hidden transition-all ${
                  isUser
                    ? 'bg-primary text-white rounded-br-none shadow-xs'
                    : `${activeTheme.bg} ${activeTheme.text} ${activeTheme.border} rounded-bl-none`
                }`}
              >
                {/* Watermark Overlay for Assistant Messages */}
                {!isUser && settings.showWatermark && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-bold text-[10px] tracking-widest uppercase transform -rotate-12"
                    style={{ opacity: settings.watermarkOpacity }}
                  >
                    {settings.watermarkText}
                  </div>
                )}

                <p className="whitespace-pre-line relative z-10">{cleanText}</p>

                {msg.payload && (
                  <div className="relative z-10">
                    <GraphCard payload={msg.payload} onNavigate={() => setOpen(false)} />
                  </div>
                )}

                {/* Assistant Message Actions: Enviar a Email & Guardar Respuesta */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-current/15 flex items-center justify-end gap-2 relative z-10">
                    <SendEmailDropdown
                      defaultEmail={settings.userEmail}
                      isSent={isEmailed}
                      onSend={(targetEmail) => handleSendEmail(msg.id, targetEmail)}
                    />
                    <button
                      onClick={() => handleSaveResponse(msg.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        isSaved
                          ? 'bg-primary/20 text-primary'
                          : 'bg-current/10 hover:bg-current/20'
                      }`}
                      title="Guardar respuesta en la biblioteca"
                    >
                      {isSaved ? <Check size={11} /> : <Bookmark size={11} />}
                      <span>{isSaved ? 'Guardada' : 'Guardar Respuesta'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl text-xs text-muted-foreground flex items-center gap-2 shadow-xs">
              <DotsLoader className="text-amber-500" />
              <span>Pensando...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe una consulta..."
          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-primary text-white p-2.5 rounded-xl disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}
