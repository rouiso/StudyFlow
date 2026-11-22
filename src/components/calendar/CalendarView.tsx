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
  Sparkles,
  Download,
  Mail,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Task, Milestone, Column, User, Training, CoachingSession } from '@/types';

interface CalendarViewProps {
  projectId?: string;
  canGenerateAi: boolean;
  tasks: Task[];
  milestones: Milestone[];
  columns: Column[];
  users: User[];
  trainings?: Training[];
  coachingSessions?: CoachingSession[];
  currentUserId?: string;
  onOpenTaskModal: (task: Task) => void;
  onAddMilestones: (milestones: Omit<Milestone, 'id'>[]) => Promise<void>;
  onUpdateMilestone?: (milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>) => void | Promise<void>;
  onToggleMilestone: (milestoneId: string) => void | Promise<void>;
  onDeleteMilestone: (milestoneId: string) => void | Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  projectId = 'proj-1',
  canGenerateAi,
  tasks,
  milestones,
  trainings = [],
  coachingSessions = [],
  currentUserId,
  onOpenTaskModal,
  onAddMilestones,
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
  const [showAiEventModal, setShowAiEventModal] = useState(false);
  const [aiSourceText, setAiSourceText] = useState('');
  const [extractedEvents, setExtractedEvents] = useState<{ title: string; date: string; description: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingWeeklySummary, setIsSendingWeeklySummary] = useState(false);
  const [isSavingEvents, setIsSavingEvents] = useState(false);
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);
  const [aiError, setAiError] = useState('');
  const [milestoneError, setMilestoneError] = useState('');
  const [calendarMessage, setCalendarMessage] = useState('');

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

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    setIsSavingMilestone(true);
    setAiError('');
    try {
      if (editingMilestone && onUpdateMilestone) {
        await onUpdateMilestone(editingMilestone.id, {
          title: newMilestoneTitle.trim(),
          date: newMilestoneDate,
          description: newMilestoneDesc.trim(),
        });
      } else {
        await onAddMilestones([{
          projectId,
          title: newMilestoneTitle.trim(),
          date: newMilestoneDate,
          description: newMilestoneDesc.trim(),
          completed: false,
        }]);
      }

      setEditingMilestone(null);
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
      setShowAddMilestoneModal(false);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Impossible d’enregistrer le jalon.');
    } finally {
      setIsSavingMilestone(false);
    }
  };

  const runMilestoneAction = async (action: () => void | Promise<void>) => {
    setMilestoneError('');
    try {
      await action();
    } catch (error) {
      setMilestoneError(error instanceof Error ? error.message : 'Impossible de modifier le jalon.');
    }
  };

  const handleExtractEvents = async () => {
    if (!canGenerateAi || aiSourceText.trim().length < 20 || isExtracting) return;
    setIsExtracting(true);
    setAiError('');
    setCalendarMessage('');
    setExtractedEvents([]);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operation: 'AI_EXTRACT_CALENDAR_EVENTS',
          projectId,
          text: aiSourceText.trim(),
          language: typeof navigator !== 'undefined' ? navigator.language : 'fr',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Impossible d’extraire les événements.');
      }
      if (!Array.isArray(result.data?.events)) {
        throw new Error('La réponse IA ne contient pas de liste d’événements valide.');
      }
      setExtractedEvents(result.data.events);
      if (!result.data.events.length) setCalendarMessage('Aucun événement avec une date explicite n’a été trouvé.');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erreur lors de l’extraction IA.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddExtractedEvents = async () => {
    if (!extractedEvents.length || isSavingEvents) return;
    setAiError('');
    setIsSavingEvents(true);
    try {
      await onAddMilestones(extractedEvents.map((event) => ({
        projectId,
        title: event.title,
        date: event.date,
        description: event.description,
        completed: false,
      })));
      setCalendarMessage(`${extractedEvents.length} événement(s) ajouté(s) au calendrier.`);
      setExtractedEvents([]);
      setAiSourceText('');
      setShowAiEventModal(false);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Impossible d’ajouter les événements.');
    } finally {
      setIsSavingEvents(false);
    }
  };

  const handleExportCalendar = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setAiError('');
    try {
      const response = await fetch(`/api/calendar/export?projectId=${encodeURIComponent(projectId)}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Impossible d’exporter le calendrier.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'studyflow-calendar.ics';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erreur lors de l’export calendrier.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendWeeklySummary = async () => {
    if (isSendingWeeklySummary) return;
    setIsSendingWeeklySummary(true);
    setAiError('');
    setCalendarMessage('');
    try {
      const response = await fetch('/api/calendar/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Impossible d’envoyer le résumé hebdomadaire.');
      }

      if (result.data?.status === 'sent') {
        setCalendarMessage(
          result.data.alreadySent
            ? 'Le résumé hebdomadaire a déjà été envoyé cette semaine.'
            : 'Le résumé hebdomadaire a été envoyé par e-mail.'
        );
      } else if (result.data?.status === 'retrying') {
        setAiError(
          `Échec de l’envoi SMTP (${result.data.error || 'erreur inconnue'}). Le résumé reste en attente; le scheduler devra réessayer après correction de la connexion.`
        );
      } else {
        setCalendarMessage('Le résumé est en attente dans la file d’envoi.');
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erreur lors de l’envoi du résumé hebdomadaire.');
    } finally {
      setIsSendingWeeklySummary(false);
    }
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAiError('');
              setCalendarMessage('');
              setShowAiEventModal(true);
            }}
            disabled={!canGenerateAi}
            className="flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-600/20 px-3 py-1.5 text-xs font-bold text-pink-200 hover:bg-pink-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Extraire avec l’IA</span>
          </button>
          <button
            type="button"
            onClick={handleExportCalendar}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {isExporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Exporter .ics</span>
          </button>
          <button
            type="button"
            onClick={handleSendWeeklySummary}
            disabled={isSendingWeeklySummary}
            aria-label="Envoyer le résumé hebdomadaire"
            title="Envoyer le résumé hebdomadaire par e-mail"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSendingWeeklySummary
              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              : <Mail className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Résumé hebdomadaire</span>
          </button>
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
        {aiError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{aiError}</p>}
        {calendarMessage && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">{calendarMessage}</p>}
        {milestoneError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{milestoneError}</p>}
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
                    onClick={() => void runMilestoneAction(() => onToggleMilestone(m.id))}
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
                    onClick={() => void runMilestoneAction(() => onDeleteMilestone(m.id))}
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
            {aiError && <p role="alert" className="mb-3 text-xs text-rose-300">{aiError}</p>}
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
                  disabled={isSavingMilestone}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSavingMilestone ? 'Enregistrement…' : editingMilestone ? 'Enregistrer' : 'Ajouter Jalon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAiEventModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-calendar-title"
            className="glass-panel max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-pink-500/30 bg-slate-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="ai-calendar-title" className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4 text-pink-400" />
                  Extraire des événements avec l’IA
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Collez un texte contenant des dates. Vérifiez les propositions avant de les ajouter.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiEventModal(false)}
                aria-label="Fermer l’extraction IA"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={aiSourceText}
              onChange={(event) => setAiSourceText(event.target.value)}
              maxLength={10000}
              rows={6}
              placeholder="Ex : Réunion de lancement le 12 décembre 2026 à 10 h. Remise du rapport le 18 décembre 2026."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
            />

            {aiError && <p role="alert" className="text-xs text-rose-300">{aiError}</p>}
            {calendarMessage && <p role="status" className="text-xs text-emerald-300">{calendarMessage}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAiEventModal(false)}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExtractEvents}
                disabled={!canGenerateAi || aiSourceText.trim().length < 20 || isExtracting}
                className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExtracting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isExtracting ? 'Extraction…' : 'Extraire les événements'}
              </button>
            </div>

            {extractedEvents.length > 0 && (
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <p className="text-xs font-semibold text-slate-200">
                  {extractedEvents.length} événement(s) à vérifier
                </p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {extractedEvents.map((event, index) => (
                    <article
                      key={`${event.date}-${event.title}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white">{event.title}</h4>
                        <p className="mt-0.5 text-xs text-pink-300">{event.date}</p>
                        {event.description && <p className="mt-1 text-xs text-slate-400">{event.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtractedEvents((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        aria-label={`Retirer ${event.title}`}
                        className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-rose-950/40 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddExtractedEvents}
                    disabled={isSavingEvents}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isSavingEvents ? 'Ajout en cours…' : `Ajouter ${extractedEvents.length} événement(s)`}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
