'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { ArrowUp, Sparkles, Folder, Target, FolderGit2 } from 'lucide-react';
import { GraphCard } from '@/components/chat/graph-card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  payload?: any;
}

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await api.engine.command(text);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.message || 'Operación completada',
          payload: res,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error de conexión con el servidor' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: '📊 Resumen Global con IA', query: 'analizar todo y dar un resumen global de los proyectos', icon: Sparkles },
    { label: 'Ver Proyectos', query: 'muestrame los proyectos', icon: Folder },
    { label: 'Crear Proyecto', query: 'crea un proyecto llamado App Movil', icon: Sparkles },
    { label: 'Ver Objetivos', query: 'muestrame los objetivos', icon: Target },
  ];


  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafd]">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full text-center"
          >
            {/* Gemini Studio Title Style */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl font-medium tracking-tight text-slate-800 mb-2"
            >
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold">
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
              Hola. Gestiona tus proyectos, objetivos y repositorios de GitHub mediante instrucciones de IA.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full space-y-4"
            >
              {/* Gemini Studio Prompt Composer Input Box */}
              <div className="relative flex items-center bg-white border border-slate-200/90 rounded-3xl shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-blue-500/50 transition-all px-4 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Introduce una consulta o instrucción..."
                  className="w-full bg-transparent px-2 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-blue-600 transition-all shrink-0 shadow-xs"
                  title="Enviar instrucción"
                >
                  <ArrowUp size={18} />
                </button>
              </div>

              {/* Gemini Studio Prompt Pill Cards */}
              <div className="flex flex-wrap justify-center gap-2 pt-3">
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
              <div className="max-w-2xl mx-auto py-8 space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[85%]">
                      <div
                        className={`px-4 py-3 text-sm leading-relaxed rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white shadow-xs rounded-br-none font-medium'
                            : 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Render Graph Node Cards */}
                      {msg.payload && (
                        <GraphCard payload={msg.payload} />
                      )}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2 w-64">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Sparkles size={14} className="animate-spin text-blue-600" />
                        Pensando...
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            {/* Bottom Input Area */}
            <div className="border-t border-slate-200/80 p-4 bg-[#f8fafd]">
              <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white border border-slate-200/90 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-2xs">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Introduce una consulta o instrucción..."
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none py-1.5 px-1"
                />
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
    </div>
  );
}
