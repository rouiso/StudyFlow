'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [isJoining, setIsJoining] = useState(false);

  const handleAccept = () => {
    setIsJoining(true);
    setTimeout(() => {
      // Inscription à l'équipe et redirection
      router.push('/');
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white font-black text-2xl">
          SF
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Jeton valide : {token}
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rejoindre l&apos;Équipe Étudiante</h1>
          <p className="text-xs text-slate-400">
            Vous avez été invité à collaborer sur <strong className="text-slate-200">Équipe Projet Web S5</strong>.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Équipe Projet Web S5</div>
              <div className="text-[11px] text-slate-400">Rôle attribué : MEMBRE</div>
            </div>
          </div>

          <button
            onClick={handleAccept}
            disabled={isJoining}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <span>{isJoining ? 'Intégration à l’équipe...' : 'Accepter l’invitation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
