'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { CheckCircle, AlertCircle, Trash2, Edit } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  item?: Record<string, unknown>;
}

const typeConfig: Record<string, { bg: string; border: string }> = {
  created: { bg: 'bg-emerald-50', border: 'border-emerald-200' },
  updated: { bg: 'bg-blue-50', border: 'border-blue-200' },
  deleted: { bg: 'bg-red-50', border: 'border-red-200' },
  error: { bg: 'bg-red-50', border: 'border-red-200' },
};

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
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: res.message || 'OK',
        type: res.type,
        item: res.item,
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error de conexion' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center px-4"
          >
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-primary mb-1"
            >
              ForgeMind
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground mb-8"
            >
              Motor de Inteligencia
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
                placeholder="Crea un proyecto, agrega un objetivo, lista tus workspaces..."
                className="w-full bg-white border border-border rounded-xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-sm"
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto px-4">
              <div className="max-w-2xl mx-auto py-8 space-y-4">
                {messages.map((msg, i) => {
                  const cfg = msg.type ? typeConfig[msg.type] : null;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[80%]">
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={`px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-white text-foreground border border-border shadow-sm'
                          }`}
                        >
                          {msg.content}
                        </motion.div>
                        {msg.role === 'assistant' && cfg && msg.type !== 'error' && msg.item && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-2 ${cfg.bg} border ${cfg.border} rounded-xl p-3`}
                          >
                            <h4 className="text-sm font-medium text-foreground">
                              {String(msg.item?.title || msg.item?.name || '')}
                            </h4>
                            {msg.item?.description ? (
                              <p className="text-xs text-muted-foreground mt-1">{String(msg.item.description)}</p>
                            ) : null}
                          </motion.div>
                        )}
                        {msg.type === 'error' && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3"
                          >
                            <div className="flex items-center gap-2">
                              <AlertCircle size={14} className="text-red-600" />
                              <span className="text-xs text-red-700">Error</span>
                            </div>
                          </motion.div>
                        )}
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
                    <div className="bg-white border border-border rounded-2xl p-4 shadow-sm space-y-2 w-64">
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                    </div>
                  </motion.div>
                )}
                <div ref={endRef} />
              </div>
            </div>
            <div className="border-t border-border p-4">
              <div className="max-w-2xl mx-auto">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Escribe un mensaje..."
                  className="w-full bg-white border border-border rounded-xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-sm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
