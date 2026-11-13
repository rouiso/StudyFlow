'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Flag,
  Clock,
  CheckCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Task, Milestone, Column, User, Training, CoachingSession } from '@/types';

interface CalendarViewProps {
  projectId?: string;
  tasks: Task[];
  milestones: Milestone[];
  columns: Column[];
  users: User[];
  trainings?: Training[];
  coachingSessions?: CoachingSession[];
  currentUserId?: string;
  onOpenTaskModal: (task: Task) => void;
  onAddMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  onUpdateMilestone?: (milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>) => void;
  onToggleMilestone: (milestoneId: string) => void;
  onDeleteMilestone: (milestoneId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  projectId = 'proj-1',
  tasks,
  milestones,
  trainings = [],
  coachingSessions = [],
  currentUserId,
  onOpenTaskModal,
  onAddMilestone,
  onUpdateMilestone,
  onToggleMilestone,
  onDeleteMilestone,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const openCreateModal = () => {
    setEditingMilestone(null);
    setNewMilestoneTitle('');
    setNewMilestoneDate(new Date().toISOString().split('T')[0]);
    setNewMilestoneDesc('');
    setShowAddMilestoneModal(true);
  };

  const openEditModal = (m: Milestone) => {
    setEditingMilestone(m);
    setNewMilestoneTitle(m.title);
    setNewMilestoneDate(m.date);
    setNewMilestoneDesc(m.description || '');
    setShowAddMilestoneModal(true);
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    if (editingMilestone && onUpdateMilestone) {
      onUpdateMilestone(editingMilestone.id, {
        title: newMilestoneTitle.trim(),
        date: newMilestoneDate,
        description: newMilestoneDesc.trim(),
      });
    } else {
      onAddMilestone({
        projectId,
        title: newMilestoneTitle.trim(),
        date: newMilestoneDate,
        description: newMilestoneDesc.trim(),
        completed: false,
      });
    }

    setEditingMilestone(null);
    setNewMilestoneTitle('');
    setNewMilestoneDesc('');
    setShowAddMilestoneModal(false);
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
    const dayMilestones = milestones.filter((m) => m.date === dateStr);
    const dayTrainings = trainings.filter((tr) => tr.startsAt && tr.startsAt.startsWith(dateStr));
    const dayCoaching = coachingSessions.filter(
      (cs) =>
        cs.scheduledAt &&
        cs.scheduledAt.startsWith(dateStr) &&
        cs.status !== 'CANCELLED' &&
        (!currentUserId || cs.coachId === currentUserId || cs.coacheeId === currentUserId)
    );
    return { dayTasks, dayMilestones, dayTrainings, dayCoaching };
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-6">
      {/* En-tête Navigation Mois */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ajouter un Jalon</span>
          </button>

          <div className="flex items-center rounded-xl bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grille Calendrier */}
      <div className="glass-panel rounded-2xl p-3 sm:p-5 border border-slate-800">
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 pb-2 border-b border-slate-800">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mer</div>
          <div>Jeu</div>
          <div>Ven</div>
          <div>Sam</div>
          <div>Dim</div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[70px] sm:min-h-[90px] rounded-xl bg-slate-900/30 p-1"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const { dayTasks, dayMilestones, dayTrainings, dayCoaching } = getEventsForDay(day);

            return (
              <div
                key={day}
                className={`min-h-[70px] sm:min-h-[90px] rounded-xl p-1 sm:p-2 border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-inner'
                    : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-slate-300'
                    }`}
                  >
                    {day}
                  </span>
                  {dayMilestones.length > 0 && (
                    <Flag className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-y-auto max-h-[50px] sm:max-h-[60px]">
                  {dayMilestones.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => openEditModal(m)}
                      title={`Jalon M4 : ${m.title}`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-500/40 truncate cursor-pointer"
                    >
                      ★ {m.title}
                    </div>
                  ))}

                  {dayTrainings.map((tr) => (
                    <div
                      key={tr.id}
                      title={`Formation M7 : ${tr.title}`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 truncate flex items-center gap-1"
                    >
                      <span>🎓</span>
                      <span className="truncate">{tr.title}</span>
                    </div>
                  ))}

                  {dayCoaching.map((cs) => (
                    <div
                      key={cs.id}
                      title={`Coaching M7 : ${cs.topic}`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/25 text-amber-300 border border-amber-500/40 truncate flex items-center gap-1"
                    >
                      <span>🤝</span>
                      <span className="truncate">{cs.topic}</span>
                    </div>
                  ))}

                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskModal(t)}
                      title={`Tâche M3/M4 : ${t.title}`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 truncate cursor-pointer"
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende Multi-sources */}
        <div className="pt-3 mt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Sources agrégées :</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
              <span>Échéances Tâches (M3/M4)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" />
              <span>Jalons Clés (M4)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Formations (M7)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>Coaching Confirmé (M7)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Jalons Clés (Milestones du projet) */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Jalons Clés du Projet (Validation & Soutenance)
            </h3>
          </div>
          <span className="text-xs text-slate-400">{milestones.length} jalons fixés</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl border transition-all ${
                m.completed
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'glass-card border-slate-800 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleMilestone(m.id)}
                    className={`p-1 rounded-lg ${
                      m.completed ? 'text-emerald-400' : 'text-slate-500 hover:text-purple-400'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <h4
                    className={`text-xs font-bold ${
                      m.completed ? 'line-through text-slate-400' : 'text-slate-100'
                    }`}
                  >
                    {m.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  {onUpdateMilestone && (
                    <button
                      onClick={() => openEditModal(m)}
                      className="text-slate-500 hover:text-indigo-400 p-1"
                      title="Modifier ce jalon"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteMilestone(m.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Supprimer ce jalon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-semibold mb-1">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(m.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {m.description && <p className="text-[11px] text-slate-400">{m.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Modale d'ajout / édition de Jalon */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl glass-panel bg-slate-900 border border-slate-700 p-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-3">
              {editingMilestone ? 'Modifier le Jalon' : 'Ajouter un Jalon Clé'}
            </h3>
            <form onSubmit={handleSaveMilestone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Titre du jalon *
                </label>
                <input
                  type="text"
                  required
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="Ex: Soutenance Finale Notée..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date limite *
                </label>
                <input
                  type="date"
                  required
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Objectif
                </label>
                <textarea
                  rows={2}
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  placeholder="Critères d'évaluation, livrables attendus..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMilestone(null);
                    setShowAddMilestoneModal(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  {editingMilestone ? 'Enregistrer' : 'Ajouter Jalon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
