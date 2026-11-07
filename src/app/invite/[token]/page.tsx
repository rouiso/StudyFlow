'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { loadStudyFlowData, saveStudyFlowData } from '@/lib/storage';
import { joinTeamWithToken } from '@/lib/user-management';
import { Team } from '@/types';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';
  const [teamInfo, setTeamInfo] = useState<{
    id: string;
    name: string;
    description: string;
    inviteToken: string;
    memberCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`/api/teams/join?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((apiRes) => {
        if (apiRes?.ok && apiRes.team) {
          setTeamInfo(apiRes.team);
          setIsLoading(false);
          return;
        }

        // Fallback recherche dans le store local
        const store = loadStudyFlowData();
        const clean = token.trim().toUpperCase();
        const found = store.teams.find(
          (t) =>
            t.inviteToken.toUpperCase() === clean ||
            t.slug.toUpperCase() === clean ||
            t.id.toUpperCase() === clean
        );

        if (found) {
          const count = store.members.filter((m) => m.teamId === found.id).length;
          setTeamInfo({
            id: found.id,
            name: found.name,
            description: found.description,
            inviteToken: found.inviteToken,
            memberCount: count,
          });
        } else {
          setErrorMessage('Ce jeton d’invitation ne correspond à aucune équipe active.');
        }
        setIsLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    setErrorMessage('');
    setIsJoining(true);

    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => null);

      if (res && res.status === 401) {
        router.push(`/register?invite=${encodeURIComponent(token)}`);
        return;
      }

      const apiData = res && res.ok ? await res.json().catch(() => null) : null;
      const store = loadStudyFlowData();

      const localJoin = joinTeamWithToken({
        token,
        user: store.currentUser,
        teams: store.teams,
        members: store.members,
      });

      if (!apiData?.ok && !localJoin.ok) {
        setErrorMessage(apiData?.error || localJoin.error || 'Jeton d’invitation invalide.');
        setIsJoining(false);
        return;
      }

      const targetTeam: Team = apiData?.team || localJoin.team!;
      const joinedRole = apiData?.membership?.role || localJoin.membership?.role || 'MEMBER';

      if (!store.teams.some((t) => t.id === targetTeam.id)) {
        store.teams.push(targetTeam);
      }

      if (!store.members.some((m) => m.teamId === targetTeam.id && m.userId === store.currentUser.id)) {
        store.members.push({
          id: apiData?.membership?.id || localJoin.membership?.id || `tm-${Date.now()}`,
          teamId: targetTeam.id,
          userId: store.currentUser.id,
          role: joinedRole,
          joinedAt: new Date().toISOString(),
        });
      }

      store.currentUser = {
        ...store.currentUser,
        role: joinedRole,
      };
      saveStudyFlowData(store);
      localStorage.setItem('studyflow_active_team_id', targetTeam.id);

      setSuccessMessage(`Vous avez rejoint "${targetTeam.name}" avec succès !`);
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (e) {
      setErrorMessage('Erreur lors de l’acceptation de l’invitation.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white font-black text-2xl">
          SF
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
            Code d&apos;invitation : {token}
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Rejoindre une Équipe StudyFlow
          </h1>
          <p className="text-xs text-slate-400">
            {teamInfo
              ? `Vous êtes invité(e) à rejoindre "${teamInfo.name}".`
              : 'Vérification de votre invitation...'}
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 text-left">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Recherche de l&apos;équipe...</div>
          ) : teamInfo ? (
            <>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-white truncate">{teamInfo.name}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {teamInfo.description || 'Équipe collaborative StudyFlow'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                    Rôle attribué : MEMBER (Contributeur) • {teamInfo.memberCount} membre(s)
                  </div>
                </div>
              </div>

              <button
                onClick={handleAccept}
                disabled={isJoining}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isJoining ? 'Intégration à l’équipe...' : 'Accepter l’invitation et rejoindre'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="text-center space-y-3 py-2">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                <span>Choisir ou créer une équipe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
