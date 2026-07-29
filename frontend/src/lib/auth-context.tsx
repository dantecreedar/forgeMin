'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DeerIcon } from '@/components/ui/deer-icon';
import { Code2, ShieldCheck, CheckCircle2, RefreshCw, Key, HardDrive, Mail, Users, Sparkles } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export type AppMode = 'management' | 'dev' | 'founder';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
  switchAuthMode: (target: 'google' | 'github' | AppMode) => Promise<void>;
  setAppMode: (mode: AppMode) => void;
  logout: () => Promise<void>;
  token: string | null;
  authProvider: 'google' | 'github' | null;
  appMode: AppMode;
  isDevMode: boolean;
  isFounderMode: boolean;
  isLeadsMode: boolean;
  isManagementMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithGithub: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  switchAuthMode: async () => {},
  setAppMode: () => {},
  logout: async () => {},
  token: null,
  authProvider: null,
  appMode: 'founder',
  isDevMode: false,
  isFounderMode: true,
  isLeadsMode: true,
  isManagementMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<'google' | 'github' | null>(null);
  const [appMode, setAppModeState] = useState<AppMode>('founder');
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [targetMode, setTargetMode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('auth_provider') as 'google' | 'github' | null;
      if (savedProvider) setAuthProvider(savedProvider);

      const savedMode = localStorage.getItem('forgemind_app_mode') as AppMode | null;
      if (savedMode) setAppModeState(savedMode);
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const t = await fbUser.getIdToken();
        localStorage.setItem('auth_token', t);
        setToken(t);

        const providerId = fbUser.providerData?.[0]?.providerId;
        if (providerId === 'github.com') {
          setAuthProvider('github');
          localStorage.setItem('auth_provider', 'github');
        } else if (providerId === 'google.com') {
          setAuthProvider('google');
          localStorage.setItem('auth_provider', 'google');
        }

        if (fbUser.email) {
          localStorage.setItem('gmail_email', fbUser.email);
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
        // Do NOT wipe tokens on temporary offline states unless explicit logout
        const storedToken = localStorage.getItem('auth_token');
        if (!storedToken) {
          setToken(null);
          setUser(null);
          setAuthProvider(null);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const runOnboardingSequence = async (providerName: 'google' | 'github') => {
    setIsSwitching(true);
    setTargetMode(providerName);
    setOnboardingStep(1); // Autenticando

    await new Promise((r) => setTimeout(r, 600));
    setOnboardingStep(2); // Sincronizando permisos

    await new Promise((r) => setTimeout(r, 800));
    setOnboardingStep(3); // Inicializando motor IA

    await new Promise((r) => setTimeout(r, 600));
    setIsSwitching(false);
    setOnboardingStep(0);
  };

  const loginWithGoogle = async () => {
    try {
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
        localStorage.setItem('gmail_access_token', credential.accessToken);
      }
      if (result.user.email) {
        localStorage.setItem('gmail_email', result.user.email);
      }

      await runOnboardingSequence('google');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Google Login error:', err);
      }
    }
  };

  const loginWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      localStorage.setItem('auth_provider', 'github');
      setAuthProvider('github');
      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('github_token', credential.accessToken);
      }
      await runOnboardingSequence('github');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('GitHub Login error:', err);
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    localStorage.setItem('auth_provider', 'email');
    setAuthProvider('email' as any);
    if (result.user.email) {
      localStorage.setItem('gmail_email', result.user.email);
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    localStorage.setItem('auth_provider', 'email');
    setAuthProvider('email' as any);
    if (result.user.email) {
      localStorage.setItem('gmail_email', result.user.email);
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('github_token');
    localStorage.removeItem('google_token');
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_email');
    localStorage.removeItem('auth_provider');
    setUser(null);
    setToken(null);
    setAuthProvider(null);
  };

  const switchAuthMode = async (targetProvider: 'google' | 'github' | AppMode) => {
    if (isSwitching || authProvider === targetProvider) return;

    if (targetProvider === 'google' && !localStorage.getItem('google_token')) {
      await loginWithGoogle();
      return;
    }
    if (targetProvider === 'github' && !localStorage.getItem('github_token')) {
      await loginWithGithub();
      return;
    }

    if (targetProvider === 'google' || targetProvider === 'github') {
      localStorage.setItem('auth_provider', targetProvider);
      setAuthProvider(targetProvider);
      await runOnboardingSequence(targetProvider);
    }
  };

  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forgemind_app_mode', mode);
      if (mode === 'founder') {
        const isLinkedinConnected = localStorage.getItem('linkedin_connected') === 'true';
        if (!isLinkedinConnected) {
          if (window.location.pathname !== '/onboarding') {
            window.location.href = '/onboarding?step=4&role=founder';
          }
        } else {
          if (!window.location.pathname.startsWith('/dashboard/leads')) {
            window.location.href = '/dashboard/leads';
          }
        }
      }
    }
  };

  const isFounderMode = appMode === 'founder';
  const isDevMode = appMode === 'dev' || appMode === 'founder';
  const isManagementMode = appMode === 'management' || appMode === 'founder';
  const isLeadsMode = isFounderMode;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginWithGoogle,
      loginWithGithub,
      loginWithEmail,
      registerWithEmail,
      switchAuthMode,
      setAppMode,
      logout,
      token,
      authProvider,
      appMode,
      isDevMode,
      isFounderMode,
      isLeadsMode,
      isManagementMode
    }}>
      {children}

      {/* Step-by-Step Onboarding Screen Transition */}
      <AnimatePresence>
        {isSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="relative mb-8">
              <div className={`absolute -inset-6 rounded-full blur-3xl animate-pulse ${
                targetMode === 'github' ? 'bg-amber-500/25' : 'bg-blue-500/25'
              }`} />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center ${
                  targetMode === 'github' ? 'border-amber-400/60' : 'border-blue-400/60'
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <DeerIcon size={38} className="text-white" />
              </div>
            </div>

            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mb-6"
            >
              {targetMode === 'github' ? (
                <>
                  <Code2 className="text-amber-400" size={24} />
                  <span>Configurando Modo Desarrollador</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="text-blue-400" size={24} />
                  <span>Configurando Modo Gestión e Inteligencia</span>
                </>
              )}
            </motion.h3>

            {/* Step-by-Step Progress List */}
            <div className="w-full max-w-sm space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left shadow-2xl">
              <div className="flex items-center gap-3 text-xs">
                {onboardingStep >= 1 ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw size={16} className="animate-spin text-slate-500 shrink-0" />
                )}
                <span className={onboardingStep >= 1 ? 'text-white font-semibold' : 'text-slate-500'}>
                  1. Autenticación con {targetMode === 'github' ? 'GitHub' : 'Google'} completada
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {onboardingStep >= 2 ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : onboardingStep === 1 ? (
                  <RefreshCw size={16} className="animate-spin text-blue-400 shrink-0" />
                ) : (
                  <Key size={16} className="text-slate-600 shrink-0" />
                )}
                <span className={onboardingStep >= 2 ? 'text-white font-semibold' : onboardingStep === 1 ? 'text-blue-300 font-medium' : 'text-slate-500'}>
                  2. Sincronizando permisos de Drive, Gmail y Contactos
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {onboardingStep >= 3 ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : onboardingStep === 2 ? (
                  <RefreshCw size={16} className="animate-spin text-purple-400 shrink-0" />
                ) : (
                  <Sparkles size={16} className="text-slate-600 shrink-0" />
                )}
                <span className={onboardingStep >= 3 ? 'text-white font-semibold' : onboardingStep === 2 ? 'text-purple-300 font-medium' : 'text-slate-500'}>
                  3. Inicializando motor IA y guardando sesión persistente
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
