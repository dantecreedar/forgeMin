'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { api } from '@/lib/api';

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
    localStorage.setItem('auth_provider', 'google');
    setAuthProvider('google');
    await signInWithPopup(auth, provider);
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
    localStorage.removeItem('auth_provider');
    setUser(null);
    setToken(null);
    setAuthProvider(null);
  };

  const isDevMode = authProvider === 'github';

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithGithub, logout, token, authProvider, isDevMode }}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => useContext(AuthContext);
