'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { LogOut, LayoutDashboard, Folder, Target, FolderGit2, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Intelligence', icon: LayoutDashboard },
  { href: '/workspaces', label: 'Workspaces', icon: Folder },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
];



export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 224 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-sidebar text-sidebar-foreground flex flex-col relative z-20 shrink-0 select-none"
    >
      {/* Sidebar Header with Toggle Button */}
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold text-white tracking-wider"
          >
            ForgeMind
          </motion.span>
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
        {navItems.map((item, i) => {
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
      </nav>

      {/* Footer Profile & Logout */}
      <div className="px-2.5 py-3 border-t border-sidebar-border space-y-1">
        {user && (
          <div className={`flex items-center gap-2.5 p-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/40 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.displayName || 'Usuario'}</p>
                <p className="text-[10px] text-white/50 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-sidebar-accent/50 rounded-xl transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </motion.aside>
  );
}
