'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sparkles, MessageSquare, X, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { GraphCard } from './graph-card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: any;
}

export function ChatPanel({ _projectId = 'default' }: { _projectId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

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
      className="fixed bottom-6 right-6 w-84 sm:w-96 h-[480px] border border-border bg-white shadow-2xl flex flex-col z-50 rounded-2xl overflow-hidden"
    >
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
              <MessageSquare size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-800">¿En qué puedo ayudarte?</p>
            <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
              Prueba diciendo: <br />
              <span className="text-primary italic">"muestrame los proyectos"</span>
              <br />o <span className="text-primary italic">"crea un proyecto llamado App Móvil"</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-none shadow-xs'
                : 'bg-white border border-gray-200 text-slate-800 rounded-bl-none shadow-xs'
            }`}>
              <p>{msg.content}</p>
              {msg.payload && (
                <GraphCard payload={msg.payload} onNavigate={() => setOpen(false)} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-2xl text-xs text-muted-foreground flex items-center gap-1.5 shadow-xs">
              <Sparkles size={12} className="animate-spin text-amber-500" />
              Procesando...
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
          placeholder="Escribe una instrucción..."
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
