'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, 
  Sparkles, 
  Users, 
  Mail, 
  Share2, 
  Send, 
  Plus, 
  CheckCircle2, 
  TrendingUp, 
  Building, 
  RefreshCw, 
  Search, 
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Bot,
  UserCheck,
  Zap,
  SlidersHorizontal,
  X,
  Target,
  FileText,
  Save,
  Check
} from 'lucide-react';
import { DotsLoader } from '@/components/ui/dots-loader';
import { DeerIcon } from '@/components/ui/deer-icon';
import { useProfileSettings } from '@/lib/settings-context';
import { translations } from '@/lib/translations';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role?: string;
  linkedinUrl?: string;
  status: 'NEW' | 'ENRICHED' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
  aiScore?: {
    score: number;
    reasoning: string;
    keySynergies: string[];
  };
  drafts?: Array<{
    channel: 'GMAIL' | 'LINKEDIN' | 'CUSTOM_EMAIL';
    subject?: string;
    body: string;
  }>;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: {
    type?: string;
    lead?: Lead;
  };
}

function LeadsChatContent() {
  const searchParams = useSearchParams();
  const { settings } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Redactor de Outreach
  const [selectedChannel, setSelectedChannel] = useState<'GMAIL' | 'LINKEDIN'>('GMAIL');
  const [outreachSubject, setOutreachSubject] = useState('');
  const [outreachBody, setOutreachBody] = useState('');
  const [sendingOutreach, setSendingOutreach] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: '🎯 Buscar en Stripe.com', query: 'Busca prospectos para la empresa en el dominio stripe.com en Apollo' },
    { label: '💼 Registrar Lead Tech', query: 'Agrega al prospecto Carlos Gómez (carlos@techcorp.com, CTO en TechCorp)' },
    { label: '✉️ Redactar Outreach', query: 'Redacta una propuesta de correo de outreach por Gmail para TechCorp' },
    { label: '📊 Sinergia con Repositorio', query: 'Analiza la sinergia entre mi código de GitHub y los prospectos guardados' },
  ];

  const fetchLeads = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/leads');
      if (res.ok) {
        const data = await res.json();
        setLeadsList(data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (selectedLead && selectedLead.drafts) {
      const draft = selectedLead.drafts.find((d) => d.channel === selectedChannel) || selectedLead.drafts[0];
      if (draft) {
        setOutreachSubject(draft.subject || `Propuesta Comercial para ${selectedLead.company}`);
        setOutreachBody(draft.body);
      }
    }
  }, [selectedLead, selectedChannel]);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsgId = 'user-' + Date.now();
    const newMsg: ChatMessageItem = { id: userMsgId, role: 'user', content: textToSend };
    
    setMessages((prev) => [...prev, newMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/v1/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-language': lang,
        },
        body: JSON.stringify({
          projectId: 'default',
          message: textToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessageItem = {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: data.message || 'Procesado con éxito.',
          payload: data,
        };

        if (data.lead) {
          setSelectedLead(data.lead);
          fetchLeads();
        }

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('Error in leads chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: 'Ocurrió un error al procesar la consulta de prospección. Intenta nuevamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOutreach = async () => {
    if (!selectedLead) return;
    try {
      setSendingOutreach(true);
      const res = await fetch('http://localhost:3001/api/v1/leads/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          channel: selectedChannel,
          subject: outreachSubject,
          body: outreachBody,
        }),
      });
      if (res.ok) {
        alert(selectedChannel === 'GMAIL' ? '¡Correo enviado vía Gmail con éxito!' : '¡Mensaje de LinkedIn preparado!');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error sending outreach:', err);
    } finally {
      setSendingOutreach(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafd] select-none relative overflow-hidden">
      {/* Botón flotante superior para abrir la lista de prospectos guardados */}
      <div className="absolute top-4 right-6 z-10">
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
        >
          <Users size={14} className="text-amber-500" />
          <span>Prospectos Guardados ({leadsList.length})</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          /* ESTADO INICIAL: Diseño idéntico al Intelligence Chat en el centro */
          <motion.div
            key="empty-state"
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
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 bg-clip-text text-transparent font-semibold inline-flex items-center gap-2">
                <DeerIcon size={32} className="text-amber-500 inline-block shrink-0" />
                ForgeMind
              </span>{' '}
              Leads & Prospección
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="text-sm text-slate-500 mb-9 font-normal leading-relaxed max-w-md"
            >
              Busca empresas en Apollo, registra prospectos y genera propuestas de correo por Gmail o LinkedIn mediante comandos de IA.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full space-y-4"
            >
              <div className="relative flex items-center bg-white border border-slate-200/90 rounded-3xl shadow-xs hover:shadow-md focus-within:shadow-md focus-within:border-amber-500/50 transition-all px-4 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                  placeholder="Escribe tu consulta a la Inteligencia de Leads (ej: busca prospectos de stripe.com...)"
                  className="w-full bg-transparent px-2 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleSendQuery()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-amber-600 transition-all shrink-0 shadow-xs"
                  title="Enviar instrucción"
                >
                  <ArrowUp size={18} />
                </button>
              </div>

              {/* Sugerencias Rápidas al Rededor del Chat */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {quickPrompts.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => handleSendQuery(item.query)}
                    className="flex items-center gap-2 text-xs bg-white hover:bg-slate-100/80 text-slate-700 border border-slate-200/80 px-4 py-2 rounded-2xl transition-all shadow-2xs font-medium"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ESTADO CONVERSACIONAL: Hilo del Chat en el centro */
          <motion.div
            key="chat-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-4 py-8">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[88%]">
                        <div
                          className={`relative transition-all ${
                            isUser
                              ? 'bg-slate-200/90 text-slate-900 px-4 py-3 rounded-3xl rounded-br-xs shadow-2xs font-medium text-xs sm:text-sm'
                              : 'bg-transparent text-slate-800 py-1 text-xs sm:text-sm leading-relaxed'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>

                          {/* Widget interactivo de Lead generado por la IA en la respuesta */}
                          {msg.payload?.lead && (
                            <div className="mt-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Building size={16} className="text-blue-600" />
                                  <span className="font-bold text-slate-900 text-sm">{msg.payload.lead.company}</span>
                                </div>
                                {msg.payload.lead.aiScore && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <TrendingUp size={12} /> {msg.payload.lead.aiScore.score}% Score Match
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500">{msg.payload.lead.name} • {msg.payload.lead.email}</p>

                              {msg.payload.lead.aiScore && (
                                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
                                  <p className="font-medium text-slate-800 mb-1">{msg.payload.lead.aiScore.reasoning}</p>
                                  {msg.payload.lead.aiScore.keySynergies.map((s, i) => (
                                    <p key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> {s}
                                    </p>
                                  ))}
                                </div>
                              )}

                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedLead(msg.payload!.lead!);
                                    setShowDrawer(true);
                                  }}
                                  className="flex-1 bg-slate-900 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                                >
                                  <Mail size={14} /> Redactar & Enviar Outreach
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-2.5">
                      <DotsLoader className="text-amber-500" />
                      <span className="text-xs text-slate-500 font-medium">Analizando prospección con IA...</span>
                    </div>
                  </motion.div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            {/* Barra Inferior cuando hay conversación activa */}
            <div className="border-t border-slate-200/80 p-4 bg-[#f8fafd]">
              <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white border border-slate-200/90 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all shadow-2xs">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                  placeholder="Escribe tu consulta a la Inteligencia de Leads..."
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none py-1.5 px-1"
                />
                <button
                  onClick={() => handleSendQuery()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-amber-600 transition-all shrink-0 shadow-xs"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer Desplegable para Prospectos Guardados e Inspector de Outreach */}
      <AnimatePresence>
        {showDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Prospectos Guardados</h3>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-2 border-b border-slate-200">
                {leadsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">Sin prospectos registrados aún.</p>
                ) : (
                  leadsList.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedLead?.id === lead.id
                          ? 'bg-amber-50/60 border-amber-400 text-slate-900 font-medium'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{lead.name}</span>
                        {lead.aiScore && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            {lead.aiScore.score}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{lead.company} • {lead.email}</p>
                    </div>
                  ))
                )}
              </div>

              {selectedLead && (
                <div className="p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Outreach para {selectedLead.name}</span>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 text-[10px]">
                      <button
                        onClick={() => setSelectedChannel('GMAIL')}
                        className={`px-2.5 py-1 rounded font-bold transition-all ${
                          selectedChannel === 'GMAIL' ? 'bg-amber-500 text-white' : 'text-slate-500'
                        }`}
                      >
                        Gmail
                      </button>
                      <button
                        onClick={() => setSelectedChannel('LINKEDIN')}
                        className={`px-2.5 py-1 rounded font-bold transition-all ${
                          selectedChannel === 'LINKEDIN' ? 'bg-amber-500 text-white' : 'text-slate-500'
                        }`}
                      >
                        LinkedIn
                      </button>
                    </div>
                  </div>

                  {selectedChannel === 'GMAIL' && (
                    <input
                      type="text"
                      value={outreachSubject}
                      onChange={(e) => setOutreachSubject(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                      placeholder="Asunto"
                    />
                  )}

                  <textarea
                    rows={4}
                    value={outreachBody}
                    onChange={(e) => setOutreachBody(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />

                  <button
                    onClick={handleSendOutreach}
                    disabled={sendingOutreach}
                    className="w-full bg-slate-900 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send size={14} /> {sendingOutreach ? 'Enviando...' : `Enviar vía ${selectedChannel === 'GMAIL' ? 'Gmail' : 'LinkedIn'}`}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LeadsChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Cargando Inteligencia de Leads...</div>}>
      <LeadsChatContent />
    </Suspense>
  );
}
