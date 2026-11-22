'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  PlusCircle,
  KeyRound,
  ArrowRight,
  Shield,
  CheckCircle2,
  Sparkles,
  FolderKanban,
  AlertCircle,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { loadStudyFlowData, saveStudyFlowData } from '@/lib/storage';
import { createTeamWithOwner, joinTeamWithToken } from '@/lib/user-management';
import { Team, User } from '@/types';

interface AvailableTeam {
  id: string;
  name: string;
  description: string;
  slug: string;
  ownerId: string;
  ownerName?: string;
  inviteToken: string;
  memberCount?: number;
  isMember?: boolean;
  myRole?: string | null;
}

export default function OnboardingPage() {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);
  const [hasExistingTeam, setHasExistingTeam] = useState(false);

  // Join state
  const [inviteCode, setInviteCode] = useState('');
  // Create state
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [projectName, setProjectName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || params.get('invite');
    const modeParam = params.get('mode');
    if (tokenParam) {
      setInviteCode(tokenParam.toUpperCase());
      setMode('join');
    } else if (modeParam === 'create') {
      setMode('create');
    }

    const localStore = loadStudyFlowData();
    setCurrentUser(localStore.currentUser);

    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.delete('studyflow-v1.1').catch(() => {});
    }

    // Charger l'utilisateur authentifié et les équipes depuis l'API + fusionner avec le store local
    Promise.all([
      fetch(`/api/auth/me?t=${Date.now()}`, { cache: 'no-store', credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/teams?t=${Date.now()}`, { cache: 'no-store', credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([meRes, teamsRes]) => {
      const store = loadStudyFlowData();
      let activeUser = store.currentUser;

      if (meRes?.ok && meRes.user) {
        activeUser = {
          id: meRes.user.id,
          name: meRes.user.name,
          email: meRes.user.email,
          avatar: '',
          role: meRes.user.role || 'MEMBER',
          joinedAt: new Date().toISOString(),
        };
        setCurrentUser(activeUser);
      }

      const apiTeams: AvailableTeam[] = teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];
      const mergedTeamsMap = new Map<string, AvailableTeam>();

      for (const t of store.teams) {
        const count = store.members.filter((m) => m.teamId === t.id).length;
        const myMem = store.members.find((m) => m.teamId === t.id && m.userId === activeUser.id);
        mergedTeamsMap.set(t.id, {
          id: t.id,
          name: t.name,
          description: t.description,
          slug: t.slug,
          ownerId: t.ownerId,
          inviteToken: t.inviteToken,
          memberCount: count,
          isMember: !!myMem,
          myRole: myMem?.role || null,
        });
      }

      for (const t of apiTeams) {
        mergedTeamsMap.set(t.id, t);
      }

      const list = Array.from(mergedTeamsMap.values());
      setAvailableTeams(list);
      setHasExistingTeam(list.some((t) => t.isMember));
    });
  }, []);

  const handleJoinTeam = async (e?: React.FormEvent, overrideToken?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const tokenToUse = (overrideToken ?? inviteCode).trim().toUpperCase();
    if (!tokenToUse) {
      setErrorMessage('Veuillez saisir un code d’invitation ou sélectionner une équipe ci-dessous.');
      return;
    }

    setIsLoading(true);

    try {
      const store = loadStudyFlowData();
      const activeUser = currentUser || store.currentUser;

      // 1. Appel API serveur
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse }),
      }).catch(() => null);

      const apiData = res ? await res.json().catch(() => null) : null;

      // 2. Mise à jour du moteur Local-First
      const localJoin = joinTeamWithToken({
        token: tokenToUse,
        user: activeUser,
        teams: store.teams,
        members: store.members,
      });

      if ((!res || !res.ok) && !localJoin.ok) {
        setErrorMessage(
          apiData?.error ||
            localJoin.error ||
            'Aucune équipe trouvée avec ce code d’invitation.'
        );
        setIsLoading(false);
        return;
      }

      const joinedTeam: Team = apiData?.team || localJoin.team!;
      const joinedRole = apiData?.membership?.role || localJoin.membership?.role || 'MEMBER';

      // Synchroniser l'équipe dans le store local
      if (!store.teams.some((t) => t.id === joinedTeam.id)) {
        store.teams.push(joinedTeam);
      }

      // Synchroniser le membre
      const existingMemIdx = store.members.findIndex(
        (m) => m.teamId === joinedTeam.id && m.userId === activeUser.id
      );
      if (existingMemIdx === -1) {
        store.members.push({
          id: apiData?.membership?.id || localJoin.membership?.id || `tm-${Date.now()}`,
          teamId: joinedTeam.id,
          userId: activeUser.id,
          role: joinedRole,
          joinedAt: new Date().toISOString(),
        });
      }

      // Synchroniser les projets si renvoyés par l'API
      if (Array.isArray(apiData?.projects)) {
        for (const proj of apiData.projects) {
          if (!store.projects.some((p) => p.id === proj.id)) {
            store.projects.push({
              id: proj.id,
              teamId: proj.teamId,
              name: proj.name,
              description: proj.description,
              color: proj.color,
              startDate: proj.startDate,
              endDate: proj.endDate,
            });
          }
          if (Array.isArray(proj.columns)) {
            for (const col of proj.columns) {
              if (!store.columns.some((c) => c.id === col.id)) {
                store.columns.push(col);
              }
            }
          }
        }
      }

      const updatedUser: User = {
        ...activeUser,
        role: joinedRole,
      };
      store.currentUser = updatedUser;
      if (!store.users.some((u) => u.id === updatedUser.id)) {
        store.users.push(updatedUser);
      } else {
        store.users = store.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      }

      saveStudyFlowData(store);
      localStorage.setItem('studyflow_active_team_id', joinedTeam.id);

      setSuccessMessage(`Vous avez rejoint "${joinedTeam.name}" avec le rôle ${joinedRole} ! Redirection...`);
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err: any) {
      setErrorMessage('Une erreur est survenue lors de l’adhésion à l’équipe.');
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!teamName.trim()) {
      setErrorMessage('Veuillez donner un nom à votre nouvelle équipe.');
      return;
    }

    setIsLoading(true);

    try {
      const store = loadStudyFlowData();
      const activeUser = currentUser || store.currentUser;

      // 1. Appel API serveur pour persister dans MongoDB
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim(),
          projectName: projectName.trim(),
        }),
      }).catch(() => null);

      const apiData = res && res.ok ? await res.json().catch(() => null) : null;

      // 2. Création via le moteur User Management Local-First
      const localCreated = createTeamWithOwner({
        name: teamName.trim(),
        description: teamDescription.trim(),
        projectName: projectName.trim(),
        owner: activeUser,
        existingTeams: store.teams,
      });

      const finalTeam: Team = apiData?.team || localCreated.team;
      const finalMembership = apiData?.membership || {
        ...localCreated.membership,
        teamId: finalTeam.id,
      };
      const finalProject = apiData?.project || {
        ...localCreated.defaultProject,
        teamId: finalTeam.id,
      };
      const finalColumns =
        Array.isArray(apiData?.columns) && apiData.columns.length > 0
          ? apiData.columns
          : localCreated.defaultColumns.map((c) => ({ ...c, projectId: finalProject.id }));

      store.teams = [finalTeam, ...store.teams.filter((t) => t.id !== finalTeam.id)];
      store.members = [
        ...store.members.filter((m) => !(m.teamId === finalTeam.id && m.userId === activeUser.id)),
        finalMembership,
      ];
      store.projects = [finalProject, ...store.projects.filter((p) => p.id !== finalProject.id)];
      store.columns = [...store.columns, ...finalColumns];

      const updatedUser: User = {
        ...activeUser,
        role: 'OWNER',
      };
      store.currentUser = updatedUser;
      if (!store.users.some((u) => u.id === updatedUser.id)) {
        store.users.push(updatedUser);
      } else {
        store.users = store.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      }

      saveStudyFlowData(store);
      localStorage.setItem('studyflow_active_team_id', finalTeam.id);

      setSuccessMessage(`Équipe "${finalTeam.name}" créée ! Vous êtes désormais OWNER. Redirection...`);
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err: any) {
      setErrorMessage('Impossible de créer l’équipe.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 flex items-center justify-center text-white font-extrabold text-base">
              SF
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Configuration de votre Équipe StudyFlow
              </h1>
              <p className="text-xs text-slate-400">
                {currentUser ? ` Connecté en tant que ${currentUser.name} (${currentUser.email})` : 'Choisissez comment collaborer'}
              </p>
            </div>
          </div>

          {hasExistingTeam && (
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tableau de bord</span>
            </Link>
          )}
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setErrorMessage('');
            }}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
              mode === 'join'
                ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                mode === 'join' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Rejoindre une équipe</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  MEMBER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Entrez un code d&apos;invitation (ex: <code className="text-indigo-300">STUDY-S5-2026</code>) ou sélectionnez une équipe existante.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('create');
              setErrorMessage('');
            }}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
              mode === 'create'
                ? 'bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                mode === 'create' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Créer une nouvelle équipe</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  OWNER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Créez votre propre espace, devenez Propriétaire (<strong>OWNER</strong>) et invitez vos camarades et coachs.
              </p>
            </div>
          </button>
        </div>

        {/* Main Panel */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-2xl space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'join' ? (
            <div className="space-y-5">
              <form onSubmit={(e) => handleJoinTeam(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Code d&apos;invitation de l&apos;équipe
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="Ex: STUDY-S5-2026"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <span>{isLoading ? 'Adhésion...' : 'Rejoindre'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Liste des équipes existantes pour rejoindre en 1 clic */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Équipes actives sur le campus (Accès direct)
                  </span>
                  <span className="text-[11px] text-slate-500">{availableTeams.length} équipe(s)</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableTeams.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-white truncate">{t.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {t.inviteToken}
                          </span>
                          {t.isMember && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Déjà membre ({t.myRole})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {t.description || 'Équipe projet universitaire'}
                        </p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-3">
                          <span>{t.memberCount ?? 1} membre(s)</span>
                          {t.ownerName && <span>• Propriétaire : {t.ownerName}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setInviteCode(t.inviteToken);
                          handleJoinTeam(undefined, t.inviteToken);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 hover:border-indigo-500 flex items-center justify-center gap-1.5 shrink-0 transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{t.isMember ? 'Ouvrir cette équipe' : 'Rejoindre'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white block mb-0.5">Vous serez Propriétaire (OWNER) de cette équipe</strong>
                  Vous disposerez de tous les droits d&apos;administration : génération du code d&apos;invitation, ajout de coachs (<strong>COACH</strong>) et de membres (<strong>MEMBER</strong>), gestion des rôles et transfert de propriété.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nom de la nouvelle équipe *
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ex: Équipe Master 2 IA & Cloud"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description de l&apos;équipe (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Objectif de l'équipe, module universitaire ou sujet du projet..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nom du premier projet Kanban (optionnel)
                </label>
                <div className="relative">
                  <FolderKanban className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Application Mobile S5 (créé automatiquement avec 4 colonnes Kanban)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !teamName.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Création de l’équipe...' : 'Créer mon équipe et accéder au Kanban'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

