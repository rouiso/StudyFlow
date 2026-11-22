'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Users,
  PlusCircle,
  KeyRound,
  Compass,
  Sparkles,
} from 'lucide-react';
import { loadStudyFlowData, saveStudyFlowData } from '@/lib/storage';
import { createTeamWithOwner, joinTeamWithToken } from '@/lib/user-management';
import { generateSecurePassword } from '@/lib/password-generator';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Choix d'équipe post-inscription ou immédiat
  const [teamChoice, setTeamChoice] = useState<'onboarding' | 'join' | 'create'>('onboarding');
  const [inviteToken, setInviteToken] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite') || params.get('token');
    if (invite) {
      setInviteToken(invite.toUpperCase());
      setTeamChoice('join');
    }
  }, []);

  // Règles de sécurité du mot de passe
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasMinLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthPercent = (strengthScore / 4) * 100;

  const handleGeneratePassword = () => {
    try {
      setPassword(generateSecurePassword());
      setShowPassword(true);
      setErrorMessage('');
    } catch (error) {
      console.error('Échec de la génération sécurisée du mot de passe:', error);
      setErrorMessage('La génération sécurisée est indisponible. Saisissez votre propre mot de passe.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Tous les champs sont obligatoires.');
      return;
    }

    if (!hasMinLength) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (teamChoice === 'join' && !inviteToken.trim()) {
      setErrorMessage('Veuillez saisir le code d’invitation de l’équipe à rejoindre.');
      return;
    }

    if (teamChoice === 'create' && !teamName.trim()) {
      setErrorMessage('Veuillez saisir le nom de la nouvelle équipe à créer.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          teamAction: teamChoice === 'onboarding' ? undefined : teamChoice,
          inviteToken: teamChoice === 'join' ? inviteToken.trim().toUpperCase() : undefined,
          teamName: teamChoice === 'create' ? teamName.trim() : undefined,
          teamDescription: teamChoice === 'create' ? teamDescription.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || 'Erreur lors de l’inscription.');
        setIsLoading(false);
        return;
      }

      // Synchroniser le nouvel utilisateur (et son équipe éventuelle) dans le store local
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          await caches.delete('studyflow-v1.1').catch(() => {});
        }
        const store = loadStudyFlowData();
        const newUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          avatar: '',
          role: (data.user.role || (teamChoice === 'create' ? 'OWNER' : 'MEMBER')) as any,
          joinedAt: new Date().toISOString(),
        };
        store.currentUser = newUser;
        if (!store.users.some((u) => u.id === newUser.id)) {
          store.users.push(newUser);
        }

        if (teamChoice === 'create' && teamName.trim()) {
          const created = createTeamWithOwner({
            name: teamName.trim(),
            description: teamDescription.trim(),
            owner: newUser,
            existingTeams: store.teams,
          });
          const finalTeam = data.team
            ? {
                id: data.team.id,
                name: data.team.name,
                description: data.team.description || created.team.description,
                slug: data.team.slug,
                ownerId: newUser.id,
                inviteToken: data.team.inviteToken,
                createdAt: data.team.createdAt || created.team.createdAt,
              }
            : created.team;

          store.teams = [finalTeam, ...store.teams];
          store.members.push({
            ...created.membership,
            teamId: finalTeam.id,
          });
          store.projects = [
            { ...created.defaultProject, teamId: finalTeam.id },
            ...store.projects,
          ];
          store.columns = [...store.columns, ...created.defaultColumns];
          localStorage.setItem('studyflow_active_team_id', finalTeam.id);
        } else if (teamChoice === 'join' && inviteToken.trim()) {
          const joined = joinTeamWithToken({
            token: inviteToken.trim(),
            user: newUser,
            teams: store.teams,
            members: store.members,
          });
          if (joined.ok && joined.team && joined.membership) {
            if (!store.members.some((m) => m.teamId === joined.team!.id && m.userId === newUser.id)) {
              store.members.push(joined.membership);
            }
            localStorage.setItem('studyflow_active_team_id', joined.team.id);
          } else if (data.team) {
            localStorage.setItem('studyflow_active_team_id', data.team.id);
          }
        }

        saveStudyFlowData(store);
        localStorage.setItem('studyflow_current_user', JSON.stringify(data.user));
      } catch (e) {
        console.error('Erreur mise à jour utilisateur local:', e);
      }

      if (data.needsOnboarding || teamChoice === 'onboarding') {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMessage('Impossible de contacter le serveur d’authentification.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 text-white font-extrabold text-xl">
            SF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Créer un compte StudyFlow</h1>
          <p className="text-xs text-slate-400">
            Inscrivez-vous puis rejoignez une équipe existante ou créez la vôtre
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-2xl space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nom complet</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Adresse e-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@univ-domaine.fr"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="register-password" className="block text-xs font-semibold text-slate-300">
                  Mot de passe (8 caractères minimum)
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[10px] sm:text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer un mot de passe sûr
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  maxLength={128}
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
              <p className="mt-1 text-[10px] text-slate-500">
                Créé dans votre navigateur; aucun mot de passe n’est envoyé à une IA.
              </p>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Robustesse du mot de passe</span>
                    <span
                      className={`font-semibold ${
                        strengthScore >= 3 ? 'text-emerald-400' : strengthScore >= 2 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {strengthScore >= 3 ? 'Robuste' : strengthScore >= 2 ? 'Moyen' : 'Trop faible'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strengthScore >= 3 ? 'bg-emerald-400' : strengthScore >= 2 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Option d'équipe dès l'inscription ou à l'étape suivante */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Configuration de votre équipe
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTeamChoice('onboarding')}
                  className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
                    teamChoice === 'onboarding'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Après inscription</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamChoice('join')}
                  className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
                    teamChoice === 'join'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Rejoindre (Code)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamChoice('create')}
                  className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
                    teamChoice === 'create'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Créer (Owner)</span>
                </button>
              </div>

              {teamChoice === 'join' && (
                <div className="animate-fade-in space-y-1.5">
                  <label className="block text-[11px] text-slate-400">
                    Code d&apos;invitation (ex: <code className="text-indigo-300">STUDY-S5-2026</code>)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value.toUpperCase())}
                      placeholder="STUDY-S5-2026"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {teamChoice === 'create' && (
                <div className="animate-fade-in space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nom de votre nouvelle équipe (Vous serez OWNER)
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Ex: Groupe Projet S5 — IA"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Description courte (optionnel)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !hasMinLength}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>
                {isLoading
                  ? 'Création en cours...'
                  : teamChoice === 'onboarding'
                  ? 'Créer mon compte & Choisir mon équipe'
                  : teamChoice === 'join'
                  ? 'Créer mon compte & Rejoindre l’équipe'
                  : 'Créer mon compte & Fonder l’équipe'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-400">
          Vous possédez déjà un compte ?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
