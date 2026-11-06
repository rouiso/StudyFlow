'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Video,
  MapPin,
  Lock,
  Unlock,
  Star,
  Award,
  Target,
  Plus,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Training,
  TrainingEnrollment,
  CoachingSession,
  CoachingGoal,
  SkillLevel,
  User,
  TrainingLevel,
  TrainingMode,
} from '@/types';

interface TrainingCoachingViewProps {
  trainings: Training[];
  enrollments: TrainingEnrollment[];
  coachingSessions: CoachingSession[];
  coachingGoals: CoachingGoal[];
  skillLevels: SkillLevel[];
  users: User[];
  currentUser: User;
  onEnrollTraining: (trainingId: string) => void;
  onUnenrollTraining: (trainingId: string) => void;
  onCreateTraining: (training: Omit<Training, 'id' | 'createdAt'>) => void;
  onToggleAttendance: (enrollmentId: string) => void;
  onRequestCoaching: (session: {
    coachId: string;
    topic: string;
    proposedSlots: string[];
    durationMin: number;
    mode: TrainingMode;
  }) => void;
  onConfirmCoaching: (sessionId: string, slot: string) => void;
  onCompleteCoaching: (sessionId: string, sharedReport: string, privateNotes?: string) => void;
  onUpdateGoalProgress: (goalId: string, progress: number) => void;
  onCreateGoal: (goal: Omit<CoachingGoal, 'id' | 'createdAt'>) => void;
  onAssessSkill: (userId: string, skill: string, level: number) => void;
}

