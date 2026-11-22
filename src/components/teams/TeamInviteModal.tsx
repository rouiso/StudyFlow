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
  Crown,
  Search,
  KeyRound,
  PlusCircle,
  Settings,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Team, User, TeamMember, UserRole } from '@/types';
import { UserAvatar } from '@/components/UserAvatar';
import {
  ROLE_METADATA,
  getRolePermissions,
  getAssignableRoles,
  canChangeMemberRole,
  canRemoveTeamMember,
} from '@/lib/user-management';

export interface TeamMemberWithUser {
  user: User;
  role: UserRole;
  joinedAt: string;
}

interface TeamInviteModalProps {
  team: Team;
  teams: Team[];
  members: TeamMember[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
  onUpdateRole: (userId: string, newRole: UserRole) => void;
  onRemoveMember: (userId: string) => void;
  onTransferOwnership: (newOwnerId: string) => void;
  onInviteMember: (params: { name: string; email: string; role: UserRole }) => void;
  onRegenerateToken: () => Promise<string | void> | string | void;
  onUpdateTeamSettings: (params: { name: string; description: string }) => void;
  onCreateNewTeam: (params: { name: string; description: string; projectName?: string }) => void;
  onJoinTeamByToken: (token: string) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  team,
  teams,
  members,
  users,
  currentUser,
  onClose,
  onSelectTeam,
  onUpdateRole,
  onRemoveMember,
  onTransferOwnership,
  onInviteMember,
  onRegenerateToken,
  onUpdateTeamSettings,
  onCreateNewTeam,
  onJoinTeamByToken,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'invite' | 'roles' | 'teams'>('members');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtres membres
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Formulaire invitation directe
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER');

  // Paramètres de l'équipe
  const [editTeamName, setEditTeamName] = useState(team.name);
  const [editTeamDesc, setEditTeamDesc] = useState(team.description);

  // Rejoindre / Créer une autre équipe
  const [joinTokenInput, setJoinTokenInput] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamProject, setNewTeamProject] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Calcul des membres de l'équipe courante avec leur rôle spécifique à cette équipe
  const teamMemberships = members.filter((m) => m.teamId === team.id);
  const teamMemberUsers: TeamMemberWithUser[] = teamMemberships
    .map((m) => {
      const u = users.find((usr) => usr.id === m.userId);
      if (!u) return null;
      return {
        user: { ...u, role: m.role },
        role: m.role,
        joinedAt: m.joinedAt,
      };
    })
    .filter((item): item is TeamMemberWithUser => item !== null);

  // Rôle de l'utilisateur courant dans cette équipe
  const myMembership = teamMemberships.find((m) => m.userId === currentUser.id);
  const effectiveRole: UserRole =
    team.ownerId === currentUser.id
      ? 'OWNER'
      : myMembership?.role || currentUser.role || 'MEMBER';

