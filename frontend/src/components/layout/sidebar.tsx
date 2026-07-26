'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  LogOut,
  LayoutDashboard,
  Folder,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  Code2,
  ShieldCheck,
  ArrowLeftRight,
  ChevronUp,
  Palette,
  Save,
  Plus,
  MessageSquare,
  MoreVertical,
  Link2,
  Unlink,
  Trash2,
  Search,
  X,
  Check
} from 'lucide-react';
import { GlobalReportModal } from './global-report-modal';
import { DeerIcon } from '../ui/deer-icon';
import { api } from '@/lib/api';

export interface ChatSessionSidebarItem {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  folderName?: string;
  updatedAt?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Intelligence', icon: LayoutDashboard },
  { href: '/saved-chats', label: 'Guardados', icon: Save },
  { href: '/workspaces', label: 'Workspaces', icon: Folder },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2, requiresDev: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout, switchAuthMode, isDevMode } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showProfileSubmenu, setShowProfileSubmenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [chatSessions, setChatSessions] = useState<ChatSessionSidebarItem[]>([]);
  const [userProjects, setUserProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [linkingSession, setLinkingSession] = useState<ChatSessionSidebarItem | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [folderInput, setFolderInput] = useState<string>('');

  // Search & Collapsible State for Intelligence Chats
  const [isChatsCollapsed, setIsChatsCollapsed] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const activeSessionId = searchParams.get('session');

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresDev && !isDevMode) return false;
    return true;
  });

  const loadSessionsAndProjects = async () => {
    try {
      const res = await api.chat.getSessions().catch(() => []);
      let remote: ChatSessionSidebarItem[] = Array.isArray(res) ? res : [];

      const local = localStorage.getItem('forgemind_auto_chat_sessions');
      let localList: ChatSessionSidebarItem[] = local ? JSON.parse(local) : [];

      const map = new Map<string, ChatSessionSidebarItem>();
      [...remote, ...localList].forEach((s) => {
        if (s.id) map.set(s.id, s);
      });

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );

      setChatSessions(combined);
    } catch {
      const local = localStorage.getItem('forgemind_auto_chat_sessions');
      setChatSessions(local ? JSON.parse(local) : []);
    }

    try {
      if (user?.id) {
        const wss = await api.workspaces.list(user.id).catch(() => []);
        let projs: Array<{ id: string; name: string }> = [];
        for (const ws of wss) {
          const ps = await api.projects.list(ws.id).catch(() => []);
          projs.push(...ps);
        }
        setUserProjects(projs);
      }
    } catch {}
  };

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
    loadSessionsAndProjects();

    const handleSync = () => loadSessionsAndProjects();
    window.addEventListener('forgemind:saved-responses-updated', handleSync);
    return () => window.removeEventListener('forgemind:saved-responses-updated', handleSync);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileSubmenu(false);
      }
    }
    if (showProfileSubmenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileSubmenu]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const handleStartNewChat = () => {
    const newId = 'session-' + Date.now();
    window.dispatchEvent(new Event('forgemind:new-chat'));
    router.push(`/dashboard?session=${newId}`);
  };

  const handleSaveProjectLink = async () => {
    if (!linkingSession) return;

    const proj = userProjects.find((p) => p.id === selectedProjectId);
    const updates = {
      projectId: selectedProjectId || null,
      projectName: proj?.name || null,
      folderName: folderInput.trim() || null,
    };

    try {
      await api.chat.updateSession(linkingSession.id, updates).catch(() => {});
    } catch {}

    const local = localStorage.getItem('forgemind_auto_chat_sessions');
    let localList: ChatSessionSidebarItem[] = local ? JSON.parse(local) : [];
    const updated = localList.map((s) => (s.id === linkingSession.id ? { ...s, ...updates } : s));
    localStorage.setItem('forgemind_auto_chat_sessions', JSON.stringify(updated));

    setLinkingSession(null);
    loadSessionsAndProjects();
  };

  const handleUnlinkProject = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuSessionId(null);
    const updates = { projectId: null, projectName: null, folderName: null };

    try {
      await api.chat.updateSession(sessionId, updates).catch(() => {});
    } catch {}

    const local = localStorage.getItem('forgemind_auto_chat_sessions');
    let localList: ChatSessionSidebarItem[] = local ? JSON.parse(local) : [];
    const updated = localList.map((s) => (s.id === sessionId ? { ...s, ...updates } : s));
    localStorage.setItem('forgemind_auto_chat_sessions', JSON.stringify(updated));

    loadSessionsAndProjects();
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuSessionId(null);

    try {
      await api.chat.deleteSession(sessionId).catch(() => {});
    } catch {}

    const local = localStorage.getItem('forgemind_auto_chat_sessions');
    let localList: ChatSessionSidebarItem[] = local ? JSON.parse(local) : [];
    const updated = localList.filter((s) => s.id !== sessionId);
    localStorage.setItem('forgemind_auto_chat_sessions', JSON.stringify(updated));

    if (activeSessionId === sessionId) {
      router.push('/dashboard?session=new');
    }

    loadSessionsAndProjects();
  };

  const filteredChatSessions = chatSessions.filter((s) => {
    if (!chatSearchQuery.trim()) return true;
    const q = chatSearchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.projectName?.toLowerCase().includes(q) ||
      s.folderName?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 68 : 224 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-sidebar text-sidebar-foreground flex flex-col relative z-20 shrink-0 select-none"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
          {!collapsed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <DeerIcon size={22} className="text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wider leading-none">ForgeMind</span>
                <span
                  className={`text-[9px] font-bold tracking-wide mt-1 px-1.5 py-0.5 rounded-md w-fit flex items-center gap-1 border ${
                    isDevMode
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {isDevMode ? <><Code2 size={10} /> Modo Dev</> : <><ShieldCheck size={10} /> Modo Gestión</>}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-1 mx-auto" title={isDevMode ? 'Modo Dev' : 'Modo Gestión'}>
              <DeerIcon size={22} className="text-white shrink-0" />
              <span className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-amber-400' : 'bg-blue-400'}`} />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-sidebar-accent/60 transition-colors mx-auto"
            title={collapsed ? 'Expandir menú' : 'Comprimir menú'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isIntelligence = item.href === '/dashboard';
            const active = isIntelligence
              ? pathname === '/dashboard' || pathname.startsWith('/dashboard')
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <div key={item.href} className="space-y-1">
                <div
                  onClick={() => {
                    if (isIntelligence) {
                      handleStartNewChat();
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                    active
                      ? 'bg-sidebar-accent text-white font-semibold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-sidebar-accent/50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={18} className={active ? 'text-white' : 'text-white/70'} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {/* Actions for Intelligence: Compress Chevron & Plus New Chat */}
                  {isIntelligence && !collapsed && (
                    <div className="flex items-center gap-1 shrink-0">
                      {chatSessions.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsChatsCollapsed(!isChatsCollapsed);
                          }}
                          className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title={isChatsCollapsed ? 'Desplegar chats' : 'Comprimir chats'}
                        >
                          <ChevronDown size={14} className={`transition-transform ${isChatsCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartNewChat();
                        }}
                        className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Nuevo Chat"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* DYNAMIC SIDEBAR CHAT SESSIONS WITH SEARCH BAR & COLLAPSIBLE VIEW */}
                {isIntelligence && !collapsed && !isChatsCollapsed && chatSessions.length > 0 && (
                  <div className="pl-3 pr-1 py-1 space-y-1.5 border-l border-white/10 ml-3 my-1">
                    {/* Search Bar for Sidebar Chats: Only when 2 or more chats exist */}
                    {chatSessions.length >= 2 && (
                      <div className="relative mb-1.5">
                        <Search size={11} className="absolute left-2.5 top-2 text-white/40" />
                        <input
                          type="text"
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          placeholder="Buscar chat..."
                          className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 rounded-xl pl-7 pr-2 py-1 text-[11px] text-white placeholder:text-white/40 outline-none transition-all"
                        />
                      </div>
                    )}

                    {filteredChatSessions.length === 0 ? (
                      <p className="text-[10px] text-white/40 px-2 py-1 italic">Sin chats coincidentes</p>
                    ) : (
                      filteredChatSessions.slice(0, 15).map((session) => {
                        const isCurrentActive = activeSessionId === session.id;
                        const hasProject = session.projectName || session.projectId;
                        const hasFolder = session.folderName;

                        const truncatedTitle =
                          session.title.length > 18 ? session.title.slice(0, 18) + '...' : session.title;

                        return (
                          <div
                            key={session.id}
                            onClick={() => router.push(`/dashboard?session=${session.id}`)}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer relative ${
                              isCurrentActive
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <MessageSquare size={12} className="shrink-0 text-white/50 group-hover:text-white" />
                              <span className="truncate text-[11px]" title={session.title}>
                                {truncatedTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {hasProject && (
                                <span
                                  className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded-md truncate max-w-[55px]"
                                  title={`Proyecto: ${session.projectName || 'Vinculado'}`}
                                >
                                  {session.projectName || 'Proyecto'}
                                </span>
                              )}

                              {hasFolder && (
                                <span
                                  className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded-md truncate max-w-[45px]"
                                  title={`Carpeta: ${session.folderName}`}
                                >
                                  {session.folderName}
                                </span>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuSessionId(openMenuSessionId === session.id ? null : session.id);
                                }}
                                className="p-1 text-white/40 hover:text-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="Opciones de chat"
                              >
                                <MoreVertical size={12} />
                              </button>
                            </div>

                            {/* Options Menu Popover */}
                            {openMenuSessionId === session.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 bg-slate-900 text-white rounded-xl p-1.5 shadow-2xl border border-slate-800 space-y-0.5 z-50 text-[11px]"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuSessionId(null);
                                    setLinkingSession(session);
                                    setSelectedProjectId(session.projectId || '');
                                    setFolderInput(session.folderName || '');
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                                >
                                  <Link2 size={12} className="text-amber-400" />
                                  <span>Vincular a Proyecto</span>
                                </button>

                                {hasProject && (
                                  <button
                                    onClick={(e) => handleUnlinkProject(session.id, e)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left text-slate-300"
                                  >
                                    <Unlink size={12} className="text-slate-400" />
                                    <span>Desvincular</span>
                                  </button>
                                )}

                                <div className="pt-0.5 border-t border-slate-800">
                                  <button
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors text-left font-semibold"
                                  >
                                    <Trash2 size={12} />
                                    <span>Borrar Chat</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Mail Reports Action */}
          <div className="pt-3 mt-2 border-t border-white/10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowReportModal(true)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 shadow-2xs backdrop-blur-xs transition-all ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title={collapsed ? 'Enviar Correo' : undefined}
            >
              <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Mail size={13} className="text-white" />
              </div>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                  Correo
                </motion.span>
              )}
            </motion.button>
          </div>
        </nav>

        {/* Footer Profile */}
        <div className="px-2.5 py-3 border-t border-sidebar-border relative" ref={profileRef}>
          <AnimatePresence>
            {showProfileSubmenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-full left-2.5 right-2.5 mb-2 bg-slate-900 text-white rounded-2xl p-2 shadow-2xl border border-slate-800 space-y-1 z-50 text-xs"
              >
                <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                  <p className="font-semibold text-white truncate">{user?.displayName || 'Mi Perfil'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setShowProfileSubmenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-slate-800 transition-all font-medium"
                >
                  <Palette size={15} className="text-amber-400" />
                  <span>Perfil y Diseño</span>
                </Link>

                <button
                  onClick={() => {
                    setShowProfileSubmenu(false);
                    switchAuthMode(isDevMode ? 'google' : 'github');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-slate-800 transition-all font-medium text-left"
                >
                  <ArrowLeftRight size={15} className="text-blue-400" />
                  <span>Modo {isDevMode ? 'Gestión (Google)' : 'Dev (GitHub)'}</span>
                </button>

                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowProfileSubmenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-medium text-left"
                  >
                    <LogOut size={15} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowProfileSubmenu(!showProfileSubmenu)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 transition-all text-left group border border-transparent hover:border-white/10 ${
              showProfileSubmenu ? 'bg-white/10 border-white/15' : ''
            } ${collapsed ? 'justify-center' : ''}`}
            title="Opciones de perfil y diseño"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full shrink-0 border border-white/20" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/40 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-white/20">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                    {user?.displayName || 'Usuario'}
                  </p>
                  <p className="text-[10px] text-white/60 truncate">{isDevMode ? 'Modo Dev' : 'Modo Gestión'}</p>
                </div>
                <ChevronUp
                  size={14}
                  className={`text-white/50 group-hover:text-white transition-transform ${
                    showProfileSubmenu ? 'rotate-180' : ''
                  }`}
                />
              </>
            )}
          </button>
        </div>
      </motion.aside>

      {/* PROJECT / FOLDER LINKING MODAL */}
      <AnimatePresence>
        {linkingSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Link2 size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Vincular Chat a Proyecto / Carpeta</h3>
                </div>
                <button
                  onClick={() => setLinkingSession(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Selecciona un proyecto y opcionalmente asigna una carpeta para organizar este chat.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Proyecto Relacionado:</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">(Sin proyecto vinculado)</option>
                    {userProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Nombre de Carpeta (Opcional):</label>
                  <input
                    type="text"
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                    placeholder="Ej: Especificaciones, Requerimientos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setLinkingSession(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProjectLink}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check size={14} />
                  <span>Guardar Vinculación</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GlobalReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </>
  );
}
