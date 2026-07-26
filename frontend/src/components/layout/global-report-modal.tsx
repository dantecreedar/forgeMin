'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, CheckCircle, AlertCircle, RefreshCw, Send, FileText, Target, Sparkles, Inbox, Plus, Search, Users, User, ArrowRight, Key, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface GlobalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectName?: string;
  defaultSummary?: string;
}

interface GmailMessageItem {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

interface GoogleContactItem {
  name: string;
  email: string;
}

export function GlobalReportModal({ isOpen, onClose, defaultProjectName, defaultSummary }: GlobalReportModalProps) {
  const { loginWithGoogle } = useAuth();
  const [folder, setFolder] = useState<'inbox' | 'compose' | 'contacts' | 'templates'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageItem | null>(null);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);

  // Compose State
  const [reportType, setReportType] = useState<'project' | 'documents' | 'app'>('project');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // Inbox & Contacts State
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxMessages, setInboxMessages] = useState<GmailMessageItem[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [contactsList, setContactsList] = useState<GoogleContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [analyzingMessageId, setAnalyzingMessageId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('access_token');
      const urlEmail = urlParams.get('email');

      if (urlToken && urlEmail) {
        localStorage.setItem('gmail_access_token', urlToken);
        localStorage.setItem('gmail_email', urlEmail);
        setGmailConnected(true);
        setGmailToken(urlToken);
        setGmailEmail(urlEmail);
      } else {
        const token = localStorage.getItem('gmail_access_token') || localStorage.getItem('google_token');
        const email = localStorage.getItem('gmail_email') || localStorage.getItem('user_email') || 'Cuenta de Google';
        if (token) {
          setGmailConnected(true);
          setGmailToken(token);
          setGmailEmail(email);
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && gmailToken) {
      if (folder === 'inbox') {
        loadLiveInboxMessages();
      } else if (folder === 'contacts') {
        loadLiveContacts();
      }
    }
  }, [isOpen, folder, gmailToken]);

  useEffect(() => {
    if (reportType === 'project') {
      setEmailSubject(`Reporte Ejecutivo: ${defaultProjectName || 'ForgeMind'}`);
      setEmailContent(
        `Estado del Proyecto ${defaultProjectName || 'ForgeMind'}:\n\n${defaultSummary || 'El proyecto se encuentra actualizado y en desarrollo activo.'}\n\n- Fecha de emisión: ${new Date().toLocaleDateString()}`
      );
    } else if (reportType === 'documents') {
      setEmailSubject(`Reporte de Documentos y Especificaciones Técnicas`);
      setEmailContent(
        `Resumen de Análisis de Documentación Técnica:\n\n- Proyecto: ${defaultProjectName || 'ForgeMind'}\n- Estado: Documentación verificada e integrada.`
      );
    } else {
      setEmailSubject(`Reporte de Estado Global de la Plataforma`);
      setEmailContent(
        `Estado Consolidado del Sistema ForgeMind:\n\n- Disponibilidad: 100%\n- Motor IA Gemini: Operativo`
      );
    }
  }, [reportType, defaultProjectName, defaultSummary]);

  const loadLiveInboxMessages = async () => {
    const tokenToUse = gmailToken || localStorage.getItem('google_token');
    if (!tokenToUse) return;
    setLoadingInbox(true);
    try {
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData.error?.message || 'Error de la API de Gmail');
      }

      const rawMessages = listData.messages || [];
      const messagesWithDetails = await Promise.all(
        rawMessages.map(async (msgItem: { id: string }) => {
          try {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`, {
              headers: { Authorization: `Bearer ${tokenToUse}` },
            });
            const detail = await detailRes.json();
            const headers = detail.payload?.headers || [];
            const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'Sin asunto';
            const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Remitente';
            const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

            return {
              id: msgItem.id,
              subject,
              from,
              snippet: detail.snippet || '',
              date: date ? new Date(date).toLocaleDateString() : '',
            };
          } catch {
            return null;
          }
        })
      );

      const loadedMsgs = messagesWithDetails.filter(Boolean) as GmailMessageItem[];
      setInboxMessages(loadedMsgs);

      // Automatically generate contacts list from inbox senders
      loadLiveContacts(loadedMsgs);
    } catch {
      setInboxMessages([]);
    } finally {
      setLoadingInbox(false);
    }
  };

  const extractContactsFromInbox = (messages: GmailMessageItem[]): GoogleContactItem[] => {
    const map = new Map<string, string>();
    messages.forEach((msg) => {
      if (!msg.from) return;
      const match = msg.from.match(/^(?:"?([^"<]+)"?\s*)?<?([^>]+)>?$/);
      if (match) {
        const name = match[1]?.trim() || match[2].split('@')[0];
        const email = match[2]?.trim();
        if (email && email.includes('@')) {
          map.set(email.toLowerCase(), name);
        }
      } else if (msg.from.includes('@')) {
        map.set(msg.from.toLowerCase(), msg.from.split('@')[0]);
      }
    });

    return Array.from(map.entries()).map(([email, name]) => ({ name, email }));
  };

  const loadLiveContacts = async (currentInboxMsgs?: GmailMessageItem[]) => {
    const tokenToUse = gmailToken || localStorage.getItem('google_token');
    setLoadingContacts(true);
    try {
      const msgsToUse = currentInboxMsgs || inboxMessages;
      const inboxContacts = extractContactsFromInbox(msgsToUse);
      let apiContacts: GoogleContactItem[] = [];

      if (tokenToUse) {
        const [connectionsRes, otherContactsRes] = await Promise.allSettled([
          fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=50', {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          }),
          fetch('https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses&pageSize=50', {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          }),
        ]);

        if (connectionsRes.status === 'fulfilled' && connectionsRes.value.ok) {
          const data = await connectionsRes.value.json();
          (data.connections || []).forEach((p: any) => {
            const name = p.names?.[0]?.displayName || 'Contacto';
            const email = p.emailAddresses?.[0]?.value;
            if (email) apiContacts.push({ name, email });
          });
        }

        if (otherContactsRes.status === 'fulfilled' && otherContactsRes.value.ok) {
          const data = await otherContactsRes.value.json();
          (data.otherContacts || []).forEach((p: any) => {
            const name = p.names?.[0]?.displayName || 'Contacto Frecuente';
            const email = p.emailAddresses?.[0]?.value;
            if (email) apiContacts.push({ name, email });
          });
        }
      }

      const combined = [...inboxContacts, ...apiContacts];
      const uniqueContacts: GoogleContactItem[] = [];
      const seen = new Set<string>();

      combined.forEach((c) => {
        const lower = c.email.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueContacts.push(c);
        }
      });

      setContactsList(uniqueContacts);
    } catch {
      setContactsList(extractContactsFromInbox(currentInboxMsgs || inboxMessages));
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleAuthorizeScope = async () => {
    try {
      await loginWithGoogle();
      const freshToken = localStorage.getItem('google_token');
      if (freshToken) {
        setGmailToken(freshToken);
        setGmailConnected(true);
        if (folder === 'contacts') loadLiveContacts();
        if (folder === 'inbox') loadLiveInboxMessages();
      }
    } catch (e: any) {
      alert('Error durante la autorización: ' + e.message);
    }
  };

  const analyzeEmailContent = async (msg: GmailMessageItem) => {
    setAnalyzingMessageId(msg.id);
    try {
      const prompt = `Analiza el siguiente correo recibido y genera un resumen ejecutivo con puntos clave y acciones recomendadas:\nDe: ${msg.from}\nAsunto: ${msg.subject}\nContenido: ${msg.snippet}`;
      const res = await api.engine.command(prompt);
      setAnalysisResults((prev) => ({
        ...prev,
        [msg.id]: res.message || 'Análisis completado.',
      }));
    } catch {
      setAnalysisResults((prev) => ({
        ...prev,
        [msg.id]: 'Error al procesar el mensaje con IA.',
      }));
    } finally {
      setAnalyzingMessageId(null);
    }
  };

  const connectGmail = async () => {
    try {
      const res = await api.gmail.getAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert('Error al vincular con Google: ' + (err.message || 'Verifica GOOGLE_CLIENT_ID'));
    }
  };

  const handleSendReportEmail = async () => {
    if (!emailTo.trim()) {
      setEmailErrorMsg('Ingresa un correo destinatario.');
      return;
    }
    const tokenToUse = gmailToken || localStorage.getItem('google_token');
    if (!tokenToUse) {
      setEmailErrorMsg('Vincula tu cuenta de Google para enviar correos.');
      return;
    }

    setSendingEmail(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const res = await api.gmail.sendReport({
        accessToken: tokenToUse,
        to: emailTo.trim(),
        subject: emailSubject.trim() || 'Reporte de Estado - ForgeMind',
        content: emailContent,
        projectName: defaultProjectName || 'ForgeMind',
      });

      if (res.success) {
        setEmailSuccessMsg('¡Correo enviado exitosamente mediante Gmail!');
        setTimeout(() => {
          setFolder('inbox');
          setEmailSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Error al enviar el correo.');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredMessages = inboxMessages.filter(
    (m) =>
      m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.from?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contactsList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl h-[620px] flex overflow-hidden text-left"
        >
          {/* Sidebar */}
          <div className="w-56 bg-slate-50 border-r border-slate-200/80 p-4 flex flex-col justify-between shrink-0 select-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">ForgeMail</h3>
                  <span className="text-[10px] text-slate-500 font-medium">Conectado a tu Gmail</span>
                </div>
              </div>

              <button
                onClick={() => setFolder('compose')}
                className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold flex items-center gap-2.5 shadow-sm transition-all hover:shadow-md"
              >
                <Plus size={18} className="text-red-500" />
                <span>Redactar Reporte</span>
              </button>

              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setFolder('inbox');
                    setSelectedMessage(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    folder === 'inbox'
                      ? 'bg-red-500/10 text-red-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox size={16} />
                    <span>Recibidos</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                    {inboxMessages.length}
                  </span>
                </button>

                <button
                  onClick={() => setFolder('contacts')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    folder === 'contacts'
                      ? 'bg-red-500/10 text-red-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={16} />
                    <span>Mis Contactos</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                    {contactsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setFolder('templates')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    folder === 'templates'
                      ? 'bg-red-500/10 text-red-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  <FileText size={16} />
                  <span>Plantillas IA</span>
                </button>
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2 h-2 rounded-full ${gmailConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-[11px] font-semibold text-slate-700 truncate">
                  {gmailConnected ? gmailEmail : 'Sin vincular'}
                </span>
              </div>
              <button
                onClick={handleAuthorizeScope}
                className="w-full text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Key size={12} className="text-amber-400" />
                <span>Autorizar Permisos</span>
              </button>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Top Bar */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
              <div className="flex-1 max-w-md relative flex items-center">
                <Search size={15} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={folder === 'contacts' ? 'Buscar contactos...' : 'Buscar correos reales...'}
                  className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-900 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (folder === 'inbox') loadLiveInboxMessages();
                    if (folder === 'contacts') loadLiveContacts();
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                  title="Actualizar datos reales"
                >
                  <RefreshCw size={15} className={loadingInbox || loadingContacts ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Folder 1: INBOX */}
            {folder === 'inbox' && (
              <div className="flex-1 overflow-hidden flex">
                <div className={`${selectedMessage ? 'w-1/2 border-r border-slate-100' : 'w-full'} flex flex-col h-full overflow-y-auto divide-y divide-slate-100`}>
                  {loadingInbox ? (
                    <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                      <RefreshCw size={20} className="animate-spin text-red-500 mx-auto" />
                      <p>Consultando mensajes en tu Gmail en tiempo real...</p>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 space-y-3 px-6 max-w-sm mx-auto">
                      <Inbox size={28} className="text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">Sin correos cargados aún</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Es necesario presionar el botón de Autorizar Permisos para conceder acceso a tu bandeja de entrada de Gmail.
                      </p>
                      <button
                        onClick={handleAuthorizeScope}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-2xl transition-all shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Key size={14} /> Autorizar Acceso a Gmail
                      </button>
                    </div>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isSelected = selectedMessage?.id === msg.id;
                      return (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className={`p-4 cursor-pointer transition-all hover:bg-slate-50 flex items-start gap-3 ${
                            isSelected ? 'bg-red-50/40 border-l-4 border-l-red-500' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {msg.from?.charAt(0) || 'G'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{msg.from}</p>
                              <span className="text-[10px] text-slate-400 shrink-0">{msg.date}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">{msg.subject}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{msg.snippet}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedMessage && (
                  <div className="w-1/2 p-6 flex flex-col h-full overflow-y-auto space-y-4 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/80">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{selectedMessage.subject}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">De: {selectedMessage.from}</p>
                      </div>
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="text-xs text-slate-400 hover:text-slate-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-2xs">
                      {selectedMessage.snippet}
                    </div>

                    {analysisResults[selectedMessage.id] ? (
                      <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl text-xs text-slate-800 space-y-1.5 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-700">
                          <Sparkles size={14} />
                          <span>Análisis Ejecutivo IA</span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed text-slate-700">
                          {analysisResults[selectedMessage.id]}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => analyzeEmailContent(selectedMessage)}
                        disabled={analyzingMessageId === selectedMessage.id}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm w-fit"
                      >
                        <Sparkles size={14} className={analyzingMessageId === selectedMessage.id ? 'animate-spin text-amber-400' : 'text-amber-400'} />
                        <span>{analyzingMessageId === selectedMessage.id ? 'Analizando mensaje...' : 'Analizar Mensaje con IA'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Folder 2: CONTACTS */}
            {folder === 'contacts' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Mis Contactos Reales de Google
                  </h3>
                  <button
                    onClick={handleAuthorizeScope}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Key size={13} />
                    <span>Autorizar Contactos</span>
                  </button>
                </div>

                {loadingContacts ? (
                  <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                    <RefreshCw size={20} className="animate-spin text-blue-600 mx-auto" />
                    <p>Consultando tu lista de contactos en Google People API...</p>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 space-y-3 max-w-sm mx-auto">
                    <Users size={28} className="text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-800 text-sm">Sin contactos sincronizados</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Presiona el botón de abajo para iniciar la autorización de permisos de contactos de tu cuenta de Google.
                    </p>
                    <button
                      onClick={handleAuthorizeScope}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Key size={14} /> Autorizar Permisos de Contactos
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredContacts.map((contact, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {contact.name?.charAt(0) || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{contact.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEmailTo(contact.email);
                            setFolder('compose');
                          }}
                          className="p-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-slate-600 text-xs font-semibold transition-all shrink-0 flex items-center gap-1"
                          title="Enviar reporte a este contacto"
                        >
                          <span>Enviar</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Folder 3: REDACTAR REPORTE */}
            {folder === 'compose' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Send size={16} className="text-red-500" />
                    Nuevo Reporte por Correo
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Generador Inteligente</span>
                </div>

                {emailSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                    <span>{emailSuccessMsg}</span>
                  </div>
                )}

                {emailErrorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-600 shrink-0" />
                    <span>{emailErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Tipo de Reporte:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportType('project')}
                      className={`p-2.5 border rounded-xl text-left transition-all flex items-center gap-2 ${
                        reportType === 'project'
                          ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Target size={14} className={reportType === 'project' ? 'text-red-500' : 'text-slate-400'} />
                      <span className="text-xs">Estado Proyecto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType('documents')}
                      className={`p-2.5 border rounded-xl text-left transition-all flex items-center gap-2 ${
                        reportType === 'documents'
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={14} className={reportType === 'documents' ? 'text-purple-600' : 'text-slate-400'} />
                      <span className="text-xs">Documentos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType('app')}
                      className={`p-2.5 border rounded-xl text-left transition-all flex items-center gap-2 ${
                        reportType === 'app'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles size={14} className={reportType === 'app' ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-xs">Estado App</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Para (Destinatario):
                    </label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Asunto:
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cuerpo del Mensaje:
                    </label>
                    <textarea
                      rows={5}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-500/20 font-sans leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setFolder('inbox')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendReportEmail}
                    disabled={sendingEmail || !gmailConnected}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    {sendingEmail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {sendingEmail ? 'Enviando...' : 'Enviar por Gmail'}
                  </button>
                </div>
              </div>
            )}

            {/* Folder 4: PLANTILLAS */}
            {folder === 'templates' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Plantillas de Reportes IA</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setReportType('project');
                      setFolder('compose');
                    }}
                    className="p-4 bg-slate-50 hover:bg-red-50/40 border border-slate-200 rounded-2xl cursor-pointer transition-all space-y-2"
                  >
                    <Target size={20} className="text-red-500" />
                    <p className="text-xs font-bold text-slate-900">Reporte Ejecutivo de Proyecto</p>
                    <p className="text-[11px] text-slate-500">Formato conciso para clientes con avances clave y métricas.</p>
                  </div>

                  <div
                    onClick={() => {
                      setReportType('documents');
                      setFolder('compose');
                    }}
                    className="p-4 bg-slate-50 hover:bg-purple-50/40 border border-slate-200 rounded-2xl cursor-pointer transition-all space-y-2"
                  >
                    <FileText size={20} className="text-purple-600" />
                    <p className="text-xs font-bold text-slate-900">Reporte de Especificaciones</p>
                    <p className="text-[11px] text-slate-500">Resumen de requerimientos y análisis técnico procesado.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
