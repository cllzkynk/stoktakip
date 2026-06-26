'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Shield, Lock, User, AlertTriangle, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY_AUTH = 'stok_takip_auth';
const STORAGE_KEY_ATTEMPTS = 'stok_takip_attempts';
const STORAGE_KEY_LOCKOUT = 'stok_takip_lockout';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
}

interface AuthState {
  authenticated: boolean;
  timestamp: number;
  user: AuthUser;
}

const AuthContext = createContext<AuthUser | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockdownRemaining, setLockdownRemaining] = useState('');

  // Check localStorage on mount
  useEffect(() => {
    try {
      // Check if locked out
      const lockoutData = localStorage.getItem(STORAGE_KEY_LOCKOUT);
      if (lockoutData) {
        const lockoutTime = parseInt(lockoutData, 10);
        if (Date.now() - lockoutTime < LOCKOUT_DURATION) {
          setIsLocked(true);
          setFailedAttempts(MAX_ATTEMPTS);
        } else {
          localStorage.removeItem(STORAGE_KEY_LOCKOUT);
          localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
        }
      }

      // Check if already authenticated
      const authData = localStorage.getItem(STORAGE_KEY_AUTH);
      if (authData) {
        const auth: AuthState = JSON.parse(authData);
        // Check if auth is still valid (7 days)
        if (Date.now() - auth.timestamp < 7 * 24 * 60 * 60 * 1000 && auth.user) {
          setIsAuthenticated(true);
          setAuthUser(auth.user);
        } else {
          localStorage.removeItem(STORAGE_KEY_AUTH);
        }
      }

      // Get failed attempts count
      const attemptsData = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      if (attemptsData) {
        setFailedAttempts(parseInt(attemptsData, 10));
      }
    } catch {
      // localStorage not available
    }
    setIsLoading(false);
  }, []);

  // Update lockdown timer
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => {
      const lockoutData = localStorage.getItem(STORAGE_KEY_LOCKOUT);
      if (lockoutData) {
        const lockoutTime = parseInt(lockoutData, 10);
        const remaining = LOCKOUT_DURATION - (Date.now() - lockoutTime);
        if (remaining <= 0) {
          setIsLocked(false);
          setFailedAttempts(0);
          localStorage.removeItem(STORAGE_KEY_LOCKOUT);
          localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setLockdownRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked) return;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const user: AuthUser = data.user;
        const authState: AuthState = { authenticated: true, timestamp: Date.now(), user };
        try {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authState));
          localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
        } catch {
          // localStorage not available
        }
        setIsAuthenticated(true);
        setAuthUser(user);
        setFailedAttempts(0);
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        try {
          localStorage.setItem(STORAGE_KEY_ATTEMPTS, newAttempts.toString());
        } catch {}

        if (newAttempts >= MAX_ATTEMPTS) {
          try {
            localStorage.setItem(STORAGE_KEY_LOCKOUT, Date.now().toString());
          } catch {}
          setIsLocked(true);
        } else {
          setError(data.error || `Yanlış giriş! Kalan deneme: ${MAX_ATTEMPTS - newAttempts}`);
        }
      }
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    }

    setPassword('');
  }, [username, password, failedAttempts, isLocked]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-200" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && authUser) {
    return (
      <AuthContext.Provider value={authUser}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-900/30 mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Stok Takip</h1>
          <p className="text-slate-400 text-sm">Devam etmek için giriş yapın</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
          {isLocked ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Hesap Kilitlendi</h2>
              <p className="text-slate-400 text-sm mb-4">
                {MAX_ATTEMPTS} kez hatalı giriş. Lütfen bekleyin.
              </p>
              <div className="text-3xl font-mono font-bold text-red-400">
                {lockdownRemaining}
              </div>
            </div>
          ) : (
            <>
              {/* Username */}
              <div className="relative mb-3">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Kullanıcı adı"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoFocus
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="relative mb-4">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Şifre"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !error && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Hatalı deneme</span>
                    <span>{failedAttempts}/{MAX_ATTEMPTS}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-300"
                      style={{ width: `${(failedAttempts / MAX_ATTEMPTS) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Giriş Yap
              </Button>
            </>
          )}
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Şifrenizi unuttuysanız yöneticinize başvurun
        </p>
      </div>
    </div>
  );
}