export const TrainingCoachingView: React.FC<TrainingCoachingViewProps> = ({
  trainings,
  enrollments,
  coachingSessions,
  coachingGoals,
  skillLevels,
  users,
  currentUser,
  onEnrollTraining,
  onUnenrollTraining,
  onCreateTraining,
  onToggleAttendance,
  onRequestCoaching,
  onConfirmCoaching,
  onCompleteCoaching,
  onUpdateGoalProgress,
  onCreateGoal,
  onAssessSkill,
}) => {
  const [subTab, setSubTab] = useState<'trainings' | 'coaching' | 'goals'>('trainings');

  // Modales
  const [showNewTrainingModal, setShowNewTrainingModal] = useState(false);
  const [showRequestCoachingModal, setShowRequestCoachingModal] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [selectedSessionForReport, setSelectedSessionForReport] = useState<CoachingSession | null>(null);

  // État formulaire nouvelle formation
  const [newTrainingTitle, setNewTrainingTitle] = useState('');
  const [newTrainingDesc, setNewTrainingDesc] = useState('');
  const [newTrainingSkill, setNewTrainingSkill] = useState('Next.js 15');
  const [newTrainingLevel, setNewTrainingLevel] = useState<TrainingLevel>('INTERMEDIATE');
  const [newTrainingCapacity, setNewTrainingCapacity] = useState(8);
  const [newTrainingMode, setNewTrainingMode] = useState<TrainingMode>('ONLINE');
  const [newTrainingStartsAt, setNewTrainingStartsAt] = useState('2026-11-20T14:00');
  const [newTrainingLocation, setNewTrainingLocation] = useState('');

  // État formulaire demande coaching
  const [coachingTopic, setCoachingTopic] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState(
    users.find((u) => u.role === 'COACH')?.id || users[0]?.id || ''
  );
  const [slot1, setSlot1] = useState('2026-11-18T10:00');
  const [slot2, setSlot2] = useState('2026-11-18T14:00');
  const [coachingDuration, setCoachingDuration] = useState(45);
  const [coachingMode, setCoachingMode] = useState<TrainingMode>('ONLINE');

  // État compte-rendu
  const [reportShared, setReportShared] = useState('');
  const [reportPrivate, setReportPrivate] = useState('');

  // État nouvel objectif
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalSkill, setNewGoalSkill] = useState('Next.js 15');
  const [newGoalDate, setNewGoalDate] = useState('2026-12-01');

  const isCoachOrAdmin = currentUser.role === 'COACH' || currentUser.role === 'ADMIN' || currentUser.role === 'OWNER';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* En-tête & Sélecteur de sous-onglets Module 7 */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Formations & Coaching (Module 7)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v1.1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Développez vos compétences, planifiez vos séances de coaching et suivez votre progression.
          </p>
        </div>

        {/* Boutons sous-onglets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setSubTab('trainings')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'trainings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Formations</span>
          </button>
          <button
            onClick={() => setSubTab('coaching')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'coaching'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Coaching</span>
          </button>
          <button
            onClick={() => setSubTab('goals')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'goals'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Compétences</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CATALOGUE DES FORMATIONS (§8 7.1 & 7.2)              */}
      {/* ======================================================== */}
      {subTab === 'trainings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Catalogue des formations de l&apos;équipe ({trainings.length})
            </h3>
            {isCoachOrAdmin && (
              <button
                onClick={() => setShowNewTrainingModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Proposer une formation</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map((t) => {
              const trainer = users.find((u) => u.id === t.trainerId);
              const trainingEnrollments = enrollments.filter((e) => e.trainingId === t.id && e.status === 'ENROLLED');
              const isEnrolled = trainingEnrollments.some((e) => e.userId === currentUser.id);
              const isFull = trainingEnrollments.length >= t.capacity;
              const dateStr = new Date(t.startsAt).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={t.id}
                  className="rounded-2xl glass-panel bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="space-y-2.5">
                    {/* Badges niveau & mode */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          t.level === 'BEGINNER'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : t.level === 'INTERMEDIATE'
                            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {t.level === 'BEGINNER' ? 'Débutant' : t.level === 'INTERMEDIATE' ? 'Intermédiaire' : 'Avancé'}
                      </span>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        {t.mode === 'ONLINE' ? (
                          <div className="flex items-center gap-1 text-sky-400">
                            <Video className="w-3 h-3" />
                            <span>En ligne</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-400">
                            <MapPin className="w-3 h-3" />
                            <span>Présentiel</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-white leading-snug">{t.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{t.description}</p>

                    {/* Compétence visée */}
                    <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t.skill}</span>
                    </div>

                    {/* Date et Formateur */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                      {trainer && (
                        <div className="flex items-center gap-2">
                          <img
                            src={trainer.avatar}
                            alt={trainer.name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <span className="text-slate-400 text-[11px]">
                            Animé par <strong className="text-slate-300 font-semibold">{trainer.name}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Jauge de capacité */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Capacité :</span>
                        <span className={`font-semibold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {trainingEnrollments.length} / {t.capacity} places {isFull && '(Complet)'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (trainingEnrollments.length / t.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {isEnrolled ? (
                      <button
                        onClick={() => onUnenrollTraining(t.id)}
                        className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inscrit (Annuler)</span>
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full py-1.5 rounded-xl bg-slate-800/40 text-slate-500 text-xs font-semibold cursor-not-allowed"
                      >
                        Formation complète
                      </button>
                    ) : (
                      <button
                        onClick={() => onEnrollTraining(t.id)}
                        className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>S&apos;inscrire à la formation</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SÉANCES DE COACHING (§8 7.4 & 7.5 - STRICT CONFIDENTIEL) */}
      {/* ======================================================== */}
      {subTab === 'coaching' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Séances de coaching personnalisées ({coachingSessions.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Échange individuel entre un membre et son coach avec suivi des actions décidées.
              </p>
            </div>

            <button
              onClick={() => setShowRequestCoachingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Demander une séance</span>
            </button>
          </div>

          <div className="space-y-3">
            {coachingSessions.map((s) => {
              const coach = users.find((u) => u.id === s.coachId);
              const coachee = users.find((u) => u.id === s.coacheeId);
              const isCoachAuthor = currentUser.id === s.coachId || currentUser.role === 'COACH';
              const isParticipant = currentUser.id === s.coacheeId || isCoachAuthor;

              const statusColors: Record<string, string> = {
                REQUESTED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                CONFIRMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                RESCHEDULED: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                DONE: 'bg-slate-700/50 text-slate-300 border-slate-600',
                CANCELLED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
              };

              const statusLabels: Record<string, string> = {
                REQUESTED: 'En attente',
                CONFIRMED: 'Confirmée',
                RESCHEDULED: 'Replanifiée',
                DONE: 'Terminée',
                CANCELLED: 'Annulée',
              };

              return (
                <div
                  key={s.id}
                  className="rounded-2xl glass-panel bg-slate-900/90 border border-slate-800 p-4 space-y-3.5 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                          statusColors[s.status] || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {statusLabels[s.status] || s.status}
                      </span>
                      <h4 className="font-bold text-sm text-white">{s.topic}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Durée : {s.durationMin} min</span>
                      {s.scheduledAt && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{new Date(s.scheduledAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Intervenants */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Étudiant coaché :</span>
                      <img src={coachee?.avatar} alt={coachee?.name} className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-semibold text-slate-200">{coachee?.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Coach référent :</span>
                      <img src={coach?.avatar} alt={coach?.name} className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-semibold text-indigo-300">{coach?.name}</span>
                    </div>
                  </div>

                  {/* Lien visio si confirmé */}
                  {s.meetingUrl && s.status !== 'CANCELLED' && (
                    <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-900/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-indigo-300">
                        <Video className="w-4 h-4 text-indigo-400" />
                        <span>Lien de visio pour la séance :</span>
                      </div>
                      <a
                        href={s.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-semibold text-sky-400 hover:underline"
                      >
                        <span>Rejoindre la visio</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Compte rendu partagé */}
                  {s.sharedReport && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Compte-rendu partagé & actions :</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed pl-5">{s.sharedReport}</p>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* ZONE SÉCURISÉE : NOTES PRIVÉES DU COACH (RÈGLE CDC v1.1) */}
                  {/* ======================================================== */}
                  {s.privateNotes && (
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        isCoachAuthor
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isCoachAuthor ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300">Notes privées du Coach (Strictement confidentiel) :</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Notes privées protégées (Accès réservé au Coach auteur)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isCoachAuthor ? (
                        <p className="text-amber-200/90 leading-relaxed pl-5 italic font-mono text-[11px]">
                          {s.privateNotes}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 pl-5">
                          Conformément au §4.2 du Cahier des Charges, les observations privées ne sont visibles que par le formateur.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions du Coach */}
                  {isCoachAuthor && s.status === 'REQUESTED' && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2 justify-end">
                      <button
                        onClick={() => onConfirmCoaching(s.id, s.proposedSlots[0] || '2026-11-18T10:00:00Z')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmer le créneau</span>
                      </button>
                    </div>
                  )}

                  {isCoachAuthor && s.status === 'CONFIRMED' && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setSelectedSessionForReport(s);
                          setReportShared(s.sharedReport || '');
                          setReportPrivate(s.privateNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Rédiger compte-rendu & Clôturer</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. COMPÉTENCES & OBJECTIFS (§8 7.6 & 7.9)                 */}
      {/* ======================================================== */}
      {subTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Objectifs personnels */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Objectifs de progression
                </h3>
                <p className="text-[11px] text-slate-400">Suivi individuel convenu avec le coach.</p>
              </div>

              <button
                onClick={() => setShowNewGoalModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
              >
                <Plus className="w-3 h-3 text-indigo-400" />
                <span>Fixer un objectif</span>
              </button>
            </div>

            <div className="space-y-3">
              {coachingGoals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-2xl glass-panel bg-slate-900/80 border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                        {g.skill}
                      </span>
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-200 mt-1.5">{g.title}</h4>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        g.status === 'ACHIEVED'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {g.status === 'ACHIEVED' ? 'Atteint' : `${g.progress}%`}
                    </span>
                  </div>

                  {/* Barre de progression */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Slider d'ajustement */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Ajuster l&apos;avancement :</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={g.progress}
                      onChange={(e) => onUpdateGoalProgress(g.id, parseInt(e.target.value, 10))}
                      className="w-32 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cartographie des compétences (Auto-évalué vs Évalué par le Coach) */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Cartographie des compétences (0 à 5)
              </h3>
              <p className="text-[11px] text-slate-400">
                Comparaison entre la note auto-évaluée et l&apos;évaluation portée par le Coach (§7.1).
              </p>
            </div>

            <div className="rounded-2xl glass-panel bg-slate-900/80 border border-slate-800 p-4 space-y-4">
              {['Next.js 15', 'Prisma & BDD', 'PWA & Mobile', 'Accessibilité & UI', 'Gestion Agile'].map((skill) => {
                const auto = skillLevels.find((s) => s.skill === skill && s.selfAssessed)?.level || 3;
                const coachAssessment = skillLevels.find((s) => s.skill === skill && !s.selfAssessed)?.level || 4;

                return (
                  <div key={skill} className="space-y-1.5 pb-3 border-b border-slate-800/80 last:border-0 last:pb-0">
                    <div className="flex justify-between text-xs font-semibold text-slate-200">
                      <span>{skill}</span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-400">Auto : <strong className="text-sky-400">{auto}/5</strong></span>
                        <span className="text-slate-400">Coach : <strong className="text-purple-400">{coachAssessment}/5</strong></span>
                      </div>
                    </div>

                    {/* Barres comparatives */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12">Auto :</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(auto / 5) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12">Coach :</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(coachAssessment / 5) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : CRÉATION DE FORMATION (§8 7.1)                  */}
      {/* ======================================================== */}
      {showNewTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <span>Proposer une Nouvelle Formation</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Titre de l&apos;atelier :</label>
                <input
                  type="text"
                  value={newTrainingTitle}
                  onChange={(e) => setNewTrainingTitle(e.target.value)}
                  placeholder="ex: Atelier Docker & CI/CD"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description :</label>
                <textarea
                  rows={2}
                  value={newTrainingDesc}
                  onChange={(e) => setNewTrainingDesc(e.target.value)}
                  placeholder="Objectifs et compétences abordées..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Niveau :</label>
                  <select
                    value={newTrainingLevel}
                    onChange={(e) => setNewTrainingLevel(e.target.value as TrainingLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="BEGINNER">Débutant</option>
                    <option value="INTERMEDIATE">Intermédiaire</option>
                    <option value="ADVANCED">Avancé</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Capacité max :</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newTrainingCapacity}
                    onChange={(e) => setNewTrainingCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Date et heure :</label>
                <input
                  type="datetime-local"
                  value={newTrainingStartsAt}
                  onChange={(e) => setNewTrainingStartsAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowNewTrainingModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!newTrainingTitle.trim()) return;
                  onCreateTraining({
                    teamId: 'team-1',
                    title: newTrainingTitle.trim(),
                    description: newTrainingDesc.trim(),
                    skill: newTrainingSkill,
                    level: newTrainingLevel,
                    trainerId: currentUser.id,
                    startsAt: new Date(newTrainingStartsAt).toISOString(),
                    endsAt: new Date(new Date(newTrainingStartsAt).getTime() + 7200000).toISOString(),
                    capacity: newTrainingCapacity,
                    mode: newTrainingMode,
                    meetingUrl: 'https://meet.jit.si/studyflow-session',
                    status: 'PUBLISHED',
                  });
                  setShowNewTrainingModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Publier la formation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : DEMANDE DE SÉANCE DE COACHING (§8 7.4)          */}
      {/* ======================================================== */}
      {showRequestCoachingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Demander une Séance de Coaching</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Sujet / Problématique abordée :</label>
                <input
                  type="text"
                  value={coachingTopic}
                  onChange={(e) => setCoachingTopic(e.target.value)}
                  placeholder="ex: Déblocage sur les jointures relationnelles"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Sélectionner le Coach référent :</label>
                <select
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {users
                    .filter((u) => u.role === 'COACH' || u.role === 'ADMIN')
                    .map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name} ({coach.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Durée souhaitée :</label>
                  <select
                    value={coachingDuration}
                    onChange={(e) => setCoachingDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Mode :</label>
                  <select
                    value={coachingMode}
                    onChange={(e) => setCoachingMode(e.target.value as TrainingMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="ONLINE">En ligne (Visio)</option>
                    <option value="ONSITE">Présentiel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Créneau proposé 1 (minimum 24h à l&apos;avance) :</label>
                <input
                  type="datetime-local"
                  value={slot1}
                  onChange={(e) => setSlot1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowRequestCoachingModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!coachingTopic.trim()) return;
                  onRequestCoaching({
                    coachId: selectedCoachId,
                    topic: coachingTopic.trim(),
                    proposedSlots: [new Date(slot1).toISOString()],
                    durationMin: coachingDuration,
                    mode: coachingMode,
                  });
                  setShowRequestCoachingModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : COMPTE RENDU & NOTES PRIVÉES DU COACH (§8 7.5)   */}
      {/* ======================================================== */}
      {selectedSessionForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Rédiger le Compte-Rendu de Coaching</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Synthèse partagée & Actions convenues (Visible par l&apos;étudiant) :
                </label>
                <textarea
                  rows={3}
                  value={reportShared}
                  onChange={(e) => setReportShared(e.target.value)}
                  placeholder="Points validés, devoirs à faire, prochaines étapes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                <label className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notes privées du Coach (STRICTEMENT CONFIDENTIEL) :</span>
                </label>
                <p className="text-[10px] text-amber-400/80">
                  Visible UNIQUEMENT par vous-même. Ne sera jamais transmis à l&apos;étudiant ni inclus dans les rapports.
                </p>
                <textarea
                  rows={2}
                  value={reportPrivate}
                  onChange={(e) => setReportPrivate(e.target.value)}
                  placeholder="Observations personnelles sur l'autonomie, lacunes à combler..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-200 resize-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedSessionForReport(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onCompleteCoaching(selectedSessionForReport.id, reportShared, reportPrivate);
                  setSelectedSessionForReport(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Enregistrer & Clôturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

