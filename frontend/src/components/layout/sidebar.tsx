'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/workspaces', label: 'Workspaces' },
  { href: '/objectives', label: 'Objectives' },
  { href: '/repositories', label: 'Repositories' },
];


export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-56 bg-sidebar text-sidebar-foreground flex flex-col"
    >
      <div className="px-5 py-4 border-b border-sidebar-border">
        <span className="text-sm font-bold text-white">ForgeMind</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item, i) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ x: 4 }}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-sidebar-accent/50'
                }`}
              >
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-white/50 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-sidebar-accent/50 rounded-lg transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </motion.aside>
  );
}
