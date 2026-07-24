'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { AlertCircle, Sparkles } from 'lucide-react';
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

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
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

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary"
            >
              <Sparkles size={24} className="text-amber-500" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-foreground mb-1"
            >
              ForgeMind Intelligence
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-muted-foreground mb-8 text-center max-w-sm leading-relaxed"
            >
              Crea proyectos, asigna objetivos y conecta repositorios de GitHub. Escribe libremente con autocorrecion.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-xl"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Prueba escribir: 'muestrame los proyectos' o 'crea un proyecto llamado App Movil'"
                className="w-full bg-white border border-border rounded-xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
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
                            ? 'bg-primary text-white shadow-md rounded-br-none'
                            : 'bg-white text-foreground border border-border shadow-xs rounded-bl-none'
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
                    <div className="bg-white border border-border rounded-2xl p-4 shadow-xs space-y-2 w-64">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles size={14} className="animate-spin text-amber-500" />
                        Analizando consulta...
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-white">
              <div className="max-w-2xl mx-auto">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Escribe un mensaje o instrucción..."
                  className="w-full bg-gray-50 border border-border rounded-xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
