'use client';

import { useState, useRef, useEffect } from 'react';
import { Mail, Send, Check, X, User, RefreshCw, Link2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface ContactItem {
  label: string;
  email: string;
}

interface SendEmailDropdownProps {
  defaultEmail?: string;
  onSend: (recipientEmail: string) => void;
  isSent?: boolean;
}

export function SendEmailDropdown({ defaultEmail, onSend, isSent }: SendEmailDropdownProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [hasGmailToken, setHasGmailToken] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);

  const activeUserEmail =
    typeof window !== 'undefined'
      ? localStorage.getItem('gmail_email') || user?.email || defaultEmail || ''
      : user?.email || defaultEmail || '';

  const [emailInput, setEmailInput] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [positionClass, setPositionClass] = useState('bottom-full mb-2');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setPendingConfirmEmail(null);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);

      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        if (rect.top < 280) {
          setPositionClass('top-full mt-2');
        } else {
          setPositionClass('bottom-full mb-2');
        }
      }

      fetchRealGmailContacts();
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const fetchRealGmailContacts = async () => {
    const primaryProfileEmail =
      localStorage.getItem('gmail_email') || user?.email || defaultEmail || 'briangalli.cloud1993@gmail.com';
    const primaryProfileName = user?.displayName ? `${user.displayName} (Perfil)` : 'Mi Perfil (Gmail)';

    const initialList: ContactItem[] = [
      { label: primaryProfileName, email: primaryProfileEmail },
    ];

    let localList: ContactItem[] = [];
    const savedContacts = localStorage.getItem('gmail_saved_contacts');
    if (savedContacts) {
      try {
        const parsed = JSON.parse(savedContacts);
        if (Array.isArray(parsed)) {
          localList = parsed;
        }
      } catch {}
    }

    const map = new Map<string, ContactItem>();
    [...initialList, ...localList].forEach((c) => {
      if (c.email) map.set(c.email.toLowerCase(), c);
    });

    setContacts(Array.from(map.values()));

    const accessToken = localStorage.getItem('gmail_access_token') || localStorage.getItem('google_token');
    setHasGmailToken(Boolean(accessToken));

    if (!accessToken) return;

    setLoadingContacts(true);
    try {
      const resConnections = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=30',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).catch(() => null);

      const resOther = await fetch(
        'https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses&pageSize=30',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).catch(() => null);

      const fetchedList: ContactItem[] = [];

      if (resConnections && resConnections.ok) {
        const data = await resConnections.json();
        (data.connections || []).forEach((person: any) => {
          const name = person.names?.[0]?.displayName || 'Contacto Gmail';
          const email = person.emailAddresses?.[0]?.value;
          if (email) fetchedList.push({ label: name, email });
        });
      }

      if (resOther && resOther.ok) {
        const dataOther = await resOther.json();
        (dataOther.otherContacts || []).forEach((person: any) => {
          const name = person.names?.[0]?.displayName || person.emailAddresses?.[0]?.value?.split('@')[0] || 'Contacto';
          const email = person.emailAddresses?.[0]?.value;
          if (email) fetchedList.push({ label: name, email });
        });
      }

      if (fetchedList.length > 0) {
        fetchedList.forEach((c) => {
          if (c.email) map.set(c.email.toLowerCase(), c);
        });
        const combined = Array.from(map.values());
        setContacts(combined);
        localStorage.setItem(
          'gmail_saved_contacts',
          JSON.stringify(combined.filter((c) => c.email.toLowerCase() !== primaryProfileEmail.toLowerCase()))
        );
      }
    } catch {
      // Retain stored list
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { url } = await api.gmail.getAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch {}
  };

  const handleRequestConfirmation = (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    setPendingConfirmEmail(targetEmail.trim());
  };

  const handleFinalSend = () => {
    if (!pendingConfirmEmail) return;
    const cleaned = pendingConfirmEmail;

    try {
      const saved = localStorage.getItem('gmail_saved_contacts');
      const list: ContactItem[] = saved ? JSON.parse(saved) : [];
      if (!list.some((c) => c.email.toLowerCase() === cleaned.toLowerCase())) {
        const nameFromEmail = cleaned.split('@')[0];
        const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
        const updated = [{ label: formattedName, email: cleaned }, ...list];
        localStorage.setItem('gmail_saved_contacts', JSON.stringify(updated));
      }
    } catch {}

    onSend(cleaned);
    setPendingConfirmEmail(null);
    setOpen(false);
  };

  const filteredContacts = contacts.filter((item) => {
    if (!emailInput.trim()) return true;
    const q = emailInput.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Action Button */}
      <button
        onClick={() => {
          setOpen(!open);
          setPendingConfirmEmail(null);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
          isSent
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
            : 'bg-slate-200/70 hover:bg-slate-200 text-slate-700 border border-slate-300/60'
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
            className={`absolute ${positionClass} left-0 sm:left-auto sm:right-0 w-80 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 z-50 text-xs text-left`}
          >
            {/* Confirmation View */}
            {pendingConfirmEmail ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                    <AlertCircle size={15} />
                    Confirmar Envío por Gmail
                  </span>
                  <button
                    onClick={() => setPendingConfirmEmail(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium">¿Enviar esta respuesta por correo a?</p>
                  <p className="text-xs font-bold text-white truncate">{pendingConfirmEmail}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setPendingConfirmEmail(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cambiar
                  </button>
                  <button
                    onClick={handleFinalSend}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Send size={13} />
                    <span>Confirmar Envío</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Selection View */
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Mail size={14} className="text-blue-400" />
                    Enviar por Gmail
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Connect Gmail button if token missing */}
                {!hasGmailToken && (
                  <button
                    onClick={handleConnectGmail}
                    className="w-full text-center bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Link2 size={13} />
                    <span>Vincular Gmail para Sincronizar Contactos</span>
                  </button>
                )}

                {/* Custom Email Input with Instant Autocomplete Search */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-medium">Buscar o escribir correo del destinatario:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRequestConfirmation(emailInput)}
                      placeholder="Escribe o selecciona un correo..."
                      className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRequestConfirmation(emailInput)}
                      disabled={!emailInput.trim()}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl disabled:opacity-40 transition-all shrink-0"
                      title="Siguiente para confirmar"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>

                {/* Google Contacts & Real Profile list */}
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Contactos Encontrados ({filteredContacts.length})
                    </p>
                    {loadingContacts && (
                      <span className="text-[10px] text-blue-400 flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin" /> Buscando...
                      </span>
                    )}
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {filteredContacts.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-2 italic">Sin contactos coincidentes</p>
                    ) : (
                      filteredContacts.map((item) => (
                        <button
                          key={item.email}
                          onClick={() => {
                            setEmailInput(item.email);
                            handleRequestConfirmation(item.email);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                            emailInput.toLowerCase() === item.email.toLowerCase()
                              ? 'bg-blue-600/30 border border-blue-500/40'
                              : 'hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <User size={12} className="text-blue-400 group-hover:text-blue-300 shrink-0" />
                            <span className="text-slate-200 font-medium truncate text-xs">{item.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                            {item.email}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
