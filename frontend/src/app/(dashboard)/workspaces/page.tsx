'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, X, Users, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function WorkspacesPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.workspaces.list(user.id).then((res) => {
      setWorkspaces(res.workspaces || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const create = async () => {
    if (!name.trim() || !user) return;
    try {
      const res = await api.workspaces.create(name.trim(), user.id, description.trim() || undefined);
      setWorkspaces((prev) => [res.workspace, ...prev]);
      setName('');
      setDescription('');
      setShowCreate(false);
    } catch {}
  };

  const filtered = search
    ? workspaces.filter((ws: any) => ws.name?.toLowerCase().includes(search.toLowerCase()))
    : workspaces;

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workspaces</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Organize your projects and teams</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            New Workspace
          </motion.button>
        </div>

        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full bg-white border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Create Workspace</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && create()}
                  placeholder="Workspace name"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-3"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 mb-4"
                />
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={create}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                  >
                    Create
                  </motion.button>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground px-5 py-2 rounded-xl text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-border rounded-2xl p-5 animate-pulse space-y-3">
                <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Folder className="text-primary" size={28} />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No workspaces yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Create your first workspace to get started</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              Create Workspace
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Folder className="text-primary" size={18} />
                  </div>
                </div>
                <h3 className="text-sm font-medium mb-1">{ws.name}</h3>
                {ws.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ws.description}</p>
                )}
                <div className="flex gap-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Folder size={12} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">0 projects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{ws.memberIds?.length || 1} members</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
