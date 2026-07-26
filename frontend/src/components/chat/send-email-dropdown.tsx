'use client';

import { useState, useRef, useEffect } from 'react';
import { Mail, Send, Check, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SendEmailDropdownProps {
  defaultEmail: string;
  onSend: (recipientEmail: string) => void;
  isSent?: boolean;
}

export function SendEmailDropdown({ defaultEmail, onSend, isSent }: SendEmailDropdownProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(defaultEmail);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmailInput(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleConfirmSend = (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    onSend(targetEmail.trim());
    setOpen(false);
  };

  const quickRecipients = [
    { label: 'Mi correo (Perfil)', email: defaultEmail },
    { label: 'Equipo de Desarrollo', email: 'dev-team@forgemind.app' },
    { label: 'Administración', email: 'admin@forgemind.app' },
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
          isSent
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
            : 'bg-current/10 hover:bg-current/20 border border-current/10'
        }`}
        title="Enviar respuesta por correo"
      >
        {isSent ? <Check size={13} /> : <Mail size={13} />}
        <span>{isSent ? 'Enviado' : 'Enviar a Email'}</span>
      </button>

      {/* Submenu Dropdown Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            className="absolute bottom-full right-0 mb-2 w-72 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-3.5 z-50 text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Mail size={14} className="text-blue-400" />
                Seleccionar Destinatario
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>

            {/* Custom Email Input */}
            <div className="space-y-2 mb-3">
              <label className="text-[11px] text-slate-400 font-medium">Correo electrónico:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmSend(emailInput)}
                  placeholder="ejemplo@correo.com"
                  className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => handleConfirmSend(emailInput)}
                  disabled={!emailInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl disabled:opacity-40 transition-all shrink-0"
                  title="Enviar correo"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
                Sugerencias rápidas
              </p>
              {quickRecipients.map((item) => (
                <button
                  key={item.email}
                  onClick={() => {
                    setEmailInput(item.email);
                    handleConfirmSend(item.email);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={12} className="text-slate-400 group-hover:text-blue-400 shrink-0" />
                    <span className="text-slate-300 font-medium truncate">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                    {item.email}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
