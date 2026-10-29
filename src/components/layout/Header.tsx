'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  Bell,
  Wifi,
  WifiOff,
  RotateCcw,
  UserCheck,
  ChevronDown,
  CheckCircle,
  Users,
  Plus,
} from 'lucide-react';
import { usePwa } from '../pwa/PwaProvider';
import { User, Project, AppNotification } from '@/types';

interface HeaderProps {
  currentProject: Project;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (userId: string) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onResetData: () => void;
  onOpenTeamModal?: () => void;
  onOpenProjectModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  currentUser,
  users,
  onSwitchUser,
  notifications,
  onMarkNotificationRead,
  onResetData,
  onOpenTeamModal,
  onOpenProjectModal,
}) => {
  const { isOnline, canInstall, promptInstall } = usePwa();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Sélecteur de projet */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-sm tracking-tight">
              SF
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">StudyFlow</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PWA v1.0
                </span>
              </div>
            </div>
          </div>

          {/* Sélecteur de projet dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs sm:text-sm font-medium text-slate-200 border border-slate-700/60 transition-colors"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentProject.color }} />
              <span className="truncate max-w-[130px] sm:max-w-[200px]">{currentProject.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProjectMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl glass-panel bg-slate-900/95 border border-slate-700/80 shadow-2xl p-1 z-50 animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Projets de l&apos;équipe
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setShowProjectMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-colors ${
                      p.id === currentProject.id
                        ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate flex-1">{p.name}</span>
                    {p.id === currentProject.id && <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}

                {onOpenProjectModal && (
                  <div className="pt-1 mt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        onOpenProjectModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/15 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer un nouveau projet...</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {onOpenTeamModal && (
            <button
              onClick={onOpenTeamModal}
              title="Gérer l'équipe et les invitations (Module 1)"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-300 border border-slate-700/60 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Équipe & Invitations</span>
            </button>
          )}
        </div>

        {/* Actions à droite */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Indicateur Réseau */}
          <div
            title={isOnline ? 'Connecté au réseau' : 'Mode Hors-ligne actif'}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>

          {/* Bouton Installer PWA (si disponible) */}
          {canInstall && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all transform hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installer l&apos;App</span>
            </button>
          )}

          {/* Cloche Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl glass-panel bg-slate-900/95 border border-slate-700/80 shadow-2xl p-2 z-50 animate-fade-in">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200">Centre de notifications</span>
                  <span className="text-[11px] text-indigo-400 font-medium">{unreadCount} non lue(s)</span>
                </div>
                <div className="divide-y divide-slate-800/60 mt-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">Aucune notification</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          !n.readAt ? 'bg-indigo-950/40 hover:bg-indigo-900/40' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-200">
                          <span>{n.title}</span>
                          {!n.readAt && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sélecteur de Profil Utilisateur (Simulateur multi-utilisateurs pour la soutenance) */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 transition-colors"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-400"
              />
              <span className="text-xs font-semibold text-slate-200 max-w-[80px] sm:max-w-[110px] truncate hidden xs:inline">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                {currentUser.role}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl glass-panel bg-slate-900/95 border border-slate-700/80 shadow-2xl p-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Membres & Rôles
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                      u.id === currentUser.id ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                    <div className="flex-1 truncate">
                      <div className="font-medium text-slate-200">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.role}</div>
                    </div>
                  </button>
                ))}

                <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      onResetData();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réinitialiser les données</span>
                  </button>

                  <button
                    onClick={async () => {
                      await fetch('/api/auth/logout', { method: 'POST' });
                      window.location.href = '/login';
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
