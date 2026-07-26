'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DeerIcon } from '@/components/ui/deer-icon';
import { Code2, ShieldCheck } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  switchAuthMode: (target: 'google' | 'github') => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
  authProvider: 'google' | 'github' | null;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithGithub: async () => {},
  switchAuthMode: async () => {},
  logout: async () => {},
  token: null,
  authProvider: null,
  isDevMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<'google' | 'github' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [targetMode, setTargetMode] = useState<'google' | 'github' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('auth_provider') as 'google' | 'github' | null;
      if (savedProvider) setAuthProvider(savedProvider);
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const t = await fbUser.getIdToken();
        localStorage.setItem('auth_token', t);
        setToken(t);

        // Detect provider from Firebase providerData if not set
        const providerId = fbUser.providerData?.[0]?.providerId;
        if (providerId === 'github.com') {
          setAuthProvider('github');
          localStorage.setItem('auth_provider', 'github');
        } else if (providerId === 'google.com') {
          setAuthProvider('google');
          localStorage.setItem('auth_provider', 'google');
        }

        try {
          const res = await api.auth.login(t);
          setUser(res.user || null);
        } catch {
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || '',
            photoUrl: fbUser.photoURL || undefined,
          });
        }
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('github_token');
        localStorage.removeItem('auth_provider');
        setToken(null);
        setUser(null);
        setAuthProvider(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    localStorage.setItem('auth_provider', 'google');
    setAuthProvider('google');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem('google_token', credential.accessToken);
    }
  };

  const loginWithGithub = async () => {
    const provider = new GithubAuthProvider();
    provider.addScope('repo');
    localStorage.setItem('auth_provider', 'github');
    setAuthProvider('github');
    const result = await signInWithPopup(auth, provider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem('github_token', credential.accessToken);
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('github_token');
    localStorage.removeItem('google_token');
    localStorage.removeItem('auth_provider');
    setUser(null);
    setToken(null);
    setAuthProvider(null);
  };

  const switchAuthMode = async (targetProvider: 'google' | 'github') => {
    if (isSwitching || authProvider === targetProvider) return;
    setIsSwitching(true);
    setTargetMode(targetProvider);

    // Delay para simular la transición fluida de modo sin salir a la pantalla de login
    await new Promise((resolve) => setTimeout(resolve, 1800));

    localStorage.setItem('auth_provider', targetProvider);
    setAuthProvider(targetProvider);

    setIsSwitching(false);
    setTargetMode(null);
  };

  const isDevMode = authProvider === 'github';

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithGithub, switchAuthMode, logout, token, authProvider, isDevMode }}>
      {children}

      {/* Screen Loader Transition for Mode Switch */}
      <AnimatePresence>
        {isSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="relative mb-6">
              <div className={`absolute -inset-4 rounded-full blur-2xl animate-pulse ${
                targetMode === 'github' ? 'bg-amber-500/30' : 'bg-blue-500/30'
              }`} />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center ${
                  targetMode === 'github' ? 'border-amber-400/60' : 'border-blue-400/60'
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <DeerIcon size={32} className="text-white" />
              </div>
            </div>

            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xl font-bold text-white tracking-tight flex items-center gap-2"
            >
              {targetMode === 'github' ? (
                <>
                  <Code2 className="text-amber-400" size={22} />
                  <span>Cambiando a Modo Desarrollador</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="text-blue-400" size={22} />
                  <span>Cambiando a Modo Gestión</span>
                </>
              )}
            </motion.h3>

            <p className="text-xs text-slate-400 mt-2 max-w-xs font-medium">
              {targetMode === 'github'
                ? 'Habilitando entorno de repositorios, sincronización de commits e IA Dev...'
                : 'Habilitando permisos administrativos y módulos de gestión...'}
            </p>

            {/* Animated Progress Bar */}
            <div className="w-56 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden border border-slate-700/50">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 1.7, ease: 'easeInOut' }}
                className={`h-full ${
                  targetMode === 'github' ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-gradient-to-r from-blue-500 to-indigo-400'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
