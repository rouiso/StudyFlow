'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, Shield, UserCheck, GraduationCap } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    name: 'Léa Martin',
    email: 'lea.martin@univ-etudiant.fr',
    role: 'OWNER',
    roleLabel: 'Propriétaire (Owner)',
    color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300',
    icon: Shield,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    name: 'Karim Belkacem',
    email: 'karim.belkacem@univ-etudiant.fr',
    role: 'ADMIN',
    roleLabel: 'Administrateur (Admin)',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    icon: UserCheck,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  {
    name: 'Sami Youssef',
    email: 'sami.youssef@univ-etudiant.fr',
    role: 'MEMBER',
    roleLabel: 'Membre Contributeur',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    icon: UserCheck,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
  {
    name: 'Mme Dupont',
    email: 'helene.dupont@univ-prof.fr',
    role: 'COACH',
    roleLabel: 'Coach Pédagogique (v1.1)',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300',
    icon: GraduationCap,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const submitLogin = async (targetEmail: string, targetPass: string) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim(), password: targetPass }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || 'Identifiants incorrects.');
        setIsLoading(false);
        return;
      }

      // Enregistrer l'utilisateur connecté dans le store local v1.1
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          await caches.delete('studyflow-v1.1').catch(() => {});
        }
        const raw = localStorage.getItem('studyflow_data_v1.1');
        if (raw) {
          const store = JSON.parse(raw);
          store.currentUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: data.user.role || 'MEMBER',
            joinedAt: new Date().toISOString(),
          };
          if (!store.users.some((u: any) => u.id === data.user.id)) {
            store.users.push(store.currentUser);
          }
          localStorage.setItem('studyflow_data_v1.1', JSON.stringify(store));
        }
        localStorage.setItem('studyflow_current_user', JSON.stringify(data.user));
      } catch (e) {
        console.error('Erreur mise à jour utilisateur local:', e);
      }

      if (data.needsOnboarding) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMessage('Impossible de contacter le serveur d’authentification.');
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }
    submitLogin(email, password);
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    submitLogin(demoEmail, 'password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 text-white font-extrabold text-xl">
            SF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Connexion à StudyFlow</h1>
          <p className="text-xs text-slate-400">
            Espace de travail collaboratif pour équipes universitaires (v1.1)
          </p>
        </div>

        {/* Quick Demo Login Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Connexion rapide (Comptes Démo)
            </span>
            <span className="text-[10px] text-slate-500">1-clic</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl border bg-gradient-to-br ${acc.color} hover:brightness-125 transition-all text-left flex items-start gap-2.5 group`}
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate group-hover:text-indigo-200">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{acc.roleLabel}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
          <div className="text-xs font-semibold text-slate-300 pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>Ou connectez-vous avec vos identifiants</span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lea.martin@univ-etudiant.fr"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Mot de passe
                </label>
                <a href="#" className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Se souvenir de moi</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Connexion en cours...' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-400">
          Nouveau sur StudyFlow ?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
