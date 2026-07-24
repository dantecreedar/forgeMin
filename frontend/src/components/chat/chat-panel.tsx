'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ _projectId = 'default' }: { _projectId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message || 'OK' }]);
      if (res.type === 'created' || res.type === 'updated' || res.type === 'deleted') {
        window.dispatchEvent(new CustomEvent('forgemind:refresh'));
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 text-xs px-4 py-2 border rounded hover:bg-neutral-50 transition-colors z-50 bg-white shadow-sm"
      >
        Chat
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 w-80 h-96 border bg-white shadow-lg flex flex-col z-50 rounded">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-primary text-white rounded-t">
        <span className="text-xs font-medium">ForgeMind AI</span>
        <button onClick={() => setOpen(false)} className="text-xs text-white/70 hover:text-white">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            Pregunta o da instrucciones
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-1.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-primary/10 rounded-xl' : 'text-foreground'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">...</div>}
        <div ref={endRef} />
      </div>

      <div className="border-t px-4 py-2.5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe un mensaje..."
          className="flex-1 text-xs border-none outline-none bg-transparent placeholder:text-muted-foreground"
        />
        <button onClick={send} disabled={loading} className="text-xs text-primary disabled:text-muted-foreground font-medium">
          Enviar
        </button>
      </div>
    </div>
  );
}
