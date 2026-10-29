'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Users,
  Shield,
  Trash2,
  UserPlus,
  Mail,
} from 'lucide-react';
import { Team, User, TeamMember, UserRole } from '@/types';

interface TeamInviteModalProps {
  team: Team;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onUpdateRole: (userId: string, newRole: UserRole) => void;
  onRemoveMember: (userId: string) => void;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  team,
  users,
  currentUser,
  onClose,
  onUpdateRole,
  onRemoveMember,
}) => {
  const [copied, setCopied] = useState(false);
  const [inviteToken, setInviteToken] = useState(team.inviteToken);
  const [inviteEmail, setInviteEmail] = useState('');

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/invite/${inviteToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRegenerateToken = () => {
    const newToken = `STUDY-${Math.random().toString(36).substring(2, 7).toUpperCase()}-2026`;
    setInviteToken(newToken);
  };

  const handleSendEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    alert(`Invitation envoyée par e-mail à ${inviteEmail} avec le jeton ${inviteToken}`);
    setInviteEmail('');
  };

  const isOwnerOrAdmin = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-5">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Gestion de l&apos;Équipe & Invitations</h3>
              <p className="text-[11px] text-slate-400">{team.name} ({users.length} membres)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1.5 Lien d'invitation avec jeton (P1 Cahier des charges) */}
        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Lien d&apos;invitation secret (Valable 7 jours)
            </label>
            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={handleRegenerateToken}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Régénérer</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* 1.12 Invitation nominative par e-mail */}
        <form onSubmit={handleSendEmailInvite} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Inviter un camarade par e-mail..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Inviter</span>
          </button>
        </form>

        {/* 1.6 Gestion des membres & Rôles */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">
            Membres de l&apos;équipe et rôles
          </span>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {users.map((member) => (
              <div
                key={member.id}
                className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <div className="truncate">
                    <span className="font-semibold text-slate-200 block truncate">{member.name}</span>
                    <span className="text-[10px] text-slate-400 truncate">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnerOrAdmin && member.id !== team.ownerId ? (
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.id, e.target.value as UserRole)}
                      className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {member.role}
                    </span>
                  )}

                  {isOwnerOrAdmin && member.id !== team.ownerId && (
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      title="Retirer le membre de l'équipe"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton fermer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
