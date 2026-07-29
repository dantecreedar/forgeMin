'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  Check,
  Rocket
} from 'lucide-react';
import { DotsLoader } from '@/components/ui/dots-loader';
import { DeerIcon } from '@/components/ui/deer-icon';
import { useProfileSettings } from '@/lib/settings-context';
import { renderFormattedText } from '@/lib/link-renderer';
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
  dripSequence?: Array<{
    stepNumber: number;
    delayDays: number;
    subject?: string;
    body: string;
    status: 'PENDING' | 'SENT' | 'SKIPPED';
  }>;
}

interface LinkedInPersonItem {
  id: string;
  name: string;
  headline?: string;
  profilePictureUrl?: string;
  profileUrl: string;
  company?: string;
  location?: string;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  payload?: {
    type?: string;
    lead?: Lead;
    linkedInPeople?: LinkedInPersonItem[];
    hasMore?: boolean;
    searchContext?: { industry: string; role: string };
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<{ firstName: string; lastName: string; headline?: string; profilePictureUrl?: string; profileUrl: string } | null>(null);
  const [showLinkedInProfile, setShowLinkedInProfile] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  // Paginación de búsqueda LinkedIn
  const [linkedInSearchContext, setLinkedInSearchContext] = useState<{ industry: string; role: string; page: number; total: number } | null>(null);
  const [loadingMoreLinkedIn, setLoadingMoreLinkedIn] = useState(false);

  // Verificar estado de LinkedIn y Gmail al montar
  useEffect(() => {
    const checkLinkedIn = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/linkedin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.connected && data.profile) {
            setIsLinkedInConnected(true);
            setLinkedInProfile(data.profile);
          }
        }
      } catch {}
    };
    checkLinkedIn();

    const gToken = localStorage.getItem('gmail_access_token') || localStorage.getItem('google_token');
    const gEmail = localStorage.getItem('gmail_email') || localStorage.getItem('user_email');
    if (gToken) {
      setIsGmailConnected(true);
      setGmailEmail(gEmail || 'Gmail Conectado');
    }
  }, []);

  // Manejar el regreso del callback OAuth de LinkedIn y Gmail
  useEffect(() => {
    if (searchParams.get('linkedin_connected') === 'true') {
      setIsLinkedInConnected(true);
      // Cargar perfil tras conectar
      fetch('http://localhost:3001/api/v1/linkedin/me')
        .then(r => r.json())
        .then(data => { if (data.profile) setLinkedInProfile(data.profile); })
        .catch(() => {});
    }

    if (searchParams.get('gmail_status') === 'success') {
      const gToken = searchParams.get('access_token');
      const gEmail = searchParams.get('email');
      if (gToken) {
        localStorage.setItem('gmail_access_token', gToken);
        if (gEmail) localStorage.setItem('gmail_email', gEmail);
        setIsGmailConnected(true);
        setGmailEmail(gEmail || 'Gmail Conectado');
      }
    }
  }, [searchParams]);

  // Estado de Éxito de Envío
  const [outreachSuccessData, setOutreachSuccessData] = useState<{
    show: boolean;
    channel: 'GMAIL' | 'LINKEDIN';
    leadName: string;
    leadEmail: string;
    leadLinkedin?: string;
  } | null>(null);

  // Selector de Contactos antes de enviar
  const [showContactSelector, setShowContactSelector] = useState<{
    show: boolean;
    channel: 'GMAIL' | 'LINKEDIN';
  } | null>(null);
  const [selectedContactEmail, setSelectedContactEmail] = useState<string>('');

  // Wizard de Conexión
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ industry: '', role: '', value: '' });

  // Redactor de Outreach
  const [selectedChannel, setSelectedChannel] = useState<'GMAIL' | 'LINKEDIN'>('GMAIL');
  const [outreachSubject, setOutreachSubject] = useState('');
  const [outreachBody, setOutreachBody] = useState('');
  const [sendingOutreach, setSendingOutreach] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = [
    { label: '🎯 Buscar en Stripe.com', query: 'Busca prospectos para la empresa en el dominio stripe.com en Apollo' },
    { label: '🔍 Buscar a...', query: 'buscar a ', isFillOnly: true },
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

  const handleCompleteWizard = async () => {
    setShowWizard(false);
    const { industry, role, value } = wizardData;
    setWizardStep(1);
    setWizardData({ industry: '', role: '', value: '' });

    // Mostrar mensaje de usuario en el chat
    const userQuery = `Busca prospectos en LinkedIn: ${role}s de ${industry} para ofrecer ${value}`;
    const userMsg: ChatMessageItem = { id: 'user-' + Date.now(), role: 'user', content: userQuery };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      if (isLinkedInConnected) {
        // Búsqueda real (o simulada realista) en LinkedIn
        const res = await fetch(`http://localhost:3001/api/v1/linkedin/search?industry=${encodeURIComponent(industry)}&role=${encodeURIComponent(role)}&page=0`);
        const data = await res.json();

        if (data.connected && data.people?.length > 0) {
          setLinkedInSearchContext({ industry, role, page: 0, total: data.total });
          const assistantMsg: ChatMessageItem = {
            id: 'assistant-' + Date.now(),
            role: 'assistant',
            content: `Encontré **${data.total} perfiles** de ${role}s en la industria de ${industry} en LinkedIn. Mostrando los primeros ${data.people.length} resultados:`,
            payload: {
              type: 'linkedin_results',
              linkedInPeople: data.people,
              hasMore: data.hasMore,
              searchContext: { industry, role },
            },
          };
          setMessages(prev => [...prev, assistantMsg]);
        } else {
          setMessages(prev => [...prev, {
            id: 'assistant-' + Date.now(),
            role: 'assistant',
            content: `No encontré resultados para ${role}s en ${industry}. Intenta con términos más generales o conecta de nuevo tu cuenta de LinkedIn.`,
          }]);
        }
      } else {
        // No conectado: pedir conexión
        setMessages(prev => [...prev, {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: `Para buscar prospectos reales en LinkedIn, primero necesito que conectes tu cuenta. Haz clic en el botón **"Conectar LinkedIn"** en la parte superior de la pantalla.`,
        }]);
      }
    } catch (err) {
      console.error('Error en búsqueda LinkedIn:', err);
      setMessages(prev => [...prev, {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: 'Ocurrió un error al buscar en LinkedIn. Verifica tu conexión e intenta nuevamente.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMoreLinkedIn = async () => {
    if (!linkedInSearchContext || loadingMoreLinkedIn) return;
    setLoadingMoreLinkedIn(true);
    const nextPage = linkedInSearchContext.page + 1;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/linkedin/search?industry=${encodeURIComponent(linkedInSearchContext.industry)}&role=${encodeURIComponent(linkedInSearchContext.role)}&page=${nextPage}`);
      const data = await res.json();

      // Desactivar el botón anterior
      setMessages(prev => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].payload?.type === 'linkedin_results' && copy[i].payload?.hasMore) {
            copy[i] = {
              ...copy[i],
              payload: {
                ...copy[i].payload,
                hasMore: false
              }
            };
            break;
          }
        }
        return copy;
      });

      if (data.people?.length > 0) {
        setLinkedInSearchContext(prev => prev ? { ...prev, page: nextPage } : null);
        const moreMsg: ChatMessageItem = {
          id: 'assistant-more-' + Date.now(),
          role: 'assistant',
          content: `Cargando más resultados (página ${nextPage + 1}):`,
          payload: {
            type: 'linkedin_results',
            linkedInPeople: data.people,
            hasMore: data.hasMore,
            searchContext: { industry: linkedInSearchContext.industry, role: linkedInSearchContext.role },
          },
        };
        setMessages(prev => [...prev, moreMsg]);
      } else {
        const noMoreMsg: ChatMessageItem = {
          id: 'assistant-nomore-' + Date.now(),
          role: 'assistant',
          content: 'No hay más resultados disponibles en LinkedIn para esta búsqueda.',
        };
        setMessages(prev => [...prev, noMoreMsg]);
      }
    } catch (err) {
      console.error('Error cargando más resultados:', err);
    } finally {
      setLoadingMoreLinkedIn(false);
    }
  };

  const handleInputChange = (val: string) => {
    if (input.startsWith('buscar a ') && !val.startsWith('buscar a ')) {
      setInput('buscar a ');
      return;
    }
    setInput(val);
  };

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

        if (data.type === 'linkedin_results' && data.searchContext) {
          setLinkedInSearchContext({
            industry: data.searchContext.industry || '',
            role: data.searchContext.role || '',
            page: 0,
            total: data.linkedInPeople?.length || 0,
          });
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
        setOutreachSuccessData({
          show: true,
          channel: selectedChannel,
          leadName: selectedLead.name || 'Prospecto sin nombre',
          leadEmail: selectedLead.email,
          leadLinkedin: selectedLead.linkedinUrl,
        });
        fetchLeads();
        setShowDrawer(false);
      }
    } catch (err) {
      console.error('Error sending outreach:', err);
      alert('Error de conexión con el servidor al procesar el outreach.');
    } finally {
      setSendingOutreach(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafd] select-none relative overflow-hidden">

      {/* Header: botones flotantes superiores */}
      <div className="absolute top-4 right-6 z-10 flex items-center gap-2">
        {/* Indicador de LinkedIn */}
        <div className="relative">
          <button
            onClick={() => {
              if (isLinkedInConnected) {
                setShowLinkedInProfile(prev => !prev);
              } else {
                window.location.href = 'http://localhost:3001/api/v1/linkedin/auth';
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all ${
              isLinkedInConnected
                ? 'bg-[#0A66C2] border-[#0A66C2] text-white hover:bg-[#004182]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isLinkedInConnected ? (
              <>
                {linkedInProfile?.profilePictureUrl ? (
                  <img src={linkedInProfile.profilePictureUrl} alt="LI" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold">
                    {linkedInProfile?.firstName?.[0] || 'L'}
                  </div>
                )}
                <span>LinkedIn Conectado</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <span>Conectar LinkedIn</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              </>
            )}
          </button>

          {/* Mini-popup de perfil */}
          {showLinkedInProfile && isLinkedInConnected && linkedInProfile && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50"
            >
              <div className="flex items-center gap-3">
                {linkedInProfile.profilePictureUrl ? (
                  <img src={linkedInProfile.profilePictureUrl} alt="Perfil" className="w-12 h-12 rounded-full object-cover border-2 border-[#0A66C2]/20" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-lg">
                    {linkedInProfile.firstName[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{linkedInProfile.firstName} {linkedInProfile.lastName}</p>
                  <p className="text-xs text-slate-500 truncate">{linkedInProfile.headline || 'LinkedIn'}</p>
                </div>
              </div>
              <a href={linkedInProfile.profileUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 w-full text-[11px] font-bold text-[#0A66C2] hover:underline">
                Ver perfil en LinkedIn <ExternalLink size={10} />
              </a>
            </motion.div>
          )}
        </div>

        {/* Indicador de Gmail */}
        <div className="relative">
          <button
            onClick={async () => {
              if (isGmailConnected) {
                if (confirm('¿Deseas desvincular tu cuenta de Gmail?')) {
                  localStorage.removeItem('gmail_access_token');
                  localStorage.removeItem('gmail_email');
                  setIsGmailConnected(false);
                  setGmailEmail(null);
                }
              } else {
                try {
                  const res = await fetch('http://localhost:3001/api/v1/gmail/auth-url');
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch {}
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all ${
              isGmailConnected
                ? 'bg-[#EA4335] border-[#EA4335] text-white hover:bg-[#c53727]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isGmailConnected ? (
              <>
                <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold shrink-0">
                  {gmailEmail?.[0]?.toUpperCase() || 'G'}
                </div>
                <span className="truncate max-w-[120px]">{gmailEmail || 'Gmail Conectado'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span>Conectar Gmail</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              </>
            )}
          </button>
        </div>

        {/* Botón prospectos guardados */}
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
              <div className="relative flex items-center bg-white border border-slate-200/90 rounded-3xl shadow-xs hover:shadow-md focus-within:shadow-md focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all px-4 py-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
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
                    onClick={() => {
                      if (item.isFillOnly) {
                        setInput(item.query);
                        setTimeout(() => {
                          if (inputRef.current) {
                            inputRef.current.focus();
                            const len = inputRef.current.value.length;
                            inputRef.current.setSelectionRange(len, len);
                          }
                        }, 50);
                      } else {
                        handleSendQuery(item.query);
                      }
                    }}
                    className="flex items-center gap-2 text-xs bg-white hover:bg-slate-100/80 text-slate-700 border border-slate-200/80 px-4 py-2 rounded-2xl transition-all shadow-2xs font-medium"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-xs hover:shadow-md transition-all"
                >
                  🚀 Conectar Clientes
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-amber-600 transition-colors"
                >
                  <Target size={14} /> ¿Cómo funciona esto? Ver Guía
                </button>
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
                          <p className="whitespace-pre-line">{renderFormattedText(msg.content)}</p>

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

                          {/* Tarjetas de perfiles de LinkedIn */}
                          {msg.payload?.type === 'linkedin_results' && msg.payload.linkedInPeople && (
                            <div className="mt-3 space-y-2">
                              {msg.payload.linkedInPeople.map((person) => (
                                <motion.div
                                  key={person.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm flex items-center gap-3 hover:border-[#0A66C2]/30 hover:shadow-md transition-all group"
                                >
                                  {/* Avatar */}
                                  {person.profilePictureUrl ? (
                                    <img src={person.profilePictureUrl} alt={person.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                      {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                  )}

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{person.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{person.headline}</p>
                                    {person.company && (
                                      <p className="text-[11px] text-slate-400 truncate">{person.company}{person.location ? ` • ${person.location}` : ''}</p>
                                    )}
                                  </div>

                                  {/* Acciones */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                      href={person.profileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors"
                                      title="Ver en LinkedIn"
                                    >
                                      <ExternalLink size={14} />
                                    </a>
                                    <button
                                      onClick={() => {
                                        const newLead = {
                                          id: `li_${person.id}_${Date.now()}`,
                                          name: person.name,
                                          email: `${person.name.toLowerCase().replace(/\s+/g, '.')}@${(person.company || 'empresa').toLowerCase().replace(/\s+/g, '')}.com`,
                                          company: person.company || 'LinkedIn',
                                          role: person.headline || 'Profesional',
                                          linkedinUrl: person.profileUrl,
                                          status: 'ENRICHED',
                                          aiScore: { score: 88, reasoning: `Perfil de LinkedIn compatible con la búsqueda.`, keySynergies: ['Contacto directo en LinkedIn', 'Perfil profesional verificado'] },
                                          drafts: [
                                            { channel: 'LINKEDIN', subject: 'Conexión estratégica', body: `Hola ${person.name.split(' ')[0]}, he visto tu trabajo en ${person.company || 'tu empresa'} y me gustaría conectar.`, generatedAt: new Date() },
                                            { channel: 'GMAIL', subject: `Propuesta para ${person.company || 'tu empresa'}`, body: `Hola ${person.name.split(' ')[0]},\n\nMe puse en contacto contigo porque vi tu perfil en LinkedIn.`, generatedAt: new Date() },
                                          ],
                                          dripSequence: [],
                                        };
                                        setSelectedLead(newLead as any);
                                        setShowDrawer(true);
                                      }}
                                      className="px-2.5 py-1 bg-slate-900 group-hover:bg-[#0A66C2] text-white rounded-lg text-[11px] font-bold transition-colors"
                                    >
                                      Seleccionar
                                    </button>
                                  </div>
                                </motion.div>
                              ))}

                              {/* Botón Ver Más */}
                              {msg.payload.hasMore && (
                                <button
                                  onClick={handleLoadMoreLinkedIn}
                                  disabled={loadingMoreLinkedIn}
                                  className="w-full mt-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  {loadingMoreLinkedIn ? (
                                    <><DotsLoader className="text-slate-400" /> Cargando más...</>
                                  ) : (
                                    <>Ver más resultados <ChevronRight size={14} /></>
                                  )}
                                </button>
                              )}
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
              <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white border border-slate-200/90 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all shadow-2xs">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
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
                <div className="p-4 bg-slate-50 space-y-3 border-t border-slate-200">
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
                    rows={3}
                    value={outreachBody}
                    onChange={(e) => setOutreachBody(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />

                  {/* Indicador de Secuencia de Seguimiento Automática por IA */}
                  {selectedLead.dripSequence && selectedLead.dripSequence.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <Zap size={12} className="text-amber-600 shrink-0" />
                        <span>Secuencia Automática de IA</span>
                      </div>
                      <p className="text-[10px] text-amber-700">
                        {selectedLead.dripSequence.length} pasos de seguimiento automático configurados en cron.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => { 
                      setSelectedContactEmail(selectedLead.email); 
                      setShowContactSelector({ show: true, channel: selectedChannel }); 
                    }}
                    disabled={sendingOutreach}
                    className="w-full bg-slate-900 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send size={14} /> {sendingOutreach ? 'Abriendo...' : `Enviar vía ${selectedChannel === 'GMAIL' ? 'Gmail' : 'LinkedIn'}`}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE TUTORIAL PASO A PASO */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Guía de Prospección B2B</h3>
                    <p className="text-[11px] text-slate-500">Aprende a conseguir clientes con ForgeMind en 4 pasos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Paso 1 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</div>
                    <div className="w-px h-full bg-slate-200 my-1"></div>
                  </div>
                  <div className="pb-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Identifica a tu Prospecto</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pídele a la IA que busque empresas de tu nicho. Por ejemplo: <i>"Busca empresas de fintech en latam"</i> o usa los botones rápidos. La IA buscará en Apollo o registrará los datos manualmente.
                    </p>
                  </div>
                </div>
                
                {/* Paso 2 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</div>
                    <div className="w-px h-full bg-slate-200 my-1"></div>
                  </div>
                  <div className="pb-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Analiza la Sinergia (Score Match)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      La IA generará automáticamente una <strong>Tarjeta de Lead</strong> analizando qué tan compatible es la empresa con tus repositorios de código y experiencia en GitHub, mostrando un porcentaje de match.
                    </p>
                  </div>
                </div>
                
                {/* Paso 3 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</div>
                    <div className="w-px h-full bg-slate-200 my-1"></div>
                  </div>
                  <div className="pb-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Redacta el Outreach (Propuesta)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Haz clic en el botón <strong>"Redactar & Enviar Outreach"</strong> de la tarjeta. La IA abrirá un borrador redactado estratégicamente mencionando el valor técnico que puedes aportar.
                    </p>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0"><Check size={12} /></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Dispara y Conecta</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Selecciona <strong>Gmail</strong> y haz clic en Enviar para abrir tu correo local listo para disparar. O selecciona <strong>LinkedIn</strong> para copiar el mensaje y abrir su perfil con 1 clic.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  ¡Entendido, vamos a prospectar!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* MODAL WIZARD DE CONEXIÓN */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xs">
                    <Rocket size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Asistente de Conexión</h3>
                    <p className="text-[11px] text-slate-500">
                      Paso {wizardStep} de 3: {wizardStep === 1 ? 'Industria' : wizardStep === 2 ? 'Rol' : 'Propuesta'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowWizard(false); setWizardStep(1); }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 h-[260px] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {wizardStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm mb-3">¿En qué industria te quieres enfocar?</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {['SaaS & Software', 'Fintech & Cripto', 'E-commerce & Retail', 'HealthTech', 'Agencias de Marketing', 'EdTech'].map((ind) => (
                          <button
                            key={ind}
                            onClick={() => { setWizardData(prev => ({ ...prev, industry: ind })); setWizardStep(2); }}
                            className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${wizardData.industry === ind ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-slate-50'}`}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {wizardStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm mb-3">¿A qué rol quieres apuntar en {wizardData.industry}?</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {['CTO / VP de Ingeniería', 'CEO / Fundador', 'CMO / Director de Marketing', 'Product Manager', 'HR / Recruiter Tech', 'CFO / Finanzas'].map((role) => (
                          <button
                            key={role}
                            onClick={() => { setWizardData(prev => ({ ...prev, role })); setWizardStep(3); }}
                            className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${wizardData.role === role ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-slate-50'}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {wizardStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm mb-3">¿Cuál es tu propuesta de valor principal?</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {['Desarrollo Fullstack y Arquitectura', 'Optimización de Rendimiento y Costos Cloud', 'Integración de Inteligencia Artificial', 'Auditoría de Seguridad y Testing Automático'].map((pitch) => (
                          <button
                            key={pitch}
                            onClick={() => setWizardData(prev => ({ ...prev, value: pitch }))}
                            className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${wizardData.value === pitch ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-slate-50'}`}
                          >
                            {pitch}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                {wizardStep > 1 ? (
                  <button onClick={() => setWizardStep(prev => prev - 1)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Atrás</button>
                ) : <div />}
                
                {wizardStep === 3 ? (
                  <button
                    onClick={handleCompleteWizard}
                    disabled={!wizardData.value}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    Generar y Buscar Prospectos <Sparkles size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => setWizardStep(prev => prev + 1)}
                    disabled={(wizardStep === 1 && !wizardData.industry) || (wizardStep === 2 && !wizardData.role)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SELECTOR DE CONTACTOS */}
      <AnimatePresence>
        {showContactSelector?.show && selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Seleccionar Destinatario</h3>
                    <p className="text-[11px] text-slate-500">¿A quién de {selectedLead.company} deseas contactar?</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactSelector(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3">
                {/* Contacto Primario */}
                <button
                  onClick={() => setSelectedContactEmail(selectedLead.email)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                    selectedContactEmail === selectedLead.email
                      ? 'border-indigo-500 bg-indigo-50 shadow-xs'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{selectedLead.name || 'Prospecto sin nombre'}</p>
                    <p className="text-xs text-slate-500">{selectedLead.email} • {selectedLead.role || 'Ejecutivo'}</p>
                  </div>
                  {selectedContactEmail === selectedLead.email && (
                    <Check size={18} className="text-indigo-600" />
                  )}
                </button>

                {/* Contacto Secundario (Simulado) */}
                <button
                  onClick={() => setSelectedContactEmail(`ventas@${selectedLead.company.toLowerCase().replace(/\s+/g, '')}.com`)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                    selectedContactEmail === `ventas@${selectedLead.company.toLowerCase().replace(/\s+/g, '')}.com`
                      ? 'border-indigo-500 bg-indigo-50 shadow-xs'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Equipo de Ventas / General</p>
                    <p className="text-xs text-slate-500">ventas@{selectedLead.company.toLowerCase().replace(/\s+/g, '')}.com</p>
                  </div>
                  {selectedContactEmail === `ventas@${selectedLead.company.toLowerCase().replace(/\s+/g, '')}.com` && (
                    <Check size={18} className="text-indigo-600" />
                  )}
                </button>
              </div>

              <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setShowContactSelector(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (showContactSelector?.channel === 'LINKEDIN' && !isLinkedInConnected) {
                      window.location.href = 'http://localhost:3001/api/v1/linkedin/auth';
                      return;
                    }
                    setShowContactSelector(null);
                    handleSendOutreach();
                  }}
                  disabled={!selectedContactEmail}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {showContactSelector?.channel === 'LINKEDIN' && !isLinkedInConnected 
                    ? 'Conectar LinkedIn' 
                    : <>Confirmar y Enviar <Send size={14} /></>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE ÉXITO DE OUTREACH */}
      <AnimatePresence>
        {outreachSuccessData?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col text-center border border-emerald-100"
            >
              <div className="p-8 pb-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">
                  ¡Enviado Exitosamente!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  El mensaje fue enviado automáticamente a <strong>{outreachSuccessData.leadName}</strong> ({outreachSuccessData.leadEmail}) a través de los servidores de ForgeMind.
                </p>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                  <span>Vía:</span>
                  <span className={`px-2 py-0.5 rounded text-white ${outreachSuccessData.channel === 'GMAIL' ? 'bg-red-500' : 'bg-blue-600'}`}>
                    {outreachSuccessData.channel === 'GMAIL' ? 'Google Workspace' : 'LinkedIn'}
                  </span>
                </div>
              </div>
              
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setOutreachSuccessData(null);
                    setShowDrawer(true);
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-amber-600 shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Users size={16} /> Ver Mis Contactos Guardados
                </button>
                <button
                  onClick={() => setOutreachSuccessData(null)}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cerrar
                </button>
              </div>
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
