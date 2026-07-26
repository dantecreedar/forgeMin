'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { LogOut, LayoutDashboard, Folder, FolderGit2, ChevronLeft, ChevronRight, Mail, Code2, ShieldCheck, ArrowLeftRight, Settings, ChevronUp, Palette } from 'lucide-react';
import { GlobalReportModal } from './global-report-modal';
import { DeerIcon } from '../ui/deer-icon';

const navItems = [
  { href: '/dashboard', label: 'Intelligence', icon: LayoutDashboard },
  { href: '/workspaces', label: 'Workspaces', icon: Folder },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2, requiresDev: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, switchAuthMode, isDevMode } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showProfileSubmenu, setShowProfileSubmenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresDev && !isDevMode) return false;
    return true;
  });

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

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

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 68 : 224 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-sidebar text-sidebar-foreground flex flex-col relative z-20 shrink-0 select-none"
      >
        {/* Sidebar Header with Toggle Button & Mode Indicator */}
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <DeerIcon size={22} className="text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wider leading-none">
                  ForgeMind
                </span>
                <span className={`text-[9px] font-bold tracking-wide mt-1 px-1.5 py-0.5 rounded-md w-fit flex items-center gap-1 border ${
                  isDevMode 
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}>
                  {isDevMode ? <><Code2 size={10} /> Modo Dev</> : <><ShieldCheck size={10} /> Modo Gestión</>}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-1 mx-auto" title={isDevMode ? 'Modo Dev (GitHub)' : 'Modo Gestión (Google)'}>
              <DeerIcon size={22} className="text-white shrink-0" />
              <span className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-amber-400' : 'bg-blue-400'}`} />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-sidebar-accent/60 transition-colors mx-auto"
            title={collapsed ? 'Expandir menú lateral' : 'Comprimir menú lateral'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-sidebar-accent text-white font-semibold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-sidebar-accent/50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className={active ? 'text-white' : 'text-white/70'} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            );
          })}

          {/* Global Action: Send Custom Reports */}
          <div className="pt-3 mt-2 border-t border-white/10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowReportModal(true)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 shadow-2xs backdrop-blur-xs transition-all ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title={collapsed ? 'Enviar Reportes por Gmail' : undefined}
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

        {/* Footer Profile with Interactive Submenu */}
        <div className="px-2.5 py-3 border-t border-sidebar-border relative" ref={profileRef}>
          {/* Profile Submenu Popover */}
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

          {/* Profile Card Button */}
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
                <ChevronUp size={14} className={`text-white/50 group-hover:text-white transition-transform ${showProfileSubmenu ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Global Report Modal */}
      <GlobalReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </>
  );
}