  const perms = getRolePermissions(effectiveRole);
  const assignableRoles = getAssignableRoles(effectiveRole);

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/invite/${team.inviteToken}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(team.inviteToken);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      showToast('error', 'Veuillez saisir une adresse e-mail.');
      return;
    }
    const displayName = inviteName.trim() || inviteEmail.trim().split('@')[0];
    onInviteMember({
      name: displayName,
      email: inviteEmail.trim().toLowerCase(),
      role: assignableRoles.includes(inviteRole) ? inviteRole : 'MEMBER',
    });
    setInviteName('');
    setInviteEmail('');
    showToast('success', `${displayName} a été ajouté(e) à l'équipe avec le rôle ${inviteRole}.`);
  };

  const handleSaveTeamSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeamName.trim()) return;
    onUpdateTeamSettings({
      name: editTeamName.trim(),
      description: editTeamDesc.trim(),
    });
    showToast('success', 'Paramètres de l’équipe enregistrés.');
  };

  const handleJoinOtherTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinTokenInput.trim()) return;
    const res = await onJoinTeamByToken(joinTokenInput.trim().toUpperCase());
    if (!res.ok) {
      showToast('error', res.error || 'Code d’invitation invalide.');
    } else {
      setJoinTokenInput('');
      showToast('success', 'Vous avez rejoint l’équipe avec succès !');
    }
  };

  const handleCreateOtherTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onCreateNewTeam({
      name: newTeamName.trim(),
      description: newTeamDesc.trim(),
      projectName: newTeamProject.trim() || undefined,
    });
    setNewTeamName('');
    setNewTeamDesc('');
    setNewTeamProject('');
    showToast('success', `Nouvelle équipe "${newTeamName.trim()}" créée ! Vous en êtes OWNER.`);
  };

  const filteredMembers = teamMemberUsers.filter(({ user, role }) => {
    const matchesRole = roleFilter === 'ALL' || role === roleFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  // Équipes dont l'utilisateur fait partie
  const myTeams = teams.filter((t) =>
    members.some((m) => m.teamId === t.id && m.userId === currentUser.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl glass-panel bg-slate-900 border border-slate-700/90 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">{team.name}</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${ROLE_METADATA[effectiveRole].badgeClass}`}>
                  Votre rôle : {effectiveRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {teamMemberUsers.length} membre(s) • Code d&apos;accès :{' '}
                <code className="text-indigo-300 font-mono">{team.inviteToken}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation par onglets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membres ({teamMemberUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'invite'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invitations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Rôles & Droits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'teams'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Mes Équipes ({myTeams.length})</span>
          </button>
        </div>

        {/* Bannière de retour d'action */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* ONGLET 1 : MEMBRES & GESTION DES RÔLES */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {/* Barre de recherche et filtre par rôle */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un membre par nom ou e-mail..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Tous les rôles ({teamMemberUsers.length})</option>
                  <option value="OWNER">OWNER (Propriétaire)</option>
                  <option value="COACH">COACH (Enseignant)</option>
                  <option value="MEMBER">MEMBER (Contributeur)</option>
                </select>
              </div>

              {/* Liste des membres */}
              <div className="space-y-2">
                {filteredMembers.map(({ user: member, role: memberRole }) => {
                  const isTeamOwner = member.id === team.ownerId || memberRole === 'OWNER';
                  const isSelf = member.id === currentUser.id;

                  // Vérifier si l'acteur courant a le droit de modifier le rôle de ce membre
                  const canEditThisRole =
                    !isTeamOwner &&
                    !isSelf &&
                    assignableRoles.length > 0 &&
                    canChangeMemberRole({
                      actorId: currentUser.id,
                      actorRole: effectiveRole,
                      targetId: member.id,
                      targetRole: memberRole,
                      newRole: assignableRoles[0],
                      teamOwnerId: team.ownerId,
                    }).allowed;

                  // Vérifier si l'acteur courant peut retirer ce membre
                  const removeCheck = canRemoveTeamMember({
                    actorId: currentUser.id,
                    actorRole: effectiveRole,
                    targetId: member.id,
                    targetRole: memberRole,
                    teamOwnerId: team.ownerId,
                  });

                  return (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 hover:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={member.name} className="w-8 h-8 text-[10px] ring-1 ring-slate-700" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 truncate">{member.name}</span>
                            {isSelf && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                Vous
                              </span>
                            )}
                            {isTeamOwner && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Crown className="w-3 h-3" />
                                Propriétaire
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">{member.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {canEditThisRole ? (
                          <select
                            aria-label={`Rôle de ${member.name}`}
                            value={memberRole}
                            onChange={(e) => {
                              const nextRole = e.target.value as UserRole;
                              onUpdateRole(member.id, nextRole);
                              showToast('success', `Rôle de ${member.name} mis à jour : ${nextRole}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-200 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="COACH">COACH (Enseignant / Mentor)</option>
                            <option value="MEMBER">MEMBER (Contributeur)</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${
                              ROLE_METADATA[memberRole]?.badgeClass || ROLE_METADATA.MEMBER.badgeClass
                            }`}
                          >
                            {memberRole}
                          </span>
                        )}

                        {/* Bouton Transfert de Propriété (uniquement visible par le OWNER actuel) */}
                        {perms.canTransferOwnership && !isTeamOwner && !isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Transférer la propriété (OWNER) de l'équipe "${team.name}" à ${member.name} ? Vous passerez au rôle MEMBER.`
                                )
                              ) {
                                onTransferOwnership(member.id);
                                showToast(
                                  'success',
                                  `${member.name} est désormais le Propriétaire (OWNER) de l'équipe.`
                                );
                              }
                            }}
                            title={`Nommer ${member.name} Propriétaire (OWNER)`}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Retirer un membre (si autorisé par le moteur RBAC) */}
                        {!isSelf && removeCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Retirer ${member.name} de l'équipe "${team.name}" ?`)) {
                                onRemoveMember(member.id);
                                showToast('success', `${member.name} a été retiré(e) de l'équipe.`);
                              }
                            }}
                            title="Retirer le membre de l'équipe"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quitter l'équipe (pour soi-même si non-OWNER) */}
                        {isSelf && removeCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Voulez-vous quitter l'équipe "${team.name}" ?`)) {
                                onRemoveMember(member.id);
                              }
                            }}
                            title="Quitter cette équipe"
                            className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Quitter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ONGLET 2 : INVITATIONS & AJOUT DE MEMBRES */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              {/* Code d'invitation & Lien */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Code & Lien d&apos;invitation de l&apos;équipe
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Partagez ce code pour permettre à vos camarades de rejoindre l&apos;équipe après inscription.
                    </span>
                  </div>
                  {perms.canRegenerateInviteToken && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onRegenerateToken();
                        showToast('success', 'Nouveau code d’invitation généré !');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Régénérer</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Code d&apos;accès rapide
                      </span>
                      <span className="text-sm font-mono font-extrabold text-indigo-300">
                        {team.inviteToken}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        copiedCode
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copié' : 'Copier code'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Lien d&apos;invitation direct
                      </span>
                      <span className="text-xs font-mono text-slate-300 truncate block">
                        {inviteUrl}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all ${
                        copiedLink
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copié' : 'Copier lien'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ajout / Invitation nominative avec choix du rôle */}
              {perms.canInviteMembers ? (
                <form
                  onSubmit={handleInviteSubmit}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Ajouter ou inviter un membre avec un rôle spécifique
                    </span>
                    <span className="text-[11px] text-slate-400">
                      En tant que <strong>{effectiveRole}</strong>, vous pouvez attribuer les rôles :{' '}
                      {assignableRoles.join(', ')}.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Nom complet (ex: Lucas Moreau)"
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="lucas.moreau@univ.fr"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          Rôle : {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Ajouter à l&apos;équipe</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                  Seul le Propriétaire (<strong>OWNER</strong>) peut ajouter directement des membres ou modifier les rôles.
                </div>
              )}
            </div>
          )}

          {/* ONGLET 3 : MATRICE DES RÔLES & PARAMÈTRES DE L'ÉQUIPE */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  Hiérarchie et Permissions du Moteur de Gestion Utilisateurs
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {(['OWNER', 'COACH', 'MEMBER'] as UserRole[]).map((r) => {
                    const meta = ROLE_METADATA[r];
                    const isCurrent = effectiveRole === r;
                    return (
                      <div
                        key={r}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          isCurrent
                            ? 'bg-indigo-950/40 border-indigo-500/50'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                              {meta.shortLabel}
                            </span>
                            <span className="text-xs font-bold text-white">{meta.label}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-indigo-400">
                                (Votre rôle actuel)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{meta.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {perms.canManageTeamSettings && (
                <form
                  onSubmit={handleSaveTeamSettings}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <span>Paramètres de l&apos;équipe ({team.name})</span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nom de l&apos;équipe</label>
                      <input
                        type="text"
                        required
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                      <input
                        type="text"
                        value={editTeamDesc}
                        onChange={(e) => setEditTeamDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    Enregistrer les modifications
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ONGLET 4 : CHANGER D'ÉQUIPE, REJOINDRE OU CRÉER UNE NOUVELLE ÉQUIPE */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              {/* Liste des équipes de l'utilisateur */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  Vos équipes ({myTeams.length})
                </span>
                <div className="space-y-2">
                  {myTeams.map((t) => {
                    const m = members.find((mem) => mem.teamId === t.id && mem.userId === currentUser.id);
                    const roleInTeam: UserRole =
                      t.ownerId === currentUser.id ? 'OWNER' : m?.role || 'MEMBER';
                    const isActive = t.id === team.id;
                    const count = members.filter((mem) => mem.teamId === t.id).length;

                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-indigo-600/15 border-indigo-500/60'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{t.name}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                ROLE_METADATA[roleInTeam].badgeClass
                              }`}
                            >
                              {roleInTeam}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {count} membre(s) • Code : <code className="text-indigo-300">{t.inviteToken}</code>
                          </span>
                        </div>

                        {isActive ? (
                          <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            Équipe active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTeam(t.id);
                              showToast('success', `Basculé vers l'équipe "${t.name}"`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                          >
                            Basculer
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rejoindre une équipe avec un code */}
              <form
                onSubmit={handleJoinOtherTeam}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
              >
                <span className="text-xs font-bold text-white block">
                  Rejoindre une équipe existante avec un code
                </span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={joinTokenInput}
                      onChange={(e) => setJoinTokenInput(e.target.value.toUpperCase())}
                      placeholder="Code d'invitation (ex: STUDY-S5-2026)"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <span>Rejoindre</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Créer une nouvelle équipe (Devient OWNER) */}
              <form
                onSubmit={handleCreateOtherTeam}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Créer une nouvelle équipe
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Vous serez OWNER
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Nom de la nouvelle équipe *"
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newTeamProject}
                    onChange={(e) => setNewTeamProject(e.target.value)}
                    placeholder="Nom du 1er projet Kanban (optionnel)"
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <input
                  type="text"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Description de l'équipe (optionnel)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Créer l&apos;équipe et devenir OWNER</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Pied de modale */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Moteur RBAC StudyFlow : OWNER • MEMBER • COACH
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
